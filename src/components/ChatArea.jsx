import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, Copy, Check, RotateCcw, Play, Code, Brain } from 'lucide-react';
import { useState } from 'react';

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-1 py-1">
      <div className="typing-dot text-primary-500" />
      <div className="typing-dot text-primary-500" />
      <div className="typing-dot text-primary-500" />
    </div>
  );
}

function parseThought(content) {
  if (!content) return { thought: '', main: '' };

  const cleanContent = content.replace(/<clarify>[\s\S]*?<\/clarify>/g, '').trim();

  const thoughtStart = cleanContent.indexOf('<thought>');
  if (thoughtStart === -1) {
    const thinkingStart = cleanContent.indexOf('Thinking Process:');
    if (thinkingStart !== -1) {
      return {
        thought: cleanContent.slice(thinkingStart + 17),
        main: cleanContent.slice(0, thinkingStart),
        isThoughtStreaming: true
      };
    }
    return { thought: '', main: cleanContent, isThoughtStreaming: false };
  }

  const thoughtEnd = cleanContent.indexOf('</thought>');
  if (thoughtEnd === -1) {
    return {
      thought: cleanContent.slice(thoughtStart + 9),
      main: cleanContent.slice(0, thoughtStart),
      isThoughtStreaming: true
    };
  }

  return {
    thought: cleanContent.slice(thoughtStart + 9, thoughtEnd),
    main: cleanContent.slice(0, thoughtStart) + cleanContent.slice(thoughtEnd + 10),
    isThoughtStreaming: false
  };
}

function ThoughtProcess({ thought, isStreaming }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!thought) return null;

  return (
    <div className="mb-3 rounded-xl border border-surface-200/60 dark:border-surface-700/40 bg-surface-50/50 dark:bg-surface-900/30 overflow-hidden font-sans shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2 bg-surface-100/40 dark:bg-surface-850/20 text-[11px] font-semibold text-surface-600 dark:text-surface-400 select-none cursor-pointer border-b border-surface-200/30 dark:border-surface-700/20"
      >
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <span className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <Brain className="w-3.5 h-3.5 text-purple-500 shrink-0" />
          )}
          <span>Thought Process</span>
        </div>
        <span className="text-[10px] opacity-75">{isOpen ? 'Collapse' : 'Expand'}</span>
      </button>
      {isOpen && (
        <div className="p-3 text-[11px] text-surface-500 dark:text-surface-400 italic whitespace-pre-wrap leading-relaxed bg-surface-100/5 dark:bg-surface-850/5 font-mono max-h-[200px] overflow-y-auto select-text border-t border-surface-200/20 dark:border-surface-700/10">
          {thought}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, isDark, onSelectArtifact, onRemember }) {
  const [copied, setCopied] = useState(false);
  const [remembered, setRemembered] = useState(false);
  const isUser = message.role === 'user';
  const isError = message.isError;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleRemember = () => {
    if (!onRemember) return;
    onRemember(message.content);
    setRemembered(true);
    setTimeout(() => setRemembered(false), 2000);
  };

  const { thought, main, isThoughtStreaming } = parseThought(message.content);

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const { main: textContent } = parseThought(message.content);
      const cleanText = textContent
        .replace(/\[Download Edited PDF\]\(blob:pdf_download_placeholder\)/g, '')
        .trim();
        
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const maxLineWidth = pageWidth - (margin * 2);
      const lines = doc.splitTextToSize(cleanText, maxLineWidth);
      
      let y = margin;
      const pageHeight = doc.internal.pageSize.getHeight();
      const lineHeight = 7;
      
      lines.forEach((line) => {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });
      
      doc.save('Edited_Document.pdf');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    }
  };

  const handleDownloadPPT = () => {
    const { main: textContent } = parseThought(message.content);
    const htmlMatch = textContent.match(/```html\s*([\s\S]*?)\s*```/);
    let downloadContent = '';
    let fileName = 'Presentation.html';
    let mimeType = 'text/html;charset=utf-8';
    
    if (htmlMatch && htmlMatch[1]) {
      downloadContent = htmlMatch[1];
    } else {
      fileName = 'Presentation_Outline.txt';
      mimeType = 'text/plain;charset=utf-8';
      downloadContent = textContent
        .replace(/\[Download Presentation\]\(blob:ppt_download_placeholder\)/g, '')
        .trim();
    }
    
    const blob = new Blob([downloadContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={`flex gap-3.5 animate-fade-in-up ${
        isUser ? 'justify-end' : 'justify-start'
      } pb-6`}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="shrink-0 mt-0.5">
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/10">
            <Bot className="w-4.5 h-4.5 text-white animate-float" />
          </div>
        </div>
      )}

      {/* Message Content */}
      {/* Message Content Container */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%] group`}>
        <div
          className={`relative w-full ${
            isUser
              ? 'bg-gradient-to-br from-primary-600 to-primary-500 text-white rounded-2xl rounded-tr-md px-4.5 py-3.5 shadow-xl shadow-primary-500/10'
              : `rounded-2xl rounded-tl-md px-5 py-4 ${
                  isError
                    ? 'bg-red-500/5 text-red-700 dark:text-red-300 border border-red-500/20 shadow-md shadow-red-500/5'
                    : 'bg-white/50 dark:bg-surface-900/30 text-surface-850 dark:text-surface-200 border border-surface-200/30 dark:border-surface-800/40 backdrop-blur-md shadow-sm'
                }`
          }`}
        >
          {isUser ? (
            <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap font-medium">
              {message.content}
            </p>
          ) : (message.content || message.isStreaming) ? (
            <div className="markdown-content text-[13.5px] space-y-3">
              <ThoughtProcess thought={thought} isStreaming={isThoughtStreaming} />
              {main ? (
                <ReactMarkdown
                  components={{
                    a({ node, href, children, ...props }) {
                      if (href === 'blob:pdf_download_placeholder') {
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDownloadPDF();
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 my-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-550/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border-none"
                          >
                            {children}
                          </button>
                        );
                      }
                      if (href === 'blob:ppt_download_placeholder') {
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDownloadPPT();
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 my-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg shadow-indigo-550/10 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border-none"
                          >
                            {children}
                          </button>
                        );
                      }
                      return <a href={href} className="text-primary-500 hover:underline" {...props}>{children}</a>;
                    },
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const lang = match ? match[1] : '';
                      const codeString = String(children).replace(/\n$/, '');

                      const isArtifact = !inline && ['html', 'svg', 'react', 'javascript', 'python', 'css', 'json', 'mermaid'].includes(lang);

                      if (isArtifact) {
                        return (
                          <div className="my-4 overflow-hidden rounded-2xl border border-surface-200/40 dark:border-surface-800/40 bg-white/40 dark:bg-surface-900/40 shadow-md font-sans">
                            <div className="flex items-center justify-between px-4.5 py-3.5 bg-surface-50/40 dark:bg-surface-850/40 border-b border-surface-200/30 dark:border-surface-800/30">
                              <div className="flex items-center gap-2.5">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-450 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                                </span>
                                <span className="text-xs font-bold tracking-wide text-surface-700 dark:text-surface-300">
                                  {lang.toUpperCase()} Component
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  onSelectArtifact({
                                    id: `${message.id}-${lang}`,
                                    title: `${lang.toUpperCase()} Artifact`,
                                    type: lang,
                                    content: codeString
                                  });
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/10 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                Open Preview
                              </button>
                            </div>
                            <div className="p-3.5 bg-surface-100/5 dark:bg-surface-950/20 font-mono text-[11px] text-surface-500 dark:text-surface-455 truncate max-w-full">
                              {codeString.slice(0, 80)}...
                            </div>
                          </div>
                        );
                      }

                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {main}
                </ReactMarkdown>
              ) : message.isStreaming && !thought ? (
                <TypingIndicator />
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Copy/Remember actions for AI messages */}
        {!isUser && message.content && !message.isStreaming && (
          <div className="flex items-center gap-1 mt-2.5 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold uppercase tracking-wider
                text-surface-500 hover:text-surface-800 dark:text-surface-450 dark:hover:text-surface-200
                hover:bg-surface-150 dark:hover:bg-surface-900/60 transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
            {onRemember && (
              <button
                onClick={handleRemember}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold uppercase tracking-wider
                  text-surface-500 hover:text-surface-800 dark:text-surface-450 dark:hover:text-surface-200
                  hover:bg-surface-150 dark:hover:bg-surface-900/60 transition-all cursor-pointer"
              >
                <Brain className="w-3 h-3 text-purple-500" />
                <span>{remembered ? 'Saved!' : 'Remember'}</span>
              </button>
            )}
          </div>
        )}

        {/* Remember action for User messages */}
        {isUser && message.content && onRemember && (
          <div className="flex items-center gap-1 mt-2.5 mr-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleRemember}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold uppercase tracking-wider
                text-surface-550 hover:text-surface-800 dark:text-surface-450 dark:hover:text-surface-200
                hover:bg-surface-150 dark:hover:bg-surface-900/60 transition-all cursor-pointer"
            >
              <Brain className="w-3 h-3 text-purple-500" />
              <span>{remembered ? 'Saved!' : 'Remember'}</span>
            </button>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="shrink-0 mt-0.5">
          <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-surface-700 to-surface-800 dark:from-surface-600 dark:to-surface-700 flex items-center justify-center shadow-lg shadow-black/10">
            <User className="w-4.5 h-4.5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatArea({ messages, isStreaming, onSelectArtifact, onRemember }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!messages || messages.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} onSelectArtifact={onSelectArtifact} onRemember={onRemember} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
