import { useState, useEffect, useRef } from 'react';
import { Menu, Sun, Moon, Server, Cloud, ChevronDown, Check, Loader2, Cpu, Brain, Code, Sparkles } from 'lucide-react';

const CLOUD_MODELS = [
  { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', desc: 'State-of-the-art Reasoning LLM', badge: 'Reasoning', icon: Brain },
  { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', desc: 'High-performance Chat & Text LLM', badge: 'General', icon: Sparkles },
  { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', desc: 'Flagship open LLM from Meta', badge: 'Flagship', icon: Cpu },
  { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder', desc: 'Elite programming and technical helper', badge: 'Coding', icon: Code },
  { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen 2.5 7B', desc: 'Ultra-fast conversational helper', badge: 'Fast', icon: Sparkles }
];

export default function Header({ 
  isDark, 
  onToggleTheme, 
  onOpenSidebar, 
  modelName,
  serverUrl,
  backendMode,
  updateBackendMode,
  hfModel,
  updateHfModel,
  serverStatus = 'checking',
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [localModels, setLocalModels] = useState([
    { id: './fine_tuned_lora', name: 'Custom Fine-Tuned Model', loaded: false, downloaded: true }
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

  const handleSelectLocalModel = async (modelId) => {
    if (loadingLocalId) return;
    setLoadingLocalId(modelId);
    
    try {
      updateBackendMode('local');
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

  const handleSelectCloudModel = (modelId) => {
    updateBackendMode('huggingface');
    updateHfModel(modelId);
    setDropdownOpen(false);
  };

  const modelLabel = modelName || (backendMode === 'local' ? 'Local Model' : 'Cloud Model');

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-surface-200/30 dark:border-surface-800/30 bg-white/40 dark:bg-surface-950/40 glass select-none z-50">
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
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-surface-200/50 dark:border-surface-800/40 hover:bg-surface-100/50 dark:hover:bg-surface-900/30 transition-all duration-200 cursor-pointer shadow-sm hover:shadow"
          >
            {backendMode === 'local' ? (
              <Server className="w-4.5 h-4.5 text-emerald-500" />
            ) : (
              <Cloud className="w-4.5 h-4.5 text-primary-500 dark:text-primary-400" />
            )}
            <div className="flex flex-col text-left">
              <span className="text-[10px] uppercase tracking-wider text-surface-400 dark:text-surface-500 font-extrabold leading-none mb-0.5">
                {backendMode === 'local' ? 'Active Local Model' : 'Active Cloud Model'}
              </span>
              <span className="text-sm font-semibold text-surface-850 dark:text-surface-150 flex items-center gap-1.5 leading-none">
                {modelLabel}
                <ChevronDown className={`w-3.5 h-3.5 text-surface-400 dark:text-surface-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
              </span>
            </div>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-80 rounded-2xl border border-surface-200/60 dark:border-surface-800/45 bg-white/95 dark:bg-surface-900/95 backdrop-blur-xl shadow-2xl animate-fade-in-up py-3 z-[100] max-h-[500px] overflow-y-auto">
              
              {/* Category: Cloud Models */}
              <div className="px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5" />
                Cloud Models (Hugging Face)
              </div>
              <div className="space-y-0.5 mt-1 px-1.5 mb-3">
                {CLOUD_MODELS.map((m) => {
                  const isActive = backendMode === 'huggingface' && hfModel === m.id;
                  const IconComponent = m.icon;
                  
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleSelectCloudModel(m.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-150
                        ${isActive 
                          ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold border-l-2 border-primary-550 pl-2' 
                          : 'hover:bg-surface-100 dark:hover:bg-surface-800/50 text-surface-700 dark:text-surface-300 cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary-500' : 'text-surface-400 dark:text-surface-500'}`} />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate">{m.name}</span>
                            <span className="px-1 py-0.2 text-[8px] font-bold rounded bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400">{m.badge}</span>
                          </div>
                          <span className="text-[10px] text-surface-400 dark:text-surface-500 truncate">{m.desc}</span>
                        </div>
                      </div>
                      {isActive && <Check className="w-4 h-4 text-primary-500 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>

              {/* Category: Local Models */}
              <div className="px-3.5 py-1.5 border-t border-surface-100 dark:border-surface-800/60 pt-3 text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                Local / Fine-Tuned Models
              </div>
              <div className="space-y-0.5 mt-1 px-1.5">
                {localModels.map((m) => {
                  const isActive = backendMode === 'local' && m.loaded;
                  const isLoading = loadingLocalId === m.id;
                  const isDownloaded = m.downloaded;
                  
                  return (
                    <button
                      key={m.id}
                      onClick={() => isDownloaded && handleSelectLocalModel(m.id)}
                      disabled={!isDownloaded || isLoading}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-150
                        ${isActive 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border-l-2 border-emerald-550 pl-2' 
                          : !isDownloaded
                          ? 'opacity-40 cursor-not-allowed text-surface-400'
                          : 'hover:bg-surface-100 dark:hover:bg-surface-800/50 text-surface-700 dark:text-surface-300 cursor-pointer'}`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate">{m.name}</span>
                        <span className="text-[10px] text-surface-400 dark:text-surface-500">
                          {isDownloaded ? (isActive ? 'Active Now' : 'Ready to load') : 'Download in settings first'}
                        </span>
                      </div>
                      <div className="shrink-0 ml-2">
                        {isActive && <Check className="w-4 h-4 text-emerald-500" />}
                        {isLoading && <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* System Status Indicator */}
        <div 
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 shadow-sm
            ${serverStatus === 'online' 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/10' 
              : serverStatus === 'offline' 
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/10' 
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/10'}`}
          title={serverStatus === 'online' ? 'All systems operational' : serverStatus === 'offline' ? 'Inference server offline or unreachable' : 'Pinging server...'}
        >
          <span className={`w-2 h-2 rounded-full transition-all duration-300
            ${serverStatus === 'online' 
              ? 'bg-emerald-500 animate-pulse' 
              : serverStatus === 'offline' 
              ? 'bg-rose-500' 
              : 'bg-amber-500 animate-pulse'}`} 
          />
          {serverStatus === 'online' ? 'System Online' : serverStatus === 'offline' ? 'System Offline' : 'Checking System...'}
        </div>

        <button
          onClick={onToggleTheme}
          className="p-2.5 rounded-xl hover:bg-surface-150 dark:hover:bg-surface-900/60 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-transparent hover:border-surface-200/50 dark:hover:border-surface-800/40 mr-1"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-surface-500" />}
        </button>
      </div>
    </header>
  );
}
