import { useState, useEffect, useRef } from 'react';
import { X, Code, Play, Copy, Check, Download, ChevronRight, ChevronLeft, Terminal, Layout } from 'lucide-react';

export default function ArtifactsPanel({
  activeArtifact,
  artifactsList = [],
  onSelectArtifact,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'code'
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef(null);

  // Auto-switch to preview when artifact changes
  useEffect(() => {
    setActiveTab('preview');
  }, [activeArtifact?.id]);

  if (!activeArtifact) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeArtifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownload = () => {
    const ext = activeArtifact.type === 'svg' ? 'svg' : activeArtifact.type === 'javascript' ? 'js' : activeArtifact.type === 'python' ? 'py' : 'html';
    const blob = new Blob([activeArtifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeArtifact.title.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.' + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate srcdoc for iframe, injecting Tailwind CSS and React for live previews
  const getIframeSrcDoc = () => {
    if (activeArtifact.type === 'html') {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: transparent; color: inherit; }
              ::-webkit-scrollbar { width: 8px; height: 8px; }
              ::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.05); }
              ::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.15); border-radius: 4px; }
              ::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, 0.3); }
            </style>
          </head>
          <body class="bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-200">
            ${activeArtifact.content}
          </body>
        </html>
      `;
    }
    if (activeArtifact.type === 'react' || activeArtifact.type === 'javascript') {
      // Need to escape the content properly to inject it into a script tag
      const safeContent = activeArtifact.content.replace(/<\/script>/g, '<\\/script>');
      
      // Determine the component name to mount. Assume 'export default function App' or similar.
      // If we don't know, we try to mount whatever is default exported, or the last function defined.
      // For simplicity, we just inject Babel and tell it to render the component.
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <script src="https://cdn.tailwindcss.com"></script>
            <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            <script src="https://unpkg.com/lucide@latest"></script>
            <style>
              body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: transparent; color: inherit; }
              ::-webkit-scrollbar { width: 8px; height: 8px; }
              ::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.05); }
              ::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.15); border-radius: 4px; }
            </style>
          </head>
          <body class="bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100 min-h-screen">
            <div id="root"></div>
            <script type="text/babel" data-type="module">
              const { useState, useEffect, useRef, useMemo, useCallback } = React;
              
              // We need to simulate the environment for the component
              // Remove imports and exports
              let code = \`${safeContent}\`;
              code = code.replace(/import .* from .*;/g, '');
              code = code.replace(/export default /g, '');
              code = code.replace(/export /g, '');
              
              // Find the component name (e.g. 'function Login()', 'const Login = () =>')
              let componentName = "App";
              const funcMatch = code.match(/function\\s+([A-Z][a-zA-Z0-9]*)/);
              const constMatch = code.match(/const\\s+([A-Z][a-zA-Z0-9]*)\\s*=/);
              if (funcMatch) componentName = funcMatch[1];
              else if (constMatch) componentName = constMatch[1];
              
              // We append the render call
              code += \`\\n\\nconst root = ReactDOM.createRoot(document.getElementById('root'));\\nroot.render(<\${componentName} />);\\n\`;
              
              try {
                // Execute using Babel standalone
                const compiled = Babel.transform(code, { presets: ['react', 'env'] }).code;
                eval(compiled);
                
                // Initialize Lucide icons if any
                setTimeout(() => {
                  if (window.lucide) {
                    window.lucide.createIcons();
                  }
                }, 100);
              } catch (err) {
                document.getElementById('root').innerHTML = '<div class="text-red-500 p-4 font-mono text-sm border border-red-500/50 rounded bg-red-50/50 dark:bg-red-900/20"><strong>Compile Error:</strong><br/>' + err.message + '</div>';
              }
            </script>
          </body>
        </html>
      `;
    }
    return '';
  };

  return (
    <div className="w-[450px] lg:w-[550px] shrink-0 h-full border-l border-surface-200/50 dark:border-surface-800/60 bg-white/95 dark:bg-surface-900/95 backdrop-blur-md flex flex-col shadow-2xl relative animate-fade-in-right">
      
      {/* Header */}
      <div className="p-4 border-b border-surface-200/50 dark:border-surface-850/60 flex items-center justify-between gap-3 bg-surface-50/50 dark:bg-surface-950/20">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-500 uppercase tracking-wider mb-0.5">
            <Terminal className="w-3.5 h-3.5" />
            Artifact: {activeArtifact.type.toUpperCase()}
          </div>
          <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-100 truncate">
            {activeArtifact.title}
          </h2>
        </div>

        {/* Artifact Selector Dropdown */}
        {artifactsList.length > 1 && (
          <select
            value={activeArtifact.id}
            onChange={(e) => {
              const selected = artifactsList.find(art => art.id === e.target.value);
              if (selected) onSelectArtifact(selected);
            }}
            className="px-2.5 py-1 text-xs rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer max-w-[140px] truncate"
          >
            {artifactsList.map((art) => (
              <option key={art.id} value={art.id}>
                {art.title}
              </option>
            ))}
          </select>
        )}

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors cursor-pointer"
        >
          <X className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="px-4 py-1.5 border-b border-surface-200/50 dark:border-surface-850/60 flex justify-between items-center bg-surface-50/20 dark:bg-surface-950/10">
        <div className="flex gap-2">
          {/* Only show preview for HTML, SVG, React, or JS files */}
          {['html', 'svg', 'react', 'javascript'].includes(activeArtifact.type) && (
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                  : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              Preview
            </button>
          )}

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'code' || !['html', 'svg', 'react', 'javascript'].includes(activeArtifact.type)
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Code
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            title="Copy Code"
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownload}
            title="Download File"
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 bg-surface-50 dark:bg-surface-950 overflow-hidden relative">
        
        {/* Preview Tab Content */}
        {activeTab === 'preview' && ['html', 'svg', 'react', 'javascript'].includes(activeArtifact.type) ? (
          <div className="w-full h-full p-2 bg-white dark:bg-surface-900 overflow-auto flex items-center justify-center">
            {activeArtifact.type === 'svg' ? (
              <div 
                className="w-full max-h-full flex items-center justify-center p-4 svg-artifact-container"
                dangerouslySetInnerHTML={{ __html: activeArtifact.content }}
              />
            ) : (
              <iframe
                ref={iframeRef}
                title={activeArtifact.title}
                srcDoc={getIframeSrcDoc()}
                sandbox="allow-scripts"
                className="w-full h-full border-0 rounded-lg bg-white dark:bg-surface-900"
              />
            )}
          </div>
        ) : (
          /* Code Tab Content */
          <div className="w-full h-full overflow-auto p-4 font-mono text-xs leading-relaxed text-surface-700 dark:text-surface-300 select-text">
            <pre className="whitespace-pre-wrap break-all bg-surface-100 dark:bg-surface-900 p-4 rounded-xl border border-surface-200/50 dark:border-surface-800/40 relative">
              <code>{activeArtifact.content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
