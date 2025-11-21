
import React, { useState, useEffect } from 'react';
import { MessageSquare, Save, RotateCcw, X } from 'lucide-react';

interface WhatsAppTemplateEditorProps {
  template: string;
  onSave: (newTemplate: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_TEMPLATE = `*Business Profile:*
🏢 *Name:* {name}
📍 *Address:* {address}
⭐ *Rating:* {rating} ({reviewCount} reviews)
📞 *Phone:* {phoneNumber}

--------------------------------

Hi {name},

I came across your business on Google Maps and saw your great reviews! 

[Your message here]`;

const WhatsAppTemplateEditor: React.FC<WhatsAppTemplateEditorProps> = ({ template, onSave, isOpen, onClose }) => {
  const [localTemplate, setLocalTemplate] = useState(template);

  useEffect(() => {
    setLocalTemplate(template);
  }, [template]);

  const handleReset = () => {
    setLocalTemplate(DEFAULT_TEMPLATE);
  };

  const handleSave = () => {
    onSave(localTemplate);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-xl shadow-md border border-green-200 p-5 mb-6 animate-in fade-in slide-in-from-top-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2 text-green-700">
          <MessageSquare className="w-5 h-5" />
          <h3 className="font-semibold text-lg">WhatsApp Message Template</h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Message Template</label>
          <textarea
            value={localTemplate}
            onChange={(e) => setLocalTemplate(e.target.value)}
            rows={8}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
            placeholder="Type your message here..."
          />
          <div className="flex justify-end gap-3 mt-3">
             <button 
              onClick={handleReset}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded hover:bg-gray-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Reset Default
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-1 text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" /> Save Template
            </button>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-100 text-sm">
          <h4 className="font-semibold text-green-800 mb-2">Available Variables</h4>
          <p className="text-green-700 mb-3">Click buttons to copy placeholders:</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {['{name}', '{address}', '{phoneNumber}', '{rating}', '{reviewCount}', '{category}', '{website}'].map((tag) => (
               <button 
                key={tag}
                onClick={() => setLocalTemplate(prev => prev + " " + tag)}
                className="px-2 py-1 bg-white border border-green-200 rounded text-xs font-mono text-green-700 hover:border-green-400 transition-colors"
               >
                 {tag}
               </button>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-green-200">
             <h4 className="font-semibold text-green-800 mb-1">Preview Logic:</h4>
             <p className="text-gray-600 text-xs leading-relaxed">
                When you click the WhatsApp button on a lead, these placeholders will be replaced with the actual business data. 
                <br/><br/>
                <strong>Note:</strong> If the phone number starts with '03' (Pakistan), it will be automatically converted to International format (+923...) for the link to work.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppTemplateEditor;
