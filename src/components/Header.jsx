import { useState, useEffect, useRef } from 'react';
import { Menu, Sun, Moon, Sparkles, Cloud, Server, ChevronDown, Check, Loader2, Cpu } from 'lucide-react';

const CLOUD_MODELS = [
  { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', size: '671B' },
  { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder', size: '32B' },
  { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', size: '70B' },
  { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', size: '671B' },
  { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen 2.5 7B', size: '7B' }
];

export default function Header({ 
  isDark, 
  onToggleTheme, 
  onOpenSidebar, 
  backendMode, 
  updateBackendMode,
  hfModel,
  updateHfModel,
  modelName,
  serverUrl
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [localModels, setLocalModels] = useState([
    { id: './fine_tuned_lora', name: 'Custom Fine-Tuned Model', loaded: false },
    { id: 'google/gemma-2-2b-it', name: 'Gemma 2 2B', loaded: false }
  ]);
  const [loadingLocalId, setLoadingLocalId] = useState(null);
  const dropdownRef = useRef(null);

  // Sync local models from server
  useEffect(() => {
    if (!serverUrl) return;
    const fetchLocalModels = () => {
      const url = serverUrl.replace(/\/+$/, '') + '/v1/models';
      fetch(url, { signal: AbortSignal.timeout(3000) })
        .then(res => res.json())
        .then(data => {
          if (data.data?.length) {
            setLocalModels(data.data);
          }
        })
        .catch(() => {});
    };
    
    fetchLocalModels();
    const interval = setInterval(fetchLocalModels, 4000);
    return () => clearInterval(interval);
  }, [serverUrl]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCloudModel = (modelId) => {
    updateBackendMode('huggingface');
    updateHfModel(modelId);
    setDropdownOpen(false);
  };

  const handleSelectLocalModel = async (modelId) => {
    if (loadingLocalId) return;
    setLoadingLocalId(modelId);
    updateBackendMode('local');
    
    try {
      const url = serverUrl.replace(/\/+$/, '') + '/v1/models/load';
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId }),
        signal: AbortSignal.timeout(30000)
      });
      // Force instant local sync
      const res = await fetch(serverUrl.replace(/\/+$/, '') + '/v1/models');
      if (res.ok) {
        const data = await res.json();
        if (data.data?.length) {
          setLocalModels(data.data);
        }
      }
    } catch (e) {
      console.error("Failed to load local model:", e);
    } finally {
      setLoadingLocalId(null);
      setDropdownOpen(false);
    }
  };

  const modelLabel = modelName || (backendMode === 'local' ? 'Local LLM' : 'DeepSeek V3');
  const ModeIcon = backendMode === 'local' ? Server : Cloud;

  return (
    <header className="flex items-center justify-between px-6 py-4.5 border-b border-surface-200/30 dark:border-surface-800/30 bg-white/40 dark:bg-surface-950/40 glass select-none z-50">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-900/60 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5 text-surface-500" />
        </button>

        {/* Dynamic Model Dropdown Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-surface-200/50 dark:border-surface-800/40 hover:bg-surface-100/50 dark:hover:bg-surface-900/30 transition-all duration-200 cursor-pointer"
          >
            <ModeIcon className="w-4.5 h-4.5 text-primary-500/80 dark:text-primary-400/80" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase tracking-wider text-surface-400 dark:text-surface-500 font-bold leading-none mb-0.5">
                Active Model
              </span>
              <span className="text-sm font-semibold text-surface-850 dark:text-surface-150 flex items-center gap-1.5">
                {modelLabel}
                <ChevronDown className={`w-3.5 h-3.5 text-surface-400 dark:text-surface-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </span>
            </div>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-2xl border border-surface-200/60 dark:border-surface-800/45 bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl shadow-2xl animate-fade-in-up py-2.5 z-[100] max-h-[420px] overflow-y-auto">
              
              {/* Category: Local Models */}
              <div className="px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-surface-400 dark:text-surface-500 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-primary-500" />
                Local / Fine-Tuned Models
              </div>
              <div className="space-y-0.5 mt-1 px-1">
                {localModels.map((m) => {
                  const isActive = backendMode === 'local' && m.loaded;
                  const isLoading = loadingLocalId === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectLocalModel(m.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer
                        ${isActive 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold' 
                          : 'hover:bg-surface-100 dark:hover:bg-surface-800/50 text-surface-700 dark:text-surface-300'}`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs truncate">{m.name}</span>
                        <span className="text-[10px] text-surface-400 dark:text-surface-500">FastAPI Server</span>
                      </div>
                      <div className="shrink-0 ml-2">
                        {isActive && <Check className="w-4 h-4 text-emerald-500" />}
                        {isLoading && <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="my-2 border-t border-surface-200/50 dark:border-surface-800/30" />

              {/* Category: Cloud Models */}
              <div className="px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-surface-400 dark:text-surface-500 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-accent-500" />
                Cloud API Models
              </div>
              <div className="space-y-0.5 mt-1 px-1">
                {CLOUD_MODELS.map((m) => {
                  const isActive = backendMode === 'huggingface' && hfModel === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectCloudModel(m.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer
                        ${isActive 
                          ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold' 
                          : 'hover:bg-surface-100 dark:hover:bg-surface-800/50 text-surface-700 dark:text-surface-300'}`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs truncate">{m.name}</span>
                        <span className="text-[10px] text-surface-400 dark:text-surface-500 font-medium">HuggingFace API • {m.size}</span>
                      </div>
                      {isActive && <Check className="w-4 h-4 text-primary-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onToggleTheme}
        className="p-2.5 rounded-xl hover:bg-surface-150 dark:hover:bg-surface-900/60 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-transparent hover:border-surface-200/50 dark:hover:border-surface-800/40 mr-1"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-surface-500" />}
      </button>
    </header>
  );
}
