
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import SearchPanel from './components/SearchPanel';
import ResultsTable from './components/ResultsTable';
import HistoryList from './components/HistoryList';
import WhatsAppTemplateManager from './components/WhatsAppTemplateManager';
import WhatsAppCampaignView from './components/WhatsAppCampaignView';
import { Lead, SearchParams, AppStatus, SearchHistoryItem, WhatsAppTemplate, ViewMode } from './types';
import { searchLeads } from './services/geminiService';
import { AlertCircle, ExternalLink, MessageSquare, Layers } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [currentLeads, setCurrentLeads] = useState<Lead[]>([]);
  const [groundingUrls, setGroundingUrls] = useState<string[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [currentSearch, setCurrentSearch] = useState<{ keyword: string, city: string, limit: number }>({ keyword: '', city: '', limit: 20 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [isLoadMoreLoading, setIsLoadMoreLoading] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // App Mode State
  const [viewMode, setViewMode] = useState<ViewMode>('search');

  // WhatsApp Template State
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState<boolean>(false);

  // Load history and templates from local storage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('leadscout_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history");
      }
    }

    const savedTemplates = localStorage.getItem('leadscout_whatsapp_templates');
    if (savedTemplates) {
        try {
            const parsed = JSON.parse(savedTemplates);
            setTemplates(parsed);
            if (parsed.length > 0) setActiveTemplateId(parsed[0].id);
        } catch(e) {}
    } else {
        // Set default empty or initial
        setTemplates([]);
    }
  }, []);

  const saveTemplates = (newTemplates: WhatsAppTemplate[]) => {
      setTemplates(newTemplates);
      localStorage.setItem('leadscout_whatsapp_templates', JSON.stringify(newTemplates));
  };

  const performSearch = async (params: SearchParams, existingLeads: Lead[] = [], isLoadMore = false) => {
     if (abortControllerRef.current) {
         abortControllerRef.current.abort();
     }
     const controller = new AbortController();
     abortControllerRef.current = controller;

     if (isLoadMore) {
         setIsLoadMoreLoading(true);
     } else {
         setStatus(AppStatus.SEARCHING);
         setCurrentLeads([]);
         // Ensure we are in search view when searching
         setViewMode('search');
     }
     setErrorMsg(null);

     try {
        const excludeNames = existingLeads.map(l => l.name);
        let localLeadsCount = 0;

        const { leads: newLeads, groundingUrls: newUrls } = await searchLeads(
            params.keyword, 
            params.city, 
            params.limit, 
            excludeNames,
            (batchLeads) => {
                setCurrentLeads(prev => [...prev, ...batchLeads]);
                localLeadsCount += batchLeads.length;
            },
            controller.signal
        );

        const updatedUrls = Array.from(new Set([...groundingUrls, ...newUrls]));
        setGroundingUrls(updatedUrls);
        
        if (localLeadsCount === 0 && newLeads.length === 0 && !isLoadMore && !controller.signal.aborted) {
            setErrorMsg("No leads found. Try broadening your search terms.");
            setStatus(AppStatus.IDLE);
        } else {
            setStatus(AppStatus.SUCCESS);
        }

        if (localLeadsCount > 0 || newLeads.length > 0) {
            const finalCount = existingLeads.length + newLeads.length;
            const newHistoryItem: SearchHistoryItem = {
                id: Date.now().toString(),
                keyword: params.keyword,
                city: params.city,
                limit: params.limit,
                timestamp: Date.now(),
                resultsCount: finalCount
            };
            
            const updatedHistory = [newHistoryItem, ...history].slice(0, 10); 
            setHistory(updatedHistory);
            localStorage.setItem('leadscout_history', JSON.stringify(updatedHistory));
        }

     } catch (error: any) {
         if (abortControllerRef.current?.signal.aborted) {
             console.log("Process stopped by user.");
             setStatus(AppStatus.SUCCESS);
         } else {
            console.error(error);
            if (!isLoadMore) {
                setStatus(AppStatus.ERROR);
                setErrorMsg("Failed to fetch leads. Please check your API key configuration.");
            } else {
                alert("Error loading more leads.");
            }
         }
     } finally {
        setIsLoadMoreLoading(false);
        abortControllerRef.current = null;
     }
  };

  const handleSearch = async (params: SearchParams) => {
      setCurrentSearch(params);
      setGroundingUrls([]); 
      await performSearch(params, [], false);
  };
  
  const handleLoadMore = async () => {
      await performSearch(currentSearch, currentLeads, true);
  };

  const handleStop = () => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          setStatus(AppStatus.SUCCESS); 
      }
  };

  const handleFilterMobile = () => {
      const filtered = currentLeads.filter(lead => {
          if (!lead.phoneNumber || lead.phoneNumber === 'N/A') return false;
          const cleanNumber = lead.phoneNumber.replace(/\D/g, '');
          return cleanNumber.startsWith('03') || cleanNumber.startsWith('923');
      });

      if (filtered.length === 0) {
          alert("No numbers starting with '03' or '+92 3...' were found in the current list.");
      } else {
          const removedCount = currentLeads.length - filtered.length;
          if (removedCount === 0) return; 
          
          if (window.confirm(`Filter will remove ${removedCount} leads and keep ${filtered.length} mobile numbers. Continue?`)) {
              setCurrentLeads(filtered);
          }
      }
  };

  const restoreHistorySearch = (item: SearchHistoryItem) => {
      setViewMode('search');
      setCurrentSearch({ keyword: item.keyword, city: item.city, limit: item.limit });
      handleSearch({ keyword: item.keyword, city: item.city, limit: item.limit });
  };

  // If viewMode is campaign, render that component
  if (viewMode === 'campaign') {
      return (
          <WhatsAppCampaignView 
            leads={currentLeads}
            templates={templates}
            activeTemplateId={activeTemplateId}
            onBack={() => setViewMode('search')}
          />
      );
  }

  const activeTemplateContent = templates.find(t => t.id === activeTemplateId)?.content;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left/Top Column: Search & Results */}
            <div className="lg:col-span-9">
                <SearchPanel 
                    onSearch={handleSearch} 
                    onStop={handleStop}
                    isSearching={status === AppStatus.SEARCHING} 
                    progress={status === AppStatus.SEARCHING ? `Collected ${currentLeads.length} leads...` : undefined}
                />
                
                {/* Tools Section */}
                <div className="flex flex-wrap justify-end items-center gap-3 mb-4">
                    <button 
                        onClick={() => setIsTemplateManagerOpen(true)}
                        className="flex items-center gap-2 text-sm text-gray-700 font-medium bg-white px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Manage Templates ({templates.length})
                    </button>
                    
                    {currentLeads.length > 0 && (
                        <button 
                            onClick={() => setViewMode('campaign')}
                            className="flex items-center gap-2 text-sm text-white font-medium bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                        >
                            <Layers className="w-4 h-4" />
                            Configure WhatsApp
                        </button>
                    )}
                </div>

                {/* WhatsApp Template Manager */}
                <WhatsAppTemplateManager 
                    templates={templates}
                    onSaveTemplates={saveTemplates}
                    activeTemplateId={activeTemplateId}
                    onSetActiveTemplate={setActiveTemplateId}
                    isOpen={isTemplateManagerOpen}
                    onClose={() => setIsTemplateManagerOpen(false)}
                />

                {errorMsg && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
                        </div>
                    </div>
                )}

                <div className="min-h-[400px]">
                    {(status === AppStatus.SUCCESS || (status === AppStatus.SEARCHING && currentLeads.length > 0)) ? (
                        <>
                            <ResultsTable 
                                leads={currentLeads} 
                                title={`Results for "${currentSearch.keyword}" in ${currentSearch.city}`}
                                onLoadMore={handleLoadMore}
                                isLoadingMore={isLoadMoreLoading || status === AppStatus.SEARCHING}
                                onFilterMobile={handleFilterMobile}
                                whatsappTemplate={activeTemplateContent}
                            />
                            
                            {groundingUrls.length > 0 && (
                                <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        Verified Sources (Google Maps)
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {groundingUrls.map((url, idx) => (
                                            <a 
                                                key={idx} 
                                                href={url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-blue-50 text-blue-600 text-xs rounded-full border border-gray-200 hover:border-blue-200 transition-colors truncate max-w-xs"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                {new URL(url).hostname}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                         status === AppStatus.SEARCHING && (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                <p className="text-lg font-medium text-gray-600">Scouring Google Maps for leads...</p>
                                <p className="text-sm text-gray-400 mt-2">
                                    Results will appear here instantly as they are verified.
                                </p>
                            </div>
                         )
                    )}

                    {status === AppStatus.IDLE && (
                        <div className="h-full flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-300 rounded-xl p-12 bg-gray-50/50">
                            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                <SearchPanelIcon />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to find leads?</h3>
                            <p className="text-gray-500 max-w-md">
                                Enter a business type and city above to instantly extract real-time data from Google Maps.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right/Bottom Column: History & Stats */}
            <div className="lg:col-span-3 space-y-6">
                <HistoryList history={history} onSelect={restoreHistorySearch} />
                
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-md p-5 text-white">
                    <h3 className="font-semibold mb-1">Pro Tip</h3>
                    <p className="text-sm text-blue-100 opacity-90 leading-relaxed">
                        Use the "Configure WhatsApp" button to switch to a bulk-sending view where AI can write unique messages for every client.
                    </p>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}

function SearchPanelIcon() {
    return (
        <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );
}