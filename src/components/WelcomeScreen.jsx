import { Sparkles, Code2, BookOpen, Lightbulb, PenLine, Zap, Cloud, Server } from 'lucide-react';

const suggestions = [
  { icon: Code2, title: 'Craft Code & Logic', prompt: 'Write a Python function that implements binary search with detailed comments', color: 'from-violet-500 to-indigo-500' },
  { icon: BookOpen, title: 'Master Core Concepts', prompt: 'Explain how neural networks work in simple terms with analogies', color: 'from-fuchsia-500 to-pink-500' },
  { icon: Lightbulb, title: 'Explore Creative Ideas', prompt: 'Give me 10 creative side project ideas for a developer portfolio', color: 'from-amber-500 to-rose-500' },
  { icon: PenLine, title: 'Compose Professional Copy', prompt: 'Help me write a professional email requesting a meeting with a potential client', color: 'from-cyan-500 to-emerald-500' },
];

export default function WelcomeScreen({ onSend, disabled, backendMode, hfModel }) {
  const isCloud = backendMode === 'huggingface';
  
  const subtitle = isCloud
    ? `Cloud Engine Enabled: Using top-tier frontier models via Hugging Face`
    : 'Local Engine Enabled: Private, secure, offline-first local inference';

  const warningText = 'Start your local FastAPI server or configure the URL in settings to unlock interaction.';

  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-12 relative overflow-hidden select-none">
      <div className="max-w-5xl w-full animate-fade-in-up relative z-10">
        <div className="text-center mb-8 sm:mb-12">
          {/* Pulsing luxury logo crown */}
          <div className="relative inline-block mb-4 sm:mb-6">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-primary-600 to-accent-500 blur-xl opacity-30 animate-pulse"></div>
            <div className="relative inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-2xl shadow-primary-500/25 animate-float">
              <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-surface-900 dark:text-white mb-3 bg-gradient-to-r from-primary-500 via-primary-400 to-accent-400 bg-clip-text text-transparent">
            How can I help you today?
          </h2>
          
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isCloud 
                ? 'bg-primary-500/10 border-primary-500/20 text-primary-600 dark:text-primary-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            }`}>
              {isCloud ? <Cloud className="w-3.5 h-3.5" /> : <Server className="w-3.5 h-3.5" />}
              {isCloud ? 'Cloud Mode' : 'Local Mode'}
            </span>
          </div>
          
          <p className="text-surface-500 dark:text-surface-400 text-xs sm:text-sm font-medium tracking-wide mt-3">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {suggestions.map((item, i) => (
            <button
              key={i}
              onClick={() => !disabled && onSend(item.prompt)}
              disabled={disabled}
              className={`group luxury-card relative flex items-start gap-4 p-5 rounded-2xl text-left bg-white/40 dark:bg-surface-900/30 border border-surface-200/50 dark:border-surface-800/40 hover:border-primary-400/40 dark:hover:border-primary-500/30 hover:bg-white dark:hover:bg-surface-900/60 hover:-translate-y-1 transition-all duration-300 ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              <div className={`shrink-0 w-10.5 h-10.5 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg shadow-black/5 opacity-90 group-hover:scale-110 transition-transform duration-300`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[13.5px] text-surface-850 dark:text-surface-100 mb-1 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors duration-200">
                  {item.title}
                </p>
                <p className="text-xs text-surface-450 dark:text-surface-500 leading-relaxed line-clamp-2">
                  {item.prompt}
                </p>
              </div>
            </button>
          ))}
        </div>

        {disabled && (
          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
              <Zap className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{warningText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
