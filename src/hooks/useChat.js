import { useState, useCallback, useRef, useEffect } from 'react';
import { streamChatCompletion, detectMode } from '../utils/huggingface';

/**
 * Generate a unique ID for messages and conversations
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/**
 * Custom hook for managing chat state, conversations, and streaming
 */
export function useChat() {
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus-conversations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeConversationId, setActiveConversationId] = useState(() => {
    try {
      return localStorage.getItem('nexus-active-conversation') || null;
    } catch {
      return null;
    }
  });

  const [isStreaming, setIsStreaming] = useState(false);

  const [apiKey, setApiKey] = useState(() => {
    try {
      return import.meta.env.VITE_HF_API_KEY || localStorage.getItem('nexus-hf-api-key') || '';
    } catch {
      return '';
    }
  });

  // Whether the server-side HF proxy is available (deployed Space with HF_TOKEN)
  const [proxyAvailable, setProxyAvailable] = useState(false);

  // Local server URL
  const [serverUrl, setServerUrl] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus-server-url');
      const isLocalHost = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      
      if (saved) {
        if (!isLocalHost && (saved.includes('localhost') || saved.includes('127.0.0.1'))) {
          return window.location.origin;
        }
        return saved;
      }
      
      if (!isLocalHost && typeof window !== 'undefined') {
        return window.location.origin;
      }
      return 'http://localhost:8000';
    } catch {
      return 'http://localhost:8000';
    }
  });

  // Check backend server config (device, hf token proxy availability) whenever serverUrl changes
  useEffect(() => {
    if (!serverUrl) {
      setProxyAvailable(false);
      return;
    }
    const configUrl = serverUrl.replace(/\/+$/, '') + '/v1/config';
    fetch(configUrl, { signal: AbortSignal.timeout(5000) })
      .then(res => res.json())
      .then(data => {
        if (data && data.hf_token_available) {
          setProxyAvailable(true);
        } else {
          setProxyAvailable(false);
        }
      })
      .catch(() => {
        setProxyAvailable(false);
      });
  }, [serverUrl]);

  // Backend mode: local or huggingface (cloud)
  const [backendMode, setBackendMode] = useState(() => {
    try {
      return localStorage.getItem('nexus-backend-mode') || 'huggingface';
    } catch {
      return 'huggingface';
    }
  });

  const [localModelName, setLocalModelName] = useState('Local LLM');

  // Fetch active local model name from the server
  const syncLocalModelName = useCallback(async () => {
    try {
      const url = serverUrl.replace(/\/+$/, '') + '/v1/models';
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        const activeModel = data.data?.find(m => m.loaded);
        if (activeModel) {
          setLocalModelName(activeModel.name);
        }
      }
    } catch {
      // Retain the current name on network/timeout errors
    }
  }, [serverUrl]);

  useEffect(() => {
    if (backendMode === 'local') {
      syncLocalModelName();
      const interval = setInterval(syncLocalModelName, 4000);
      return () => clearInterval(interval);
    }
  }, [backendMode, syncLocalModelName]);

  // System Persona (Default/Claude)
  const [systemPersona, setSystemPersona] = useState(() => {
    try {
      return localStorage.getItem('nexus-system-persona') || 'nexus';
    } catch {
      return 'nexus';
    }
  });

  // HuggingFace Model ID
  const [hfModel, setHfModel] = useState(() => {
    try {
      return localStorage.getItem('nexus-hf-model') || 'deepseek-ai/DeepSeek-V3';
    } catch {
      return 'deepseek-ai/DeepSeek-V3';
    }
  });



  // Persistent Memories
  const [memories, setMemories] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus-memories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveMemories = useCallback((mems) => {
    try {
      localStorage.setItem('nexus-memories', JSON.stringify(mems));
    } catch {}
  }, []);

  const addMemory = useCallback((content) => {
    if (!content.trim()) return;
    setMemories((prev) => {
      const updated = [{ id: generateId(), content: content.trim(), createdAt: Date.now() }, ...prev];
      saveMemories(updated);
      return updated;
    });
  }, [saveMemories]);

  const deleteMemory = useCallback((id) => {
    setMemories((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      saveMemories(updated);
      return updated;
    });
  }, [saveMemories]);

  const clearMemories = useCallback(() => {
    setMemories([]);
    saveMemories([]);
  }, [saveMemories]);

  const abortControllerRef = useRef(null);

  // Save conversations to localStorage
  const saveConversations = useCallback((convs) => {
    try {
      localStorage.setItem('nexus-conversations', JSON.stringify(convs));
    } catch {
      // localStorage might be full
    }
  }, []);

  // Get active conversation
  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  // Create a new conversation
  const createConversation = useCallback(() => {
    const newConv = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => {
      const updated = [newConv, ...prev];
      saveConversations(updated);
      return updated;
    });
    setActiveConversationId(newConv.id);
    localStorage.setItem('nexus-active-conversation', newConv.id);
    return newConv.id;
  }, [saveConversations]);

  // Delete a conversation
  const deleteConversation = useCallback(
    (id) => {
      setConversations((prev) => {
        const updated = prev.filter((c) => c.id !== id);
        saveConversations(updated);
        if (activeConversationId === id) {
          const nextId = updated.length > 0 ? updated[0].id : null;
          setActiveConversationId(nextId);
          localStorage.setItem('nexus-active-conversation', nextId || '');
        }
        return updated;
      });
    },
    [activeConversationId, saveConversations]
  );

  // Switch to a conversation
  const switchConversation = useCallback((id) => {
    setActiveConversationId(id);
    localStorage.setItem('nexus-active-conversation', id);
  }, []);

  // Update API key
  const updateApiKey = useCallback((key) => {
    setApiKey(key);
    localStorage.setItem('nexus-hf-api-key', key);
  }, []);

  // Update backend mode
  const updateBackendMode = useCallback((mode) => {
    setBackendMode(mode);
    localStorage.setItem('nexus-backend-mode', mode);
  }, []);

  // Update server URL
  const updateServerUrl = useCallback((url) => {
    setServerUrl(url);
    localStorage.setItem('nexus-server-url', url);
  }, []);

  // Update system persona
  const updateSystemPersona = useCallback((persona) => {
    setSystemPersona(persona);
    localStorage.setItem('nexus-system-persona', persona);
  }, []);

  // Update HuggingFace Model ID
  const updateHfModel = useCallback((model) => {
    setHfModel(model);
    localStorage.setItem('nexus-hf-model', model);
  }, []);


  const sendMessage = useCallback(
    async (content, attachments = []) => {
      if (!content.trim() || isStreaming) return;

      let currentConvId = activeConversationId;

      // Create a new conversation if none is active
      if (!currentConvId) {
        const newConv = {
          id: generateId(),
          title: 'New Chat',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        currentConvId = newConv.id;
        setConversations((prev) => {
          const updated = [newConv, ...prev];
          saveConversations(updated);
          return updated;
        });
        setActiveConversationId(currentConvId);
        localStorage.setItem('nexus-active-conversation', currentConvId);
      }

      let displayContent = content;
      let apiContent = content;

      if (attachments && attachments.length > 0) {
        const attachmentNames = attachments.map(a => `[File Attachment: ${a.name}]`).join('\n');
        displayContent = `${attachmentNames}\n\n${content}`;

        const fileDataBlock = attachments
          .map((a) => `[File Attachment: ${a.name}]\n\`\`\`\n${a.content}\n\`\`\``)
          .join('\n\n');
        apiContent = `${fileDataBlock}\n\n${content}`;
      }

      const userMessage = {
        id: generateId(),
        role: 'user',
        content: displayContent.trim(),
        apiContent: apiContent.trim(),
        timestamp: Date.now(),
      };

      const assistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      // Add user message and empty assistant placeholder
      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c.id === currentConvId) {
            const title =
              c.messages.length === 0
                ? content.trim().slice(0, 40) + (content.length > 40 ? '...' : '')
                : c.title;
            return {
              ...c,
              title,
              messages: [...c.messages, userMessage, assistantMessage],
              updatedAt: Date.now(),
            };
          }
          return c;
        });
        saveConversations(updated);
        return updated;
      });

      setIsStreaming(true);

      // Prepare messages for the API (only role + content)
      const apiMessages = [];
      setConversations((prev) => {
        const conv = prev.find((c) => c.id === currentConvId);
        if (conv) {
          conv.messages.forEach((m) => {
            if (m.role === 'user' || (m.role === 'assistant' && m.content)) {
              apiMessages.push({ role: m.role, content: m.apiContent || m.content });
            }
          });
        }
        return prev;
      });

      if (apiMessages.length === 0) {
        apiMessages.push({ role: 'user', content: apiContent.trim() });
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      await streamChatCompletion({
        backend: backendMode,
        messages: apiMessages,
        apiKey,
        serverUrl,
        systemPersona,
        memories,
        hfModel,
        signal: abortController.signal,
        onToken: (token) => {
          setConversations((prev) => {
            const updated = prev.map((c) => {
              if (c.id === currentConvId) {
                const msgs = [...c.messages];
                const lastMsg = msgs[msgs.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  msgs[msgs.length - 1] = {
                    ...lastMsg,
                    content: lastMsg.content + token,
                  };
                }
                return { ...c, messages: msgs };
              }
              return c;
            });
            return updated;
          });
        },
        onDone: () => {
          setIsStreaming(false);
          abortControllerRef.current = null;
          setConversations((prev) => {
            const updated = prev.map((c) => {
              if (c.id === currentConvId) {
                const msgs = c.messages.map((m) => {
                  if (m.role === 'assistant') {
                    let finalContent = m.content;
                    const dMode = detectMode(content);
                    
                    if (dMode === 'image') {
                      const promptSubject = content
                        .replace(/\b(create|generate|draw|paint|show|make|render)\b/gi, '')
                        .replace(/\b(image|picture|photo|illustration|drawing|portrait|sketch|graphic|wallpaper|cat|dog|animal)\b/gi, '')
                        .replace(/\b(of|a|an)\b/gi, '')
                        .trim();
                      
                      const queryParam = encodeURIComponent(promptSubject || content.trim());
                      const pollinationsUrl = `https://image.pollinations.ai/prompt/${queryParam}`;
                      
                      const imgRegex = /!\[.*?\]\((.*?)\)/g;
                      const hasImage = imgRegex.test(finalContent);
                      if (!hasImage || !finalContent.includes('image.pollinations.ai')) {
                        finalContent = finalContent.replace(/!\[.*?\]\((.*?)\)/g, '').trim();
                        finalContent = `Here is the generated image for you:\n\n![Generated Image](${pollinationsUrl})`;
                      }
                    } else if (dMode === 'pdf') {
                      if (!finalContent.includes('pdf_download_placeholder') && !finalContent.includes('Download')) {
                        finalContent += `\n\n[Download Edited PDF](blob:pdf_download_placeholder)`;
                      }
                    } else if (dMode === 'ppt') {
                      if (!finalContent.includes('ppt_download_placeholder') && !finalContent.includes('Download')) {
                        finalContent += `\n\n[Download Presentation](blob:ppt_download_placeholder)`;
                      }
                    } else if (dMode === 'code') {
                      const hasHtmlBlock = finalContent.includes('```html');
                      if (hasHtmlBlock && !finalContent.includes('/preview/')) {
                        const slug = content
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)/g, '')
                          .slice(0, 30) || 'temp-site';
                        finalContent = `[View Built Site](${window.location.origin}/preview/${slug})\n\n` + finalContent;
                      }
                    }
                    
                    return { ...m, content: finalContent, isStreaming: false };
                  }
                  return { ...m, isStreaming: false };
                });
                return { ...c, messages: msgs, updatedAt: Date.now() };
              }
              return c;
            });
            saveConversations(updated);
            return updated;
          });
        },
        onError: (error) => {
          setIsStreaming(false);
          abortControllerRef.current = null;
          
          const isQuotaError = error.message.includes('402') || error.message.includes('depleted') || error.message.includes('429');
          
          if (isQuotaError && backendMode === 'huggingface') {
            // Auto-switch to local runner
            setBackendMode('local');
            localStorage.setItem('nexus-backend-mode', 'local');
            
            setConversations((prev) => {
              const updated = prev.map((c) => {
                if (c.id === currentConvId) {
                  const msgs = [...c.messages];
                  const lastMsg = msgs[msgs.length - 1];
                  if (lastMsg && lastMsg.role === 'assistant') {
                    msgs[msgs.length - 1] = {
                      ...lastMsg,
                      content: `⚠️ *Hugging Face cloud quota depleted (Error 402). Auto-switching to Local Runner...* 🔄\n\n`,
                      isStreaming: true,
                    };
                  }
                  return { ...c, messages: msgs };
                }
                return c;
              });
              return updated;
            });
            
            setIsStreaming(true);
            const retryController = new AbortController();
            abortControllerRef.current = retryController;
            
            streamChatCompletion({
              backend: 'local',
              messages: apiMessages,
              apiKey,
              serverUrl,
              systemPersona,
              memories,
              hfModel,
              signal: retryController.signal,
              onToken: (token) => {
                setConversations((prev) => {
                  const updated = prev.map((c) => {
                    if (c.id === currentConvId) {
                      const msgs = [...c.messages];
                      const lastMsg = msgs[msgs.length - 1];
                      if (lastMsg && lastMsg.role === 'assistant') {
                        msgs[msgs.length - 1] = {
                          ...lastMsg,
                          content: lastMsg.content + token,
                        };
                      }
                      return { ...c, messages: msgs };
                    }
                    return c;
                  });
                  return updated;
                });
              },
              onDone: () => {
                setIsStreaming(false);
                abortControllerRef.current = null;
                setConversations((prev) => {
                  const updated = prev.map((c) => {
                    if (c.id === currentConvId) {
                      const msgs = c.messages.map((m) => {
                        if (m.role === 'assistant') {
                          let finalContent = m.content;
                          const dMode = detectMode(content);
                          if (dMode === 'image') {
                            const promptSubject = content
                              .replace(/\b(create|generate|draw|paint|show|make|render)\b/gi, '')
                              .replace(/\b(image|picture|photo|illustration|drawing|portrait|sketch|graphic|wallpaper|cat|dog|animal)\b/gi, '')
                              .replace(/\b(of|a|an)\b/gi, '')
                              .trim();
                            const queryParam = encodeURIComponent(promptSubject || content.trim());
                            const pollinationsUrl = `https://image.pollinations.ai/prompt/${queryParam}`;
                            finalContent = `⚠️ *Hugging Face cloud quota depleted (Error 402). Auto-switched to Local Runner.* ✅\n\nHere is the generated image for you:\n\n![Generated Image](${pollinationsUrl})`;
                          } else if (dMode === 'pdf') {
                            if (!finalContent.includes('pdf_download_placeholder') && !finalContent.includes('Download')) {
                              finalContent += `\n\n[Download Edited PDF](blob:pdf_download_placeholder)`;
                            }
                          } else if (dMode === 'ppt') {
                            if (!finalContent.includes('ppt_download_placeholder') && !finalContent.includes('Download')) {
                              finalContent += `\n\n[Download Presentation](blob:ppt_download_placeholder)`;
                            }
                          }
                          return { ...m, content: finalContent, isStreaming: false };
                        }
                        return m;
                      });
                      return { ...c, messages: msgs, updatedAt: Date.now() };
                    }
                    return c;
                  });
                  saveConversations(updated);
                  return updated;
                });
              },
              onError: (retryError) => {
                setIsStreaming(false);
                abortControllerRef.current = null;
                setConversations((prev) => {
                  const updated = prev.map((c) => {
                    if (c.id === currentConvId) {
                      const msgs = [...c.messages];
                      const lastMsg = msgs[msgs.length - 1];
                      if (lastMsg && lastMsg.role === 'assistant') {
                        msgs[msgs.length - 1] = {
                          ...lastMsg,
                          content: `⚠️ **Hugging Face API Credit Limit Depleted (Error 402)**\n\n` +
                            `Failed to auto-failover to the local runner server. Please ensure the local server is running at ${serverUrl} or update your \`VITE_HF_API_KEY\` in your \`.env\` file.\n\n` +
                            `*Local runner error: ${retryError.message}*`,
                          isStreaming: false,
                          isError: true,
                        };
                      }
                      return { ...c, messages: msgs, updatedAt: Date.now() };
                    }
                    return c;
                  });
                  saveConversations(updated);
                  return updated;
                });
              }
            });
            return;
          }

          setConversations((prev) => {
            const updated = prev.map((c) => {
              if (c.id === currentConvId) {
                const msgs = [...c.messages];
                const lastMsg = msgs[msgs.length - 1];
                if (lastMsg && lastMsg.role === 'assistant') {
                  let customErrorMsg = `⚠️ Error: ${error.message}`;
                  
                  if (error.message.includes('402') || error.message.includes('depleted') || error.message.includes('429')) {
                    customErrorMsg = `⚠️ **Hugging Face API Credit Limit Depleted (Error 402)**\n\n` +
                      `You have depleted your monthly Hugging Face free usage credits. Since your local inference server is already running, you can continue chatting immediately for free:\n\n` +
                      `1. Click the **Settings Gear** icon in the UI.\n` +
                      `2. Switch the backend to **Local Models** (uses the Custom Fine-Tuned Model running locally).\n\n` +
                      `Alternatively, you can update the \`VITE_HF_API_KEY\` variable in your local \`.env\` file with a new token from Hugging Face.`;
                  }

                  msgs[msgs.length - 1] = {
                    ...lastMsg,
                    content: customErrorMsg,
                    isStreaming: false,
                    isError: true,
                  };
                }
                return { ...c, messages: msgs, updatedAt: Date.now() };
              }
              return c;
            });
            saveConversations(updated);
            return updated;
          });
        },
      });
    },
    [activeConversationId, apiKey, serverUrl, backendMode, systemPersona, memories, hfModel, isStreaming, saveConversations, setBackendMode]
  );

  // Stop current streaming
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Clear all conversations
  const clearAllConversations = useCallback(() => {
    setConversations([]);
    setActiveConversationId(null);
    saveConversations([]);
    localStorage.removeItem('nexus-active-conversation');
  }, [saveConversations]);

  const HF_MODEL_NAMES = {
    'deepseek-ai/DeepSeek-V3': 'DeepSeek V3',
    'Qwen/Qwen2.5-Coder-32B-Instruct': 'Qwen 2.5 Coder',
    'meta-llama/Llama-3.3-70B-Instruct': 'Llama 3.3 70B',
    'deepseek-ai/DeepSeek-R1': 'DeepSeek R1',
    'Qwen/Qwen2.5-7B-Instruct': 'Qwen 2.5 7B'
  };

  const activeModelName = backendMode === 'local'
    ? localModelName
    : (HF_MODEL_NAMES[hfModel] || hfModel.split('/').pop() || hfModel);

  return {
    conversations,
    activeConversation,
    activeConversationId,
    isStreaming,
    apiKey,
    backendMode,
    serverUrl,
    createConversation,
    deleteConversation,
    switchConversation,
    sendMessage,
    stopStreaming,
    updateApiKey,
    updateBackendMode,
    updateServerUrl,
    systemPersona,
    updateSystemPersona,
    hfModel,
    updateHfModel,
    clearAllConversations,
    memories,
    addMemory,
    deleteMemory,
    clearMemories,
    activeModelName,
    proxyAvailable,
  };
}
