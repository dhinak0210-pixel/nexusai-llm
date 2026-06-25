import { useState, useEffect } from 'react';
import { Cpu, Download, Check, Loader2, Star, HardDrive, AlertCircle } from 'lucide-react';

const FALLBACK_MODELS = [
  { id: './fine_tuned_lora', name: 'Custom Fine-Tuned Model', size: 'Custom', quality: 5, vram: 'Depends', description: 'Your custom local instruction-aligned model (saved in ./fine_tuned_lora)', chat_capable: true, loaded: false },
  { id: 'HuggingFaceTB/SmolLM2-1.7B-Instruct', name: 'SmolLM2 1.7B', size: '1.7B', quality: 4, vram: '~4 GB', description: 'Fast, open-access HuggingFace model — great for local inference.', chat_capable: true, loaded: false },
  { id: 'microsoft/Phi-3-mini-4k-instruct', name: 'Phi-3 Mini', size: '3.8B', quality: 4, vram: '~7 GB', description: "Microsoft's compact powerhouse — strong reasoning in a small footprint.", chat_capable: true, loaded: false },
];

function QualityStars({ count }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < count ? 'text-amber-400 fill-amber-400' : 'text-surface-300 dark:text-surface-600'}`} />
      ))}
    </div>
  );
}

// Detect if running on deployed Space vs localhost
const isDeployedSpace = typeof window !== 'undefined' &&
  !window.location.hostname.includes('localhost') &&
  !window.location.hostname.includes('127.0.0.1');

export default function ModelPicker({ serverUrl }) {
  // On deployed Space: use relative URL (same container). On localhost: use configured serverUrl.
  const baseUrl = isDeployedSpace ? '' : (serverUrl || 'http://localhost:8000').replace(/\/+$/, '');
  const [models, setModels] = useState(FALLBACK_MODELS);
  const [loading, setLoading] = useState(null); // model id being loaded
  const [error, setError] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  // Fetch models from server
  useEffect(() => {
    if (!serverUrl) return;
    const url = baseUrl + '/v1/models';
    fetch(url, { signal: AbortSignal.timeout(5000) })
      .then(r => r.json())
      .then(data => {
        if (data.data?.length) {
          setModels(data.data);
          setFetchFailed(false);
        }
      })
      .catch(() => setFetchFailed(true));
  }, [serverUrl]);

  const handleLoad = async (modelId) => {
    if (loading) return;
    // If modelId is a local path (starts with './'), mark as loaded locally without server call
    if (modelId.startsWith('./')) {
      setModels(prev => prev.map(m => ({ ...m, loaded: m.id === modelId })));
      return;
    }
    setLoading(modelId);
    setError(null);
    try {
      const url = baseUrl + '/v1/models/load';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      // Update loaded state
      setModels(prev => prev.map(m => ({ ...m, loaded: m.id === modelId })));
    } catch (e) {
      setError(`Failed to load: ${e.message}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-300">
        <Cpu className="w-4 h-4" /> Select Model
      </label>

      {fetchFailed && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Server not reachable. Start your server first, then models will appear here.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
        {models.map((m) => {
          const isLoaded = m.loaded;
          const isLoading = loading === m.id;

          return (
            <button
              key={m.id}
              onClick={() => !isLoaded && !loading && handleLoad(m.id)}
              disabled={isLoaded || !!loading}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer
                ${isLoaded
                  ? 'border-emerald-400 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10'
                  : isLoading
                  ? 'border-primary-400 dark:border-primary-500/40 bg-primary-50 dark:bg-primary-500/10'
                  : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800/40'
                }
                ${(isLoaded || loading) ? 'cursor-default' : ''}`}
            >
              {/* Model info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-surface-800 dark:text-surface-200 truncate">{m.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-200 dark:bg-surface-700 text-surface-500 dark:text-surface-400">{m.size}</span>
                  {m.chat_capable && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-100 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400">Chat</span>
                  )}
                </div>
                <p className="text-[11px] text-surface-400 dark:text-surface-500 truncate">{m.description}</p>
                <div className="flex items-center gap-3 mt-1">
                  <QualityStars count={m.quality} />
                  <span className="flex items-center gap-1 text-[10px] text-surface-400 dark:text-surface-500">
                    <HardDrive className="w-3 h-3" /> {m.vram}
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="shrink-0">
                {isLoaded ? (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold">
                    <Check className="w-3.5 h-3.5" /> Active
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-semibold">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400 text-xs font-medium group-hover:bg-surface-200">
                    <Download className="w-3.5 h-3.5" /> Load
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
