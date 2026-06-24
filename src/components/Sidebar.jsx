import { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Settings,
  X,
  ChevronLeft,
  Sparkles,
  Eraser,
  Brain,
} from 'lucide-react';

export default function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onClearAll,
  isOpen,
  onClose,
  onOpenSettings,
  onOpenMemory,
}) {
  const [hoveredId, setHoveredId] = useState(null);

  // Group conversations by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  conversations.forEach((conv) => {
    const date = new Date(conv.updatedAt);
    if (date >= today) groups.today.push(conv);
    else if (date >= yesterday) groups.yesterday.push(conv);
    else if (date >= weekAgo) groups.thisWeek.push(conv);
    else groups.older.push(conv);
  });

  const renderGroup = (label, items) => {
    if (items.length === 0) return null;
    return (
      <div key={label} className="mb-4">
        <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500">
          {label}
        </p>
        {items.map((conv) => (
          <button
            key={conv.id}
            onClick={() => {
              onSelectChat(conv.id);
              onClose();
            }}
            onMouseEnter={() => setHoveredId(conv.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left text-sm transition-all duration-300 relative border-l-2 cursor-pointer ${
              activeConversationId === conv.id
                ? 'bg-primary-500/10 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400 font-semibold border-primary-500 shadow-sm'
                : 'text-surface-600 dark:text-surface-400 hover:bg-white/60 dark:hover:bg-surface-900/40 border-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0 opacity-60 group-hover:scale-105 transition-transform" />
            <span className="truncate flex-1">{conv.title}</span>
            {hoveredId === conv.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(conv.id);
                }}
                className="p-1 rounded-lg hover:bg-red-500/20 text-surface-400 hover:text-red-500 transition-colors"
                title="Delete conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-md"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ease-out
          bg-white/30 dark:bg-surface-950/30 glass border-r border-surface-200/30 dark:border-surface-800/30
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-200/30 dark:border-surface-800/30">
          <div className="flex items-center gap-3">
            <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/20 animate-float">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary-550 via-primary-500 to-accent-500 bg-clip-text text-transparent">
              NexusAI
            </h1>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-surface-500" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
              bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700
              text-white font-semibold text-sm shadow-xl shadow-primary-500/20 hover:shadow-2xl hover:shadow-primary-500/30
              transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            New Chat
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-surface-400 dark:text-surface-650 select-none">
              <MessageSquare className="w-10 h-10 mb-2.5 opacity-30" />
              <p className="text-xs font-semibold tracking-wide">No conversations yet</p>
            </div>
          ) : (
            <>
              {renderGroup('Today', groups.today)}
              {renderGroup('Yesterday', groups.yesterday)}
              {renderGroup('This Week', groups.thisWeek)}
              {renderGroup('Older', groups.older)}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-surface-200/30 dark:border-surface-800/30 space-y-1 bg-white/10 dark:bg-surface-950/10">
          {conversations.length > 0 && (
            <button
              onClick={onClearAll}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold
                text-surface-500 dark:text-surface-400 hover:bg-red-500/5 dark:hover:bg-red-500/10
                hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
            >
              <Eraser className="w-4 h-4 text-red-550 dark:text-red-400" />
              Clear all chats
            </button>
          )}
          <button
            onClick={onOpenMemory}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold
              text-surface-650 dark:text-surface-350 hover:bg-surface-100 dark:hover:bg-surface-900/60
              transition-colors cursor-pointer"
          >
            <Brain className="w-4 h-4 text-primary-500" />
            Memory Vault
          </button>
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold
              text-surface-650 dark:text-surface-350 hover:bg-surface-100 dark:hover:bg-surface-900/60
              transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-accent-500" />
            Settings
          </button>
        </div>
      </aside>
    </>
  );
}
