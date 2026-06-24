import { Menu, Sun, Moon, Sparkles, Cloud, Server } from 'lucide-react';

export default function Header({ isDark, onToggleTheme, onOpenSidebar, backendMode, modelName }) {
  const modelLabel = modelName || (backendMode === 'local' ? 'Local LLM' : 'DeepSeek V3');
  const ModeIcon = backendMode === 'local' ? Server : Cloud;

  return (
    <header className="flex items-center justify-between px-6 py-4.5 border-b border-surface-200/30 dark:border-surface-800/30 bg-white/40 dark:bg-surface-950/40 glass select-none">
      <div className="flex items-center gap-4">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-900/60 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5 text-surface-500" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center lg:hidden">
            <Sparkles className="w-4 h-4 text-white" />
          </div>

          <div className="flex items-center gap-2">
            <ModeIcon className="w-4.5 h-4.5 text-primary-500/80 dark:text-primary-400/80" />
            <span className="text-sm font-semibold tracking-wide text-surface-800 dark:text-surface-200">
              {modelLabel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {backendMode === 'local' ? 'Self-hosted' : 'Cloud API'}
          </div>
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
