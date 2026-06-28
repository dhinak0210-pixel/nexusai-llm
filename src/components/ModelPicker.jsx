import { useState, useEffect } from 'react';
import { Cpu, Download, Check, Loader2, Star, HardDrive, AlertCircle } from 'lucide-react';

const FALLBACK_MODELS = [
  { id: './fine_tuned_lora', name: 'Custom Fine-Tuned Model', size: 'Custom', quality: 5, vram: 'Depends', description: 'Your custom local instruction-aligned model (saved in ./fine_tuned_lora)', chat_capable: true, loaded: false, downloaded: true }
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

export default function ModelPicker({ serverUrl }) {
  const [models, setModels] = useState(FALLBACK_MODELS);
  const [loading, setLoading] = useState(null); // model id being loaded
  const [error, setError] = useState(null);
  const [fetchFailed, setFetchFailed] = useState(false);

  // Sync models function
  const syncModels = () => {
    if (!serverUrl) return;
    const url = serverUrl.replace(/\/+$/, '') + '/v1/models';
    fetch(url, { signal: AbortSignal.timeout(10000) })
      .then(r => r.json())
      .then(data => {
        if (data.data?.length) {
          setModels(data.data);
          setFetchFailed(false);
        }
      })
      .catch(() => setFetchFailed(true));
  };

  // Fetch models from server on mount & when serverUrl changes
  useEffect(() => {
    syncModels();
  }, [serverUrl]);

  // Poll models list if any model is downloading OR if previous fetch failed
  useEffect(() => {
    const hasDownloading = models.some(m => m.download_status === 'downloading');
    if (!hasDownloading && !fetchFailed) return;

    const interval = setInterval(() => {
      syncModels();
    }, hasDownloading ? 2000 : 4000);

    return () => clearInterval(interval);
  }, [models, fetchFailed, serverUrl]);

  const handleLoad = async (modelId) => {
    if (loading) return;
    setLoading(modelId);
    setError(null);
    try {
      const url = serverUrl.replace(/\/+$/, '') + '/v1/models/load';
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

  const handleDownload = async (modelId) => {
    setError(null);
    try {
      const url = serverUrl.replace(/\/+$/, '') + '/v1/models/download';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      // Instantly poll to update UI
      syncModels();
    } catch (e) {
      setError(`Failed to download: ${e.message}`);
    }
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-surface-700 dark:text-surface-300">
        <Cpu className="w-4 h-4 text-primary-500" /> Model Downloader & Manager
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
          const isDownloading = m.download_status === 'downloading';

          return (
            <div
              key={m.id}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200
                ${isLoaded
                  ? 'border-emerald-400 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10'
                  : isDownloading
                  ? 'border-blue-400 dark:border-blue-500/40 bg-blue-50/50 dark:bg-blue-500/5'
                  : 'border-surface-200 dark:border-surface-700 bg-white/40 dark:bg-surface-800/10'
                }`}
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
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold select-none">
                    <Check className="w-3.5 h-3.5" /> Active
                  </div>
                ) : isLoading ? (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-semibold select-none">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading
                  </div>
                ) : isDownloading ? (
                  <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold select-none">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Downloading
                  </div>
                ) : m.downloaded ? (
                  <button
                    onClick={() => handleLoad(m.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors cursor-pointer animate-pulse"
                  >
                    Activate
                  </button>
                ) : m.id === './fine_tuned_lora' ? (
                  <div className="text-[10px] text-red-500 font-semibold bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded select-none" title="Put fine-tuned files in backend/fine_tuned_lora">
                    Not Found
                  </div>
                ) : (
                  <button
                    onClick={() => handleDownload(m.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
