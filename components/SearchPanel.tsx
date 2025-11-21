import React, { useState } from 'react';
import { Search, MapPin, Loader2, ListFilter, Square } from 'lucide-react';
import { SearchParams } from '../types';

interface SearchPanelProps {
  onSearch: (params: SearchParams) => void;
  onStop: () => void;
  isSearching: boolean;
  progress?: string; 
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onSearch, onStop, isSearching, progress }) => {
  const [keyword, setKeyword] = useState('');
  const [city, setCity] = useState('');
  const [limit, setLimit] = useState<number>(20);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim() && city.trim()) {
      onSearch({ keyword, city, limit });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Find Business Leads</h2>
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-[2] relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Keyword (e.g. Plumbers, Vegan Restaurants)"
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors h-full"
            required
            disabled={isSearching}
          />
        </div>

        <div className="flex-[2] relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City, Region (e.g. Austin, TX)"
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors h-full"
            required
            disabled={isSearching}
          />
        </div>

        <div className="relative w-full md:w-32">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ListFilter className="h-5 w-5 text-gray-400" />
            </div>
            <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                disabled={isSearching}
                className="block w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-colors appearance-none h-full cursor-pointer"
            >
                <option value={10}>10 Leads</option>
                <option value={20}>20 Leads</option>
                <option value={50}>50 Leads</option>
                <option value={100}>100 Leads</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>

        {isSearching ? (
           <button
              type="button"
              onClick={onStop}
              className="flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-red-500 hover:bg-red-600 transition-all duration-200 w-full md:w-auto min-w-[140px]"
            >
               <div className="flex flex-col items-center leading-tight">
                    <div className="flex items-center gap-2">
                        <Square className="fill-current h-3 w-3" />
                        <span>Stop</span>
                    </div>
                    {progress && <span className="text-[10px] opacity-90 font-normal mt-0.5">{progress}</span>}
                </div>
            </button>
        ) : (
            <button
            type="submit"
            disabled={!keyword || !city}
            className="flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 w-full md:w-auto min-w-[140px]"
            >
            Extract
            </button>
        )}
      </form>
      
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
        <span className="bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200">Real-time</span>
        <span>Results appear instantly as they are verified on Google Maps. You can stop and download at any time.</span>
      </div>
    </div>
  );
};

export default SearchPanel;