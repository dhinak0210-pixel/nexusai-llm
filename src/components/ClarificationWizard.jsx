import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Sparkles, PenLine, Check } from 'lucide-react';

export default function ClarificationWizard({ clarifications, onSelectOption, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInput, setShowInput] = useState(false);
  const [customAnswer, setCustomAnswer] = useState('');
  const [answers, setAnswers] = useState({});

  // Reset states when clarifications array changes
  useEffect(() => {
    setCurrentIndex(0);
    setShowInput(false);
    setCustomAnswer('');
    setAnswers({});
  }, [clarifications]);

  // Reset custom text input state when page index changes
  useEffect(() => {
    setShowInput(false);
    setCustomAnswer('');
  }, [currentIndex]);

  if (!clarifications || clarifications.length === 0) return null;

  const current = clarifications[currentIndex];
  if (!current) return null;

  const handleNext = () => {
    if (currentIndex < clarifications.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const isCustomOption = (text) => {
    const lower = text.toLowerCase();
    return lower.includes('other') || lower.includes('something else') || lower.includes('different') || lower.includes('custom');
  };

  const submitAll = (ansMap) => {
    const formatted = clarifications.map((q, idx) => {
      const ans = ansMap[idx] || 'Skipped';
      return `- **${q.question}**: ${ans}`;
    }).join('\n');
    onSelectOption(`Here are the details for my request:\n${formatted}`);
  };

  const handleSelectOption = (optionText) => {
    const updated = { ...answers, [currentIndex]: optionText };
    setAnswers(updated);

    if (currentIndex < clarifications.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      submitAll(updated);
    }
  };

  const handleSubmitCustom = (e) => {
    e.preventDefault();
    if (customAnswer.trim()) {
      handleSelectOption(customAnswer.trim());
    }
  };

  const handleSkipQuestion = () => {
    handleSelectOption('Skipped');
  };

  const hasAnyAnswers = Object.keys(answers).length > 0;

  return (
    <div className="mx-4 mb-3 rounded-2xl border border-surface-200/60 dark:border-surface-700/40 bg-surface-50 dark:bg-surface-900 shadow-xl overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface-100/50 dark:bg-surface-850/40 border-b border-surface-200/30 dark:border-surface-700/20">
        <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Clarification Required
        </span>
        <div className="flex items-center gap-3">
          {clarifications.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs text-surface-500">
              <button
                disabled={currentIndex === 0}
                onClick={handlePrev}
                className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-750 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-medium text-[11px]">
                {currentIndex + 1} of {clarifications.length}
              </span>
              <button
                disabled={currentIndex === clarifications.length - 1}
                onClick={handleNext}
                className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-750 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-750 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3.5">
        <h4 className="text-sm font-medium text-surface-800 dark:text-surface-200 leading-snug">
          {current.question}
        </h4>

        {showInput ? (
          <form onSubmit={handleSubmitCustom} className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customAnswer}
                onChange={(e) => setCustomAnswer(e.target.value)}
                placeholder="Type your custom answer here..."
                className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-100/50 dark:bg-surface-800 text-surface-800 dark:text-surface-200 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInput(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-surface-500 hover:bg-surface-150 dark:hover:bg-surface-800 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!customAnswer.trim()}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            {current.options?.map((option, idx) => {
              const isCustom = isCustomOption(option);
              const isSelected = answers[currentIndex] === option;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (isCustom) {
                      setShowInput(true);
                    } else {
                      handleSelectOption(option);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer group ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 font-semibold'
                      : 'border-surface-200 dark:border-surface-700/40 bg-surface-100/30 dark:bg-surface-800/40 text-surface-700 dark:text-surface-300 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-500/5 hover:text-primary-700 dark:hover:text-primary-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-mono ${
                      isSelected
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-200 dark:bg-surface-700 text-surface-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <span>{option}</span>
                  </div>
                  {isSelected ? (
                    <Check className="w-4 h-4 text-primary-500 animate-scale-up" />
                  ) : isCustom ? (
                    <PenLine className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:text-primary-500 transition-all" />
                  ) : (
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all text-primary-500 transform translate-x-[-4px] group-hover:translate-x-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {!showInput && (
          <div className="flex items-center justify-between pt-2 border-t border-surface-200/20 dark:border-surface-700/10">
            <button
              onClick={handleSkipQuestion}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors cursor-pointer"
            >
              Skip Question
            </button>
            {hasAnyAnswers && (
              <button
                onClick={() => submitAll(answers)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors cursor-pointer"
              >
                Submit Answers
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
