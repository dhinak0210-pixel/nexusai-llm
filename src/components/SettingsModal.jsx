import { useState } from 'react';
import { X, Server, Cloud, ShieldAlert, Cpu, Sparkles, Key, Check } from 'lucide-react';
import ModelPicker from './ModelPicker';

export default function SettingsModal({
  isOpen,
  onClose,
  backendMode,
  onSaveBackendMode,
  serverUrl,
  onSaveServerUrl,
  systemPersona,
  onSaveSystemPersona,
  hfModel,
  onSaveHfModel,
  apiKey,
  onSaveApiKey,
}) {
  const [activeTab, setActiveTab] = useState('general');
  const [urlInput, setUrlInput] = useState(serverUrl || 'http://localhost:8000');
  const [keyInput, setKeyInput] = useState(apiKey || '');
  const [personaInput, setPersonaInput] = useState(systemPersona || 'nexus');
  const [modeInput, setModeInput] = useState(backendMode || 'huggingface');
  const [hfModelInput, setHfModelInput] = useState(hfModel || 'deepseek-ai/DeepSeek-V3');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveServerUrl(urlInput);
    onSaveApiKey(keyInput);
    onSaveSystemPersona(personaInput);
    onSaveBackendMode(modeInput);
    onSaveHfModel(hfModelInput);
    onClose();
  };

  const PERSONAS = [
    { id: 'nexus', name: 'NexusAI (Default)', desc: 'General-purpose balanced helpful assistant' },
    { id: 'claude_persona', name: 'Claude Style', desc: 'Detailed paragraphs, warm and concise tone' },
    { id: 'chatgpt_persona', name: 'ChatGPT Style', desc: 'Direct, highly-structured bulleted answers' },
    { id: 'gemini_persona', name: 'Gemini Style', desc: 'Comprehensive, balanced and logical outlines' },
    { id: 'grok_persona', name: 'Grok Style', desc: 'Witty, rebellious and slightly humorous' },
  ];

  const CLOUD_MODELS = [
    { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1 🧠' },
    { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3 ⚡' },
    { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B 🦙' },
    { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen 2.5 Coder 💻' },
    { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen 2.5 7B 🚀' },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl rounded-3xl bg-white dark:bg-surface-900 border border-surface-200/50 dark:border-surface-800/40 shadow-2xl animate-fade-in-up overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-200/40 dark:border-surface-800/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5.5 h-5.5 text-primary-500" />
            <h3 className="text-xl font-bold text-surface-850 dark:text-surface-50 font-sans tracking-tight">System Settings</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-all cursor-pointer">
            <X className="w-5 h-5 text-surface-450 dark:text-surface-400" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-6 border-b border-surface-200/30 dark:border-surface-800/30 bg-surface-50/50 dark:bg-surface-950/20 text-sm">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-surface-450 dark:text-surface-400 hover:text-surface-700'
            }`}
          >
            General & Persona
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`px-4 py-3 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'cloud'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-surface-450 dark:text-surface-400 hover:text-surface-700'
            }`}
          >
            Cloud Inference (HF)
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`px-4 py-3 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'local'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-surface-450 dark:text-surface-400 hover:text-surface-700'
            }`}
          >
            Local Server & weights
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 max-h-[55vh]">
          {activeTab === 'general' && (
            <div className="space-y-5">
              {/* Backend Mode Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-surface-450 dark:text-surface-400 flex items-center gap-1.5">
                  🔌 Backend Engine Routing
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModeInput('huggingface')}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      modeInput === 'huggingface'
                        ? 'border-primary-500 bg-primary-500/5 dark:bg-primary-550/10'
                        : 'border-surface-200 dark:border-surface-800 bg-transparent'
                    }`}
                  >
                    <Cloud className={`w-5 h-5 shrink-0 ${modeInput === 'huggingface' ? 'text-primary-500' : 'text-surface-400'}`} />
                    <div>
                      <h4 className="text-sm font-semibold">Cloud Inference</h4>
                      <p className="text-[10px] text-surface-400 mt-0.5">Free high-tier models via Hugging Face</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModeInput('local')}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      modeInput === 'local'
                        ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                        : 'border-surface-200 dark:border-surface-800 bg-transparent'
                    }`}
                  >
                    <Server className={`w-5 h-5 shrink-0 ${modeInput === 'local' ? 'text-emerald-500' : 'text-surface-400'}`} />
                    <div>
                      <h4 className="text-sm font-semibold">Local Runner</h4>
                      <p className="text-[10px] text-surface-400 mt-0.5">Run fine-tuned adapter weights offline</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* System Persona Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-surface-450 dark:text-surface-400 flex items-center gap-1.5">
                  🤖 Assistant Persona Style
                </label>
                <div className="space-y-2">
                  {PERSONAS.map((p) => {
                    const isSelected = personaInput === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPersonaInput(p.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-primary-550 bg-primary-500/5 dark:bg-primary-550/5 text-primary-600 dark:text-primary-400'
                            : 'border-surface-200/70 dark:border-surface-800/60 bg-transparent hover:bg-surface-50 dark:hover:bg-surface-950/20'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <h5 className="text-xs font-semibold">{p.name}</h5>
                          <p className="text-[10px] text-surface-400 dark:text-surface-500 truncate mt-0.5">{p.desc}</p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary-550 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="space-y-5">
              {/* Cloud API Key */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-surface-450 dark:text-surface-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-primary-500" /> Hugging Face API Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="hf_..."
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-surface-200 dark:border-surface-800 bg-transparent text-surface-800 dark:text-surface-250 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-mono"
                  />
                  <a
                    href="https://huggingface.co/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-surface-200 dark:border-surface-800 hover:border-primary-500/35 hover:text-primary-500 dark:hover:border-primary-500/30 dark:hover:text-primary-400 bg-surface-50/50 dark:bg-surface-950/20 text-surface-500 dark:text-surface-400 flex items-center gap-1 transition-all shrink-0 hover:bg-white dark:hover:bg-surface-900 cursor-pointer"
                  >
                    Get Token ↗
                  </a>
                </div>
                <p className="text-[10px] text-surface-400 dark:text-surface-500 leading-normal">
                  By default, the server environment key is used. Input your personal Hugging Face Token here if you run out of monthly API limits.
                </p>
              </div>

              {/* Cloud model dropdown selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-surface-450 dark:text-surface-400 flex items-center gap-1.5">
                  📦 Default Cloud Model
                </label>
                <select
                  value={hfModelInput}
                  onChange={(e) => setHfModelInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-surface-200 dark:border-surface-800 bg-transparent text-surface-800 dark:text-surface-250 focus:outline-none focus:border-primary-500 transition-all"
                >
                  {CLOUD_MODELS.map(m => (
                    <option key={m.id} value={m.id} className="dark:bg-surface-900 text-surface-800 dark:text-surface-200">
                      {m.name} ({m.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'local' && (
            <div className="space-y-5">
              {/* Local server URL */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-surface-450 dark:text-surface-400 flex items-center gap-1.5">
                  🔗 Local Server URL
                </label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="http://localhost:8000"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-surface-200 dark:border-surface-800 bg-transparent text-surface-800 dark:text-surface-250 focus:outline-none focus:border-primary-500 transition-all"
                />
                <p className="text-[10px] text-surface-400">
                  Address of your active local FastAPI server. Use http://localhost:8000 or your custom ngrok URL.
                </p>
              </div>

              {/* Local model manager */}
              <div className="border-t border-surface-150 dark:border-surface-800/40 pt-5">
                <ModelPicker serverUrl={urlInput} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2.5 p-6 border-t border-surface-200/40 dark:border-surface-800/40 bg-surface-50/20 dark:bg-surface-950/10">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
