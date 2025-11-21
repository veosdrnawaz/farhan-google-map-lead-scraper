import React from 'react';
import { MapPin, Database, Zap } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">LeadScout AI</h1>
            <p className="text-xs text-gray-500 font-medium">Powered by Gemini Maps Grounding</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                <Database className="w-4 h-4 text-blue-500" />
                <span>Live Maps Data</span>
            </div>
             <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Instant Extraction</span>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
