import React, { useMemo, useState } from 'react';
import { Lead, WhatsAppTemplate } from '../types';
import { MessageCircle, AlertTriangle, ArrowLeft, CheckCircle2, Send, Sparkles, Loader2, RefreshCw, Download } from 'lucide-react';
import { generatePersonalizedMessage } from '../services/geminiService';
import { exportCampaignToCSV } from '../utils/csvExport';

interface WhatsAppCampaignViewProps {
  leads: Lead[];
  templates: WhatsAppTemplate[];
  activeTemplateId: string | null;
  onBack: () => void;
}

const WhatsAppCampaignView: React.FC<WhatsAppCampaignViewProps> = ({
  leads,
  templates,
  activeTemplateId,
  onBack
}) => {
  const activeTemplate = templates.find(t => t.id === activeTemplateId);
  
  const [generatedMessages, setGeneratedMessages] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // 1. Filter Logic: Keep only valid 03... or 923... numbers
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
        if (!lead.phoneNumber || lead.phoneNumber === 'N/A') return false;
        const clean = lead.phoneNumber.replace(/\D/g, '');
        // Must be Pakistani mobile (starts with 03 or 923)
        return clean.startsWith('03') || clean.startsWith('923');
    });
  }, [leads]);

  const ignoredCount = leads.length - filteredLeads.length;

  const handleGenerateAll = async () => {
    if (!activeTemplate) return;
    
    setIsGenerating(true);
    const total = filteredLeads.length;
    setProgress({ current: 0, total });
    
    // Clone current messages to avoid losing existing ones if we are adding new leads
    const newMessages = { ...generatedMessages };
    
    // Process in chunks of 1 to avoid hitting rate limits (429)
    // Adding delay between requests is crucial for free/tiered API usage.
    const chunkSize = 1;
    
    for (let i = 0; i < total; i += chunkSize) {
        const chunk = filteredLeads.slice(i, i + chunkSize);
        
        await Promise.all(chunk.map(async (lead) => {
            // Skip if already generated to save API calls (unless force regenerate logic added later)
            if (newMessages[lead.id]) return;

            try {
                const aiMsg = await generatePersonalizedMessage(
                    lead, 
                    activeTemplate.content, 
                    "AXA Pakistan Company"
                );
                newMessages[lead.id] = aiMsg;
            } catch (e) {
                console.error("Failed to generate for", lead.name);
            }
        }));

        setGeneratedMessages({ ...newMessages });
        setProgress({ current: Math.min(i + chunkSize, total), total });
        
        // Add significant delay between chunks to respect strict rate limits (15 RPM)
        if (i + chunkSize < total) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
        }
    }
    
    setIsGenerating(false);
  };

  const handleExport = () => {
    exportCampaignToCSV(
        filteredLeads, 
        generatedMessages, 
        `campaign-export-${new Date().toISOString().slice(0,10)}`
    );
  };

  const getWhatsAppLink = (lead: Lead) => {
      if (!lead.phoneNumber) return '#';
      
      // Phone Logic
      let cleanNumber = lead.phoneNumber.replace(/\D/g, '');
      if (cleanNumber.startsWith('03')) {
          cleanNumber = '92' + cleanNumber.substring(1);
      }

      // Use generated AI message if available, otherwise empty/default
      const message = generatedMessages[lead.id] || "";
      
      return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  };

  const isGenerated = (leadId: string) => !!generatedMessages[leadId];

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      {/* Campaign Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 mb-6 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <MessageCircle className="w-6 h-6 text-green-600" />
                            Configure WhatsApp Campaign
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Template: <span className="font-medium text-gray-900">{activeTemplate?.name || 'None Selected'}</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleExport}
                        disabled={filteredLeads.length === 0}
                        className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download CSV with Links & Messages"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>

                    {!isGenerating && filteredLeads.length > 0 && (
                        <button 
                            onClick={handleGenerateAll}
                            disabled={!activeTemplate}
                            className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow-md transition-all hover:shadow-lg transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {Object.keys(generatedMessages).length > 0 ? (
                                <><RefreshCw className="w-4 h-4" /> Regenerate AI</>
                            ) : (
                                <><Sparkles className="w-4 h-4" /> Generate AI Messages</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {isGenerating && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 overflow-hidden">
                    <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    ></div>
                    <p className="text-xs text-gray-500 text-right mt-1">
                        Personalizing {progress.current} of {progress.total} (Throttled to prevent errors)...
                    </p>
                </div>
            )}

            <div className="flex flex-wrap gap-4 items-center text-sm mt-2">
                <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <strong>{filteredLeads.length}</strong> Mobile Numbers (03...)
                </div>
                {ignoredCount > 0 && (
                    <div className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full border border-gray-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <strong>{ignoredCount}</strong> Ignored (Landlines/Invalid)
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {!activeTemplate ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">No Template Selected</h3>
                <p className="text-gray-500 mb-4">Please go back and select a template to start.</p>
                <button onClick={onBack} className="text-blue-600 hover:underline">Go Back</button>
            </div>
        ) : filteredLeads.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">No Valid Mobile Numbers</h3>
                <p className="text-gray-500">None of the collected leads match the '03' mobile format.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLeads.map((lead) => {
                    const hasMsg = isGenerated(lead.id);
                    const msg = generatedMessages[lead.id];
                    
                    return (
                        <div key={lead.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                            <div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-900 truncate pr-2">{lead.name}</h3>
                                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">{lead.phoneNumber}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                    <span>{lead.rating} ⭐</span>
                                    <span>•</span>
                                    <span className="truncate max-w-[200px]">{lead.address}</span>
                                </div>
                                
                                {/* Message Preview */}
                                <div className={`rounded border mb-4 p-3 text-xs leading-relaxed relative min-h-[80px] transition-colors ${hasMsg ? 'bg-green-50 border-green-200 text-gray-800' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                    {hasMsg ? (
                                        <>
                                            <span className="font-semibold text-green-700 block mb-1 text-[10px] uppercase tracking-wide">AI Personalized Message</span>
                                            {msg}
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full pt-2">
                                            {isGenerating ? (
                                                <Loader2 className="w-5 h-5 animate-spin text-blue-500 mb-1" />
                                            ) : (
                                                <Sparkles className="w-5 h-5 text-gray-300 mb-1" />
                                            )}
                                            <span className="italic">
                                                {isGenerating ? 'AI Writing...' : 'Waiting to generate...'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <a 
                                href={getWhatsAppLink(lead)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => {
                                    if (!hasMsg) {
                                        e.preventDefault();
                                        alert("Please click 'Generate AI Messages' first to create the personalized content.");
                                    }
                                }}
                                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all shadow-sm active:scale-[0.98] transform ${hasMsg ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                <Send className="w-4 h-4" />
                                {hasMsg ? 'Send Message' : 'Generate First'}
                            </a>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppCampaignView;