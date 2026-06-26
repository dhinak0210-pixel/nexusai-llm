import { useState } from 'react';
import { X, Server, Cloud, Brain, Code2, Palette, GraduationCap, Bug, Cpu, Compass, Briefcase, Check, Star } from 'lucide-react';
import ModelPicker from './ModelPicker';

const POPULAR_HF_MODELS = [
  {
    id: 'deepseek-ai/DeepSeek-V3',
    name: 'DeepSeek V3',
    size: '671B MoE',
    category: 'General',
    description: 'Top tier general intelligence, coding & reasoning.',
    quality: 5
  },
  {
    id: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    name: 'Qwen 2.5 Coder',
    size: '32B',
    category: 'Coding',
    description: 'Highly optimized coding, programming & logic assistant.',
    quality: 5
  },
  {
    id: 'meta-llama/Llama-3.3-70B-Instruct',
    name: 'Llama 3.3 70B',
    size: '70B',
    category: 'General',
    description: 'Flagship Meta model with balanced intelligence.',
    quality: 5
  },
  {
    id: 'deepseek-ai/DeepSeek-R1',
    name: 'DeepSeek R1',
    size: '671B',
    category: 'Reasoning',
    description: 'Advanced reasoning, math, coding and logical chain of thought.',
    quality: 5
  },
  {
    id: 'Qwen/Qwen2.5-7B-Instruct',
    name: 'Qwen 2.5 7B',
    size: '7B',
    category: 'Lightweight',
    description: 'Fast, highly capable 7B model for general tasks.',
    quality: 4
  }
];

function QualityStars({ count }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < count ? 'text-amber-400 fill-amber-400' : 'text-surface-300 dark:text-surface-600'}`} />
      ))}
    </div>
  );
}

export default function SettingsModal({
  isOpen, onClose,
  backendMode, onSaveBackendMode,
  serverUrl,
  systemPersona, onSaveSystemPersona,
  hfModel, onSaveHfModel,
}) {
  const [mode, setMode] = useState(backendMode);

  const isPopular = POPULAR_HF_MODELS.some(m => m.id === hfModel);
  const [selectedModel, setSelectedModel] = useState(isPopular ? hfModel : 'deepseek-ai/DeepSeek-V3');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveBackendMode(mode);
    onSaveHfModel(selectedModel || 'deepseek-ai/DeepSeek-V3');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-surface-800 border border-surface-200/50 dark:border-surface-700/30 shadow-2xl animate-fade-in-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-200/50 dark:border-surface-700/30">
          <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100">Settings</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors cursor-pointer">
            <X className="w-5 h-5 text-surface-400" />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Backend Mode Toggle */}
          <div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMode('huggingface')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  mode === 'huggingface'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300'
                    : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-surface-300'
                }`}>
                <Cloud className="w-5 h-5 mb-1" />
                <p className="text-xs font-semibold text-center">Cloud Models</p>
              </button>
              <button onClick={() => setMode('local')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
                  mode === 'local'
                    ? 'border-accent-500 bg-accent-600/10 dark:bg-accent-500/10 text-accent-700 dark:text-accent-400'
                    : 'border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:border-surface-300'
                }`}>
                <Server className="w-5 h-5 mb-1" />
                <p className="text-xs font-semibold text-center">Local Models</p>
              </button>
            </div>
          </div>

          {/* HuggingFace Settings */}
          {mode === 'huggingface' && (
            <div className="animate-fade-in-up space-y-5">
              {/* Model Picker */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-surface-550 dark:text-surface-400">
                  <Cpu className="w-3.5 h-3.5 text-primary-500" /> Select Model
                </label>
                
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {POPULAR_HF_MODELS.map((m) => {
                    const isSelected = selectedModel === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedModel(m.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer
                          ${isSelected
                            ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-500/10'
                            : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800/40'
                          }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-surface-800 dark:text-surface-200 truncate">{m.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400">{m.size}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              m.category === 'Coding' 
                                ? 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400' 
                                : m.category === 'Lightweight'
                                ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-primary-100 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400'
                            }`}>{m.category}</span>
                          </div>
                          <p className="text-[11px] text-surface-400 dark:text-surface-500 truncate">{m.description}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <QualityStars count={m.quality} />
                          </div>
                        </div>
                        
                        <div className="shrink-0">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-primary-500 text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-surface-300 dark:border-surface-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Local / Colab Settings */}
          {mode === 'local' && (
            <div className="animate-fade-in-up space-y-5">
              {/* Model Picker */}
              <ModelPicker serverUrl={serverUrl ? serverUrl.trim() : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' ? window.location.origin : 'http://localhost:8000')} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-5 border-t border-surface-200/50 dark:border-surface-700/30 bg-surface-50/20 dark:bg-surface-900/10">
          <button onClick={onClose} className="px-4.5 py-2 rounded-xl text-sm font-semibold text-surface-500 dark:text-surface-350 hover:bg-surface-100 dark:hover:bg-surface-700/60 transition-colors cursor-pointer">Cancel</button>
          <button onClick={handleSave} className="px-4.5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer">Save</button>
        </div>
      </div>
    </div>
  );
}
