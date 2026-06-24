import { useState } from 'react';
import { X, Brain, Trash2, Plus, Sparkles } from 'lucide-react';

export default function MemoryVaultModal({
  isOpen,
  onClose,
  memories,
  onAddMemory,
  onDeleteMemory,
  onClearMemories,
}) {
  const [newMemory, setNewMemory] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMemory.trim()) return;
    onAddMemory(newMemory.trim());
    setNewMemory('');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-surface-800 border border-surface-200/50 dark:border-surface-700/30 shadow-2xl animate-fade-in-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-200/50 dark:border-surface-700/30 bg-gradient-to-r from-purple-500/5 to-primary-500/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Brain className="w-4.5 h-4.5 text-purple-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-100">Memory Vault</h3>
              <p className="text-[10px] text-surface-400 dark:text-surface-500">Persistent user details, configurations, and core guidelines</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors cursor-pointer">
            <X className="w-5 h-5 text-surface-400" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Add Memory Form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newMemory}
              onChange={(e) => setNewMemory(e.target.value)}
              placeholder="e.g. Remember that I prefer ES6 modules instead of CommonJS..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-900 text-sm text-surface-800 dark:text-surface-200 placeholder-surface-400 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-all text-ellipsis"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm flex items-center gap-1.5 transition-all shadow-md shadow-purple-500/25 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </form>

          {/* Memories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider">
                Saved Memories ({memories.length})
              </span>
              {memories.length > 0 && (
                <button
                  type="button"
                  onClick={onClearMemories}
                  className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 rounded-xl border border-dashed border-surface-200 dark:border-surface-700/50 bg-surface-50/50 dark:bg-surface-900/20">
                <Brain className="w-10 h-10 text-surface-300 dark:text-surface-600 mb-2 opacity-55" />
                <p className="text-sm font-medium text-surface-600 dark:text-surface-400">Your Memory Vault is empty</p>
                <p className="text-xs text-surface-400 dark:text-surface-500 mt-1 max-w-xs text-center px-4">
                  Add facts or guidelines here. NexusAI will automatically reference them across all future chat interactions.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {memories.map((m) => (
                  <div
                    key={m.id}
                    className="group flex items-start justify-between gap-3 p-3 rounded-xl border border-surface-200/50 dark:border-surface-700/30 bg-surface-50/50 dark:bg-surface-900/35 hover:bg-surface-100 dark:hover:bg-surface-800/40 transition-colors"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                      <p className="text-sm text-surface-750 dark:text-surface-300 break-words leading-relaxed select-text">
                        {m.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteMemory(m.id)}
                      className="p-1 rounded-md text-surface-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-5 border-t border-surface-200/50 dark:border-surface-700/30 bg-surface-50/20 dark:bg-surface-900/10">
          <button
            onClick={onClose}
            className="px-4.5 py-2 rounded-xl text-sm font-semibold text-surface-500 dark:text-surface-350 hover:bg-surface-100 dark:hover:bg-surface-700/60 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
