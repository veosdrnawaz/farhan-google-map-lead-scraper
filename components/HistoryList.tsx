import React from 'react';
import { SearchHistoryItem } from '../types';
import { Clock, ArrowRight } from 'lucide-react';

interface HistoryListProps {
  history: SearchHistoryItem[];
  onSelect: (item: SearchHistoryItem) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect }) => {
  if (history.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-fit sticky top-24">
      <div className="flex items-center gap-2 mb-4 text-gray-800">
        <Clock className="w-5 h-5" />
        <h3 className="font-semibold">Recent Searches</h3>
      </div>
      
      <div className="space-y-2">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
          >
            <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-gray-900 text-sm group-hover:text-blue-600">{item.keyword}</span>
                <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-blue-500" />
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{item.city}</span>
                <span className="bg-gray-100 px-1.5 rounded text-gray-600">{item.resultsCount} results</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;
