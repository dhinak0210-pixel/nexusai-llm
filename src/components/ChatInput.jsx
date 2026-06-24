import { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, Globe, FileText, X } from 'lucide-react';

const loadPdfJs = () => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    };
    script.onerror = (e) => reject(new Error('Failed to load PDF.js script: ' + e.message));
    document.head.appendChild(script);
  });
};

export default function ChatInput({ onSend, isStreaming, onStop, disabled, backendMode }) {
  const [input, setInput] = useState('');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const targetHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${targetHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > 200 ? 'auto' : 'hidden';
    }
  }, [input]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target.result;
            const pdfjsLib = await loadPdfJs();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map(item => item.str).join(' ');
              fullText += pageText + '\n';
            }
            if (!fullText.trim()) {
              throw new Error('Parsed PDF text was empty');
            }
            setAttachments((prev) => [
              ...prev,
              {
                id: Math.random().toString(36).substr(2, 9),
                name: file.name,
                size: file.size,
                type: file.type,
                content: fullText.trim(),
                isParsedPdf: true,
              },
            ]);
          } catch (err) {
            console.error('Error parsing PDF, falling back to base64:', err);
            const fallbackReader = new FileReader();
            fallbackReader.onload = (e) => {
              setAttachments((prev) => [
                ...prev,
                {
                  id: Math.random().toString(36).substr(2, 9),
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  content: e.target.result,
                },
              ]);
            };
            fallbackReader.readAsDataURL(file);
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (file.type.startsWith('text/') || file.name.endsWith('.js') || file.name.endsWith('.jsx') || file.name.endsWith('.py') || file.name.endsWith('.json') || file.name.endsWith('.css') || file.name.endsWith('.html') || file.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setAttachments((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              size: file.size,
              type: file.type,
              content: event.target.result,
            },
          ]);
        };
        reader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          setAttachments((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              size: file.size,
              type: file.type,
              content: event.target.result,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isStreaming || disabled) return;

    let textPrompt = input;
    if (isSearchEnabled) {
      textPrompt = `[Web Search Active] ${textPrompt}`;
    }

    onSend(textPrompt, attachments);
    setInput('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const placeholderText = disabled
    ? backendMode === 'local'
      ? 'Configure your server URL in Settings...'
      : 'Enter your API key in Settings to start chatting...'
    : 'Message NexusAI...';

  const footerText = backendMode === 'local'
    ? 'NexusAI uses your self-hosted model. Responses may vary.'
    : 'NexusAI uses DeepSeek V3 via HuggingFace. Responses may be inaccurate.';

  return (
    <div className="border-t border-surface-200/20 dark:border-surface-800/20 bg-white/30 dark:bg-surface-950/30 glass safe-bottom">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <form onSubmit={handleSubmit} className="relative space-y-2">
          {/* File Attachments Preview Row */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 animate-fade-in-up pb-1">
              {attachments.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-250/40 dark:border-surface-800/60 bg-white/60 dark:bg-surface-900/60 text-xs font-medium text-surface-700 dark:text-surface-300 shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5 opacity-70 text-primary-500" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(file.id)}
                    className="p-0.5 rounded-md hover:bg-surface-200/60 dark:hover:bg-surface-800 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Bar Layout */}
          <div
            className={`flex items-end gap-2.5 rounded-2xl border transition-all duration-300 luxury-card
            ${disabled
              ? 'border-surface-200/50 dark:border-surface-800/50 opacity-50'
              : 'border-surface-250/60 dark:border-surface-800/50 focus-within:border-primary-500/50 focus-within:shadow-[0_0_30px_-5px_rgba(139,92,246,0.12)] dark:focus-within:shadow-[0_0_30px_-5px_rgba(139,92,246,0.2)]'
            } bg-white/70 dark:bg-surface-900/40 px-3.5 py-2.5`}
          >
            {/* Attachment Button */}
            <button
              type="button"
              disabled={disabled || isStreaming}
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 p-2 rounded-xl text-surface-450 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800/60 transition-all cursor-pointer"
              title="Attach files (PDF, JS, PY, JSON, TXT)"
            >
              <Paperclip className="w-4.5 h-4.5" />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
              accept=".txt,.js,.jsx,.ts,.tsx,.json,.py,.html,.css,.md,.pdf"
            />

            {/* Web Search Toggle Button */}
            <button
              type="button"
              disabled={disabled || isStreaming}
              onClick={() => setIsSearchEnabled(!isSearchEnabled)}
              className={`shrink-0 p-2 rounded-xl transition-all duration-350 cursor-pointer ${
                isSearchEnabled
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/20'
                  : 'text-surface-450 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800/60 border border-transparent'
              }`}
              title="Toggle Web Search Grounding (Grok Mode)"
            >
              <Globe className="w-4.5 h-4.5" />
            </button>

            {/* Textarea Input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholderText}
              disabled={disabled || isStreaming}
              rows={1}
              className="flex-1 bg-transparent text-sm text-surface-850 dark:text-surface-100 placeholder-surface-400 dark:placeholder-surface-500 resize-none py-1.5 leading-relaxed max-h-[200px] focus:outline-none"
            />

            {/* Submit / Stop Buttons */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="shrink-0 p-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-red-500/15 cursor-pointer"
                title="Stop generating"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || disabled}
                className={`shrink-0 p-2.5 rounded-xl transition-all duration-300 cursor-pointer
                  ${(input.trim() || attachments.length > 0) && !disabled
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 hover:scale-105 active:scale-95'
                    : 'bg-surface-200 dark:bg-surface-800 text-surface-400 dark:text-surface-600 cursor-not-allowed'
                  }`}
                title="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
        <p className="text-center text-[10px] tracking-wide font-medium text-surface-400 dark:text-surface-500 mt-2.5">{footerText}</p>
      </div>
    </div>
  );
}
