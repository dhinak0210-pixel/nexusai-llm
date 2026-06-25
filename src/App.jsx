import { useState, useEffect } from 'react';
import { useChat } from './hooks/useChat';
import { useTheme } from './hooks/useTheme';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import WelcomeScreen from './components/WelcomeScreen';
import SettingsModal from './components/SettingsModal';
import MemoryVaultModal from './components/MemoryVaultModal';
import ArtifactsPanel from './components/ArtifactsPanel';
import { extractArtifacts } from './utils/artifacts';
import ClarificationWizard from './components/ClarificationWizard';

export default function App() {
  const { isDark, toggleTheme } = useTheme();
  const {
    conversations,
    activeConversation,
    activeConversationId,
    isStreaming,
    apiKey,
    backendMode,
    serverUrl,
    systemPersona,
    updateSystemPersona,
    createConversation,
    deleteConversation,
    switchConversation,
    sendMessage,
    stopStreaming,
    updateApiKey,
    updateBackendMode,
    updateServerUrl,
    hfModel,
    updateHfModel,
    clearAllConversations,
    memories,
    addMemory,
    deleteMemory,
    clearMemories,
    activeModelName,
    proxyAvailable,
  } = useChat();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);

  // Artifact States
  const [activeArtifact, setActiveArtifact] = useState(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);

  // Clarification States
  const [dismissedClarifyId, setDismissedClarifyId] = useState(null);

  const hasMessages = activeConversation?.messages?.length > 0;
  // Disabled if: HF mode with no key AND no server proxy, OR local mode with no URL
  const isDisabled =
    (backendMode === 'huggingface' && !apiKey && !proxyAvailable) ||
    (backendMode === 'local' && !serverUrl && !proxyAvailable);

  const artifactsList = extractArtifacts(activeConversation?.messages);

  // Clear artifacts & clarifications when switching chat
  useEffect(() => {
    setActiveArtifact(null);
    setIsArtifactOpen(false);
    setDismissedClarifyId(null);
  }, [activeConversationId]);

  // Auto-open and select latest artifact when assistant streams a new one
  useEffect(() => {
    if (isStreaming && hasMessages) {
      const currentArtifacts = extractArtifacts(activeConversation.messages);
      if (currentArtifacts.length > 0) {
        const latest = currentArtifacts[currentArtifacts.length - 1];
        if (!activeArtifact || activeArtifact.id !== latest.id || activeArtifact.content !== latest.content) {
          setActiveArtifact(latest);
          setIsArtifactOpen(true);
        }
      }
    }
  }, [activeConversation?.messages, isStreaming]);

  // Parse clarifications from the last assistant message
  const lastMessage = hasMessages ? activeConversation.messages[activeConversation.messages.length - 1] : null;
  const isLastMessageAssistant = lastMessage && lastMessage.role === 'assistant';
  const userMessagesCount = activeConversation?.messages?.filter(m => m.role === 'user').length || 0;

  let clarifications = null;
  if (isLastMessageAssistant && lastMessage.content && !isStreaming && dismissedClarifyId !== lastMessage.id && userMessagesCount <= 1) {
    const match = lastMessage.content.match(/<clarify>([\s\S]*?)<\/clarify>/);
    if (match) {
      try {
        const data = JSON.parse(match[1].trim());
        if (Array.isArray(data)) {
          clarifications = data;
        }
      } catch {}
    }
  }

  return (
    <div className="h-screen flex bg-surface-50 dark:bg-surface-950 text-surface-800 dark:text-surface-200 overflow-hidden relative font-sans">
      {/* Decorative ambient lighting elements within a clipping viewport boundary */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary-500/5 dark:bg-primary-550/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-accent-500/5 dark:bg-accent-550/8 blur-[110px]" />
      </div>

      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={createConversation}
        onSelectChat={switchConversation}
        onDeleteChat={deleteConversation}
        onClearAll={clearAllConversations}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenSettings={() => {
          setSettingsOpen(true);
          setSidebarOpen(false);
        }}
        onOpenMemory={() => {
          setMemoryOpen(true);
          setSidebarOpen(false);
        }}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        <Header
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onOpenSidebar={() => setSidebarOpen(true)}
          backendMode={backendMode}
          modelName={activeModelName}
        />

        {/* Chat or Welcome */}
        {hasMessages ? (
          <ChatArea
            messages={activeConversation.messages}
            isStreaming={isStreaming}
            onSelectArtifact={(art) => {
              setActiveArtifact(art);
              setIsArtifactOpen(true);
            }}
            onRemember={addMemory}
          />
        ) : (
          <WelcomeScreen onSend={sendMessage} disabled={isDisabled} backendMode={backendMode} hfModel={hfModel} />
        )}

        {/* Clarification chips / option wizard */}
        {clarifications && (
          <ClarificationWizard
            clarifications={clarifications}
            onSelectOption={(option) => {
              sendMessage(option);
              setDismissedClarifyId(lastMessage.id);
            }}
            onClose={() => setDismissedClarifyId(lastMessage.id)}
          />
        )}

        {/* Input */}
        <ChatInput
          onSend={sendMessage}
          isStreaming={isStreaming}
          onStop={stopStreaming}
          disabled={isDisabled}
          backendMode={backendMode}
        />
      </main>

      {/* Artifacts Side Panel */}
      {isArtifactOpen && activeArtifact && (
        <ArtifactsPanel
          activeArtifact={activeArtifact}
          artifactsList={artifactsList}
          onSelectArtifact={setActiveArtifact}
          onClose={() => setIsArtifactOpen(false)}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        backendMode={backendMode}
        onSaveBackendMode={updateBackendMode}
        serverUrl={serverUrl}
        onSaveServerUrl={updateServerUrl}
        systemPersona={systemPersona}
        onSaveSystemPersona={updateSystemPersona}
        hfModel={hfModel}
        onSaveHfModel={updateHfModel}
        apiKey={apiKey}
        onSaveApiKey={updateApiKey}
      />

      {/* Memory Vault Modal */}
      <MemoryVaultModal
        isOpen={memoryOpen}
        onClose={() => setMemoryOpen(false)}
        memories={memories}
        onAddMemory={addMemory}
        onDeleteMemory={deleteMemory}
        onClearMemories={clearMemories}
      />
    </div>
  );
}
