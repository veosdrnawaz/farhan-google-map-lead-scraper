import React, { useState } from 'react';
import { MessageSquare, Save, Trash2, Plus, Edit2, Sparkles, Check, X, Copy } from 'lucide-react';
import { WhatsAppTemplate } from '../types';
import { rewriteTemplate } from '../services/geminiService';

interface WhatsAppTemplateManagerProps {
  templates: WhatsAppTemplate[];
  onSaveTemplates: (templates: WhatsAppTemplate[]) => void;
  activeTemplateId: string | null;
  onSetActiveTemplate: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_TEMPLATE: WhatsAppTemplate = {
  id: 'default-1',
  name: 'Greeting & Reviews',
  content: `*Business Profile:*
🏢 *Name:* {name}
📍 *Address:* {address}
⭐ *Rating:* {rating} ({reviewCount} reviews)
📞 *Phone:* {phoneNumber}

--------------------------------

Hi {name},

I came across your business on Google Maps and saw your great reviews! 

[Your message here]`,
  lastModified: Date.now()
};

const WhatsAppTemplateManager: React.FC<WhatsAppTemplateManagerProps> = ({ 
  templates, 
  onSaveTemplates, 
  activeTemplateId, 
  onSetActiveTemplate,
  isOpen, 
  onClose 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempContent, setTempContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleAddNew = () => {
    const newId = Date.now().toString();
    setEditingId(newId);
    setTempName('New Marketing Template');
    setTempContent(DEFAULT_TEMPLATE.content);
  };

  const handleEdit = (template: WhatsAppTemplate) => {
    setEditingId(template.id);
    setTempName(template.name);
    setTempContent(template.content);
  };

  const handleSave = () => {
    if (!tempName.trim() || !tempContent.trim()) return;

    let newTemplates = [...templates];
    const existingIndex = newTemplates.findIndex(t => t.id === editingId);

    const newTemplate: WhatsAppTemplate = {
      id: editingId || Date.now().toString(),
      name: tempName,
      content: tempContent,
      lastModified: Date.now()
    };

    if (existingIndex >= 0) {
      newTemplates[existingIndex] = newTemplate;
    } else {
      newTemplates.push(newTemplate);
    }

    onSaveTemplates(newTemplates);
    
    // If no active template, set this one
    if (!activeTemplateId) {
        onSetActiveTemplate(newTemplate.id);
    }
    
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
      const newTemplates = templates.filter(t => t.id !== id);
      onSaveTemplates(newTemplates);
      if (activeTemplateId === id && newTemplates.length > 0) {
        onSetActiveTemplate(newTemplates[0].id);
      } else if (newTemplates.length === 0) {
        onSetActiveTemplate(''); // No templates left
      }
    }
  };

  const handleAiRewrite = async () => {
    if (!tempContent) return;
    setIsGenerating(true);
    try {
        const rewritten = await rewriteTemplate(tempContent);
        if (rewritten) {
            setTempContent(rewritten);
        }
    } catch (e) {
        console.error(e);
        alert("Failed to generate AI suggestion. You may have hit the rate limit. Please try again in a few seconds.");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8 animate-in fade-in slide-in-from-top-4 overflow-hidden">
      <div className="flex border-b border-gray-200">
        {/* Sidebar List */}
        <div className="w-1/3 border-r border-gray-200 bg-gray-50 p-4 flex flex-col min-h-[400px]">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-semibold text-gray-700">Your Templates</h3>
             <button onClick={handleAddNew} className="p-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors" title="Add New">
               <Plus className="w-4 h-4" />
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-2">
             {templates.length === 0 && (
                 <p className="text-sm text-gray-400 text-center italic py-4">No templates yet.</p>
             )}
             {templates.map(t => (
               <div 
                 key={t.id} 
                 onClick={() => !editingId && onSetActiveTemplate(t.id)}
                 className={`p-3 rounded-lg border cursor-pointer transition-all ${activeTemplateId === t.id ? 'bg-green-50 border-green-300 ring-1 ring-green-400' : 'bg-white border-gray-200 hover:border-green-200'}`}
               >
                 <div className="flex justify-between items-start">
                    <span className={`font-medium text-sm truncate ${activeTemplateId === t.id ? 'text-green-800' : 'text-gray-700'}`}>{t.name}</span>
                    {activeTemplateId === t.id && <Check className="w-3 h-3 text-green-600 mt-1" />}
                 </div>
                 <div className="flex justify-end gap-2 mt-2">
                    <button onClick={(e) => { e.stopPropagation(); handleEdit(t); }} className="text-gray-400 hover:text-blue-600 p-1">
                        <Edit2 className="w-3 h-3" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} className="text-gray-400 hover:text-red-600 p-1">
                        <Trash2 className="w-3 h-3" />
                    </button>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Editor Area */}
        <div className="w-2/3 p-6">
           <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-2 text-gray-800">
               <MessageSquare className="w-5 h-5 text-green-600" />
               <h3 className="font-semibold text-lg">{editingId ? (editingId.length > 15 ? 'Create New Template' : 'Edit Template') : 'Select a Template'}</h3>
             </div>
             <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
               <X className="w-5 h-5" />
             </button>
           </div>

           {editingId ? (
               <div className="flex flex-col h-full">
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Template Name</label>
                    <input 
                        type="text" 
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        placeholder="e.g., Introduction Message"
                    />
                  </div>
                  
                  <div className="mb-2 flex justify-between items-end">
                     <label className="block text-xs font-semibold text-gray-500 uppercase">Message Content</label>
                     <button 
                        onClick={handleAiRewrite}
                        disabled={isGenerating}
                        className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-200 hover:bg-purple-100 transition-colors"
                     >
                        <Sparkles className="w-3 h-3" />
                        {isGenerating ? 'Rewriting...' : 'AI Rewrite'}
                     </button>
                  </div>
                  <textarea
                    value={tempContent}
                    onChange={(e) => setTempContent(e.target.value)}
                    className="flex-1 min-h-[200px] w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm mb-4"
                    placeholder="Hi {name}..."
                  />

                  <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-2">Click to insert variable:</p>
                    <div className="flex flex-wrap gap-2">
                        {['{name}', '{address}', '{phoneNumber}', '{rating}', '{reviewCount}', '{category}', '{website}'].map((tag) => (
                        <button 
                            key={tag}
                            onClick={() => setTempContent(prev => prev + " " + tag)}
                            className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                            {tag}
                        </button>
                        ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                      <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm flex items-center gap-2">
                          <Save className="w-4 h-4" /> Save Changes
                      </button>
                  </div>
               </div>
           ) : (
               <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Copy className="w-12 h-12 mb-4 opacity-20" />
                  <p>Select a template from the left to edit</p>
                  <p className="text-sm">or create a new one.</p>
               </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppTemplateManager;