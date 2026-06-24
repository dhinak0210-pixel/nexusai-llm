// ==========================================================================
// NexusAI Standalone — Vanilla JS Frontend Controller
// ==========================================================================

const messagesContainer = document.getElementById('messages-container');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const activeModelName = document.getElementById('active-model-name');
const hardwareDevice = document.getElementById('hardware-device');

// Active session message history
const messageHistory = [];

// Fetch local server configurations on load
async function fetchServerStatus() {
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      const data = await res.json();
      activeModelName.textContent = data.model || 'Unknown Model';
      hardwareDevice.textContent = data.device ? data.device.toUpperCase() : 'CPU';
      
      // If running on CUDA/GPU, highlight green
      if (data.device === 'cuda') {
        hardwareDevice.style.color = '#10b981';
      }
    }
  } catch (error) {
    activeModelName.textContent = 'Offline';
    hardwareDevice.textContent = 'None';
    hardwareDevice.style.color = '#ef4444';
    console.error('Server offline or unreachable:', error);
  }
}

// Append a message bubble to the chat container
function appendMessage(role, content) {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${role}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? '👤' : '🤖';
  
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = content;
  
  messageEl.appendChild(avatar);
  messageEl.appendChild(bubble);
  messagesContainer.appendChild(messageEl);
  
  // Auto scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return bubble;
}

// Handle Form Submission
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const text = userInput.value.trim();
  if (!text) return;
  
  // Clear input
  userInput.value = '';
  
  // Append User message
  appendMessage('user', text);
  messageHistory.push({ role: 'user', content: text });
  
  // Append Assistant placeholder
  const assistantBubble = appendMessage('assistant', '');
  assistantBubble.textContent = '...';
  
  // Lock form inputs
  userInput.disabled = true;
  sendBtn.disabled = true;
  
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: messageHistory,
        max_tokens: 512,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`API returned HTTP ${response.status}`);
    }
    
    // Clear placeholder
    assistantBubble.textContent = '';
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let responseText = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        
        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          break;
        }
        
        try {
          const parsed = JSON.parse(data);
          const chunk = parsed.content || '';
          responseText += chunk;
          assistantBubble.textContent = responseText;
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (err) {
          // ignore malformed JSON chunks
        }
      }
    }
    
    // Save generated reply to history
    messageHistory.push({ role: 'assistant', content: responseText });
    
  } catch (error) {
    assistantBubble.textContent = `❌ Error: ${error.message}. Please check if the local backend server is running.`;
    assistantBubble.style.color = '#ef4444';
    console.error('Inference error:', error);
  } finally {
    // Unlock form inputs
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
});

// Load Server configuration on start
fetchServerStatus();
