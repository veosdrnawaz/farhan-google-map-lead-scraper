
import React from 'react';
import { Lead } from '../types';
import { Star, Globe, Phone, MapPin, Download, PlusCircle, Facebook, Instagram, Linkedin, Twitter, Filter, MessageCircle } from 'lucide-react';
import { exportToCSV } from '../utils/csvExport';

interface ResultsTableProps {
  leads: Lead[];
  title: string;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  onFilterMobile?: () => void;
  whatsappTemplate?: string; 
}

const ResultsTable: React.FC<ResultsTableProps> = ({ leads, title, onLoadMore, isLoadingMore, onFilterMobile, whatsappTemplate }) => {
  if (leads.length === 0 && !isLoadingMore) {
       return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No results to display.</p>
        </div>
       );
  }

  const handleExport = () => {
    exportToCSV(leads, `leads-${new Date().toISOString().slice(0,10)}`);
  };

  const handleWhatsAppClick = (lead: Lead) => {
    if (!lead.phoneNumber) return;

    let cleanNumber = lead.phoneNumber.replace(/\D/g, '');

    if (cleanNumber.startsWith('03')) {
        cleanNumber = '92' + cleanNumber.substring(1);
    } 
    else if (cleanNumber.startsWith('92')) {
        // already good
    }

    let message = whatsappTemplate || "";
    
    const replaceTag = (text: string, tag: string, value: string | number | undefined) => {
          return text.replace(new RegExp(tag, 'g'), String(value || ""));
    };

    message = replaceTag(message, '{name}', lead.name);
    message = replaceTag(message, '{address}', lead.address);
    message = replaceTag(message, '{phoneNumber}', lead.phoneNumber);
    message = replaceTag(message, '{rating}', lead.rating);
    message = replaceTag(message, '{reviewCount}', lead.reviewCount);
    message = replaceTag(message, '{category}', lead.category);
    message = replaceTag(message, '{website}', lead.website);

    const encodedMessage = encodeURIComponent(message);
    
    const url = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  const renderSocialIcon = (url: string | undefined, type: 'facebook' | 'instagram' | 'linkedin' | 'twitter') => {
      if (!url) return null;
      let Icon = Globe;
      let colorClass = "text-gray-500 hover:text-gray-700";
      
      if (type === 'facebook') { Icon = Facebook; colorClass = "text-blue-600 hover:text-blue-800"; }
      if (type === 'instagram') { Icon = Instagram; colorClass = "text-pink-600 hover:text-pink-800"; }
      if (type === 'linkedin') { Icon = Linkedin; colorClass = "text-blue-700 hover:text-blue-900"; }
      if (type === 'twitter') { Icon = Twitter; colorClass = "text-sky-500 hover:text-sky-700"; }

      return (
          <a href={url} target="_blank" rel="noopener noreferrer" className={`${colorClass} transition-colors`}>
              <Icon className="w-4 h-4" />
          </a>
      );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 gap-4">
        <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{leads.length} leads collected</p>
        </div>
        <div className="flex items-center gap-2">
            {onFilterMobile && (
                <button 
                    onClick={onFilterMobile}
                    className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    title="Keep only numbers starting with 03"
                >
                    <Filter className="w-4 h-4 text-blue-600" />
                    Filter (03...)
                </button>
            )}
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
                <Download className="w-4 h-4" />
                Export CSV
            </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 scrollbar-thin">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">Business</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Rating</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">Contact & Social</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Location</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-blue-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={lead.name}>{lead.name}</span>
                    <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{lead.category}</span>
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex items-center text-amber-400 mr-1.5">
                        <Star className="w-4 h-4 fill-current" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{lead.rating}</span>
                    <span className="text-xs text-gray-400 ml-1">({lead.reviewCount})</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        {lead.phoneNumber && lead.phoneNumber !== 'N/A' && (
                            <a href={`tel:${lead.phoneNumber}`} className="text-sm text-gray-600 hover:text-blue-600 flex items-center gap-1.5">
                                <Phone className="w-3 h-3" />
                                {lead.phoneNumber}
                            </a>
                        )}
                        {lead.website && lead.website !== 'N/A' && (
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1.5">
                                <Globe className="w-3 h-3" />
                                Visit Website
                            </a>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        {renderSocialIcon(lead.socialProfiles?.facebook, 'facebook')}
                        {renderSocialIcon(lead.socialProfiles?.instagram, 'instagram')}
                        {renderSocialIcon(lead.socialProfiles?.linkedin, 'linkedin')}
                        {renderSocialIcon(lead.socialProfiles?.twitter, 'twitter')}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500 max-w-[200px] truncate" title={lead.address}>
                    <MapPin className="w-3.5 h-3.5 mr-1.5 flex-shrink-0 text-gray-400" />
                    {lead.address}
                  </div>
                  {(lead.latitude && lead.longitude) && (
                     <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${lead.latitude},${lead.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline ml-5 mt-0.5 block"
                     >
                        View on Map
                     </a>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                    {lead.phoneNumber && lead.phoneNumber !== 'N/A' ? (
                         <button
                            onClick={() => handleWhatsAppClick(lead)}
                            className="inline-flex items-center justify-center p-2 bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 rounded-full transition-colors shadow-sm group"
                            title="Chat on WhatsApp (with pre-filled data)"
                         >
                            <MessageCircle className="w-5 h-5 fill-current opacity-90 group-hover:scale-110 transition-transform" />
                         </button>
                    ) : (
                        <span className="text-gray-300">-</span>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
          {onLoadMore && leads.length > 0 && (
              <tfoot className="bg-gray-50">
                <tr>
                    <td colSpan={5} className="px-6 py-4 text-center">
                        <button 
                            onClick={onLoadMore}
                            disabled={isLoadingMore}
                            className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-white border border-blue-200 hover:bg-blue-50 text-blue-600 px-4 py-3 rounded-lg font-medium transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isLoadingMore ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    Finding more leads...
                                </>
                            ) : (
                                <>
                                    <PlusCircle className="w-5 h-5" />
                                    Find More Results
                                </>
                            )}
                        </button>
                        <p className="text-xs text-gray-400 mt-2">
                            Clicks will check for new businesses excluding the ones above.
                        </p>
                    </td>
                </tr>
              </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default ResultsTable;
