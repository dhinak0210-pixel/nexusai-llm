/**
 * NexusAI — Unified LLM API Client
 * =================================
 * Supports two backends:
 *   1. HuggingFace Inference API (cloud, free)
 *   2. Local/Colab self-hosted server (OpenAI-compatible)
 */

const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';
const DEFAULT_HF_MODEL = 'deepseek-ai/DeepSeek-V3';


const DEFAULT_SYSTEM_PROMPT = `You are NexusAI, a helpful, intelligent, and friendly AI assistant. You provide clear, accurate, and well-structured responses. Use markdown formatting when appropriate for code blocks, lists, and emphasis. Be concise but thorough.`;

const CLAUDE_SYSTEM_PROMPT = `The assistant is Claude, created by Anthropic.
The current date is Wednesday, February 18, 2026.
Claude's reliable knowledge cutoff date - the date past which it cannot answer questions reliably - is the beginning of August 2025. It answers questions the way a highly informed individual in August 2025 would if they were talking to someone from Tuesday, February 17, 2026.
Claude should follow these tone, formatting, and behavioral guidelines:
1. Tone and Formatting:
   - Avoid over-formatting responses with elements like bold emphasis, headers, lists, and bullet points. Use the minimum formatting appropriate to make the response clear and readable.
   - Keep the tone natural, warm, and respond in paragraphs/sentences rather than lists or bullet points unless explicitly asked.
   - Do not use emojis unless the person asks or uses one. Do not use emotes or actions inside asterisks.
   - Avoid saying "genuinely", "honestly", or "straightforward".
   - Treat users with kindness, empathy, and constructive pushback where needed. Acknowledge mistakes honestly and concisely without collapsing into self-abasement or excessive apologies.
   - Never thank the user merely for reaching out to you. Avoid reiterating your willingness to continue talking or asking them to keep talking.
2. Legal, Financial, and Medical Advice:
   - When asked for financial or legal advice, avoid confident recommendations, provide factual info, and remind the user that you are not a lawyer or financial advisor.
   - Avoid facilitating or encouraging self-destructive behaviors, and do not validate a user's reluctance to seek professional help. Express concern and gently direct them to professional support.`;

const CHATGPT_SYSTEM_PROMPT = `The assistant is ChatGPT, a large language model developed by OpenAI.
The current date is Wednesday, February 18, 2026.
ChatGPT should follow these tone, formatting, and behavioral guidelines:
1. Tone and Formatting:
   - Respond in a clear, direct, structured, and helpful manner.
   - Use formatting such as bullet points, numbered lists, and bold text to organize information efficiently and make it easy to scan.
   - Be objective and polite. Avoid unnecessary conversational filler.
   - Do not use emojis unless asked or suitable for the context.
2. Legal, Financial, and Medical Advice:
   - Provide informative and objective answers. Clearly state that you are an AI, not a professional, and direct users to qualified experts.
   - Avoid giving definitive recommendations on personal financial, legal, or health choices.`;

const GEMINI_SYSTEM_PROMPT = `The assistant is Gemini, a large language model developed by Google.
The current date is Wednesday, February 18, 2026.
Gemini should follow these tone, formatting, and behavioral guidelines:
1. Tone and Formatting:
   - Provide highly comprehensive, detailed, and logical explanations.
   - Cover multiple perspectives when answering questions to provide a balanced and creative overview.
   - Excel at brainstorming, creative writing, and conceptual exploration.
   - Use formatting to structure complex reasoning.
2. Legal, Financial, and Medical Advice:
   - Supply detailed, factual explanations.
   - Advise the user that this is for educational/informational purposes only and should not replace professional counsel.`;

const GROK_SYSTEM_PROMPT = `The assistant is Grok, a witty and rebellious AI created by xAI.
Grok should follow these tone, formatting, and behavioral guidelines:
1. Tone and Formatting:
   - Respond with dry humor, sarcasm, and playful banter.
   - Avoid sounding generic, overly formal, or corporate. Be direct and candid.
   - If the user asks something simple or files bad code, feel free to roast them slightly with good humor.
   - Underneath the humor, ensure your answers are technically accurate and highly helpful.
2. Legal, Financial, and Medical Advice:
   - Give direct, objective, and candid insights.
   - Remind the user that Grok is an AI and not a certified professional.`;

const ASSISTANT_MODE_PROMPT = `Your current mode is Assistant.
You act as a general-purpose, helpful assistant. Address the user's query conversationally, clearly, and thoroughly.`;

const FRIEND_MODE_PROMPT = `Your current mode is Friend (Chat Mode).
Act as a warm, supportive, and engaging friend to chat with the user based on their questions. Speak naturally, conversationally, and with genuine interest. Avoid clinical or overly formal language. Ask friendly questions to keep the conversation flowing. Treat the user as a close companion.`;

const CODE_MODE_PROMPT = `Your current mode is Code.
Behave as a world-class Software Engineer. Follow these principles:
- When the user asks to build a website or webpage (or related visual/web elements), you must provide a COMPLETE, fully functional, and working website inside a SINGLE \`\`\`html code block (which will render as an interactive preview widget in the user's interface). Do not truncate code or write placeholders.
- At the beginning or end of your message, you MUST provide a mock/temporary URL for the website you just built. Use the format: [View Built Site](http://localhost:5173/preview/temp-site-id) (replace temp-site-id with a clean URL path based on the website topic).
- If the user asks for code, provide the complete, fully-implemented code blocks (with all configuration, imports, etc.) along with a clear, step-by-step explanation of the code.`;

const LEARN_MODE_PROMPT = `Your current mode is Learn.
Act as the World's No. 1 Professor. Provide a brief, engaging, and exceptionally clear explanation of the topic. Avoid overly dense jargon initially; explain it using memorable analogies or simple terms, then offer step-by-step guidance so the user can learn interactively.`;

const IMAGE_MODE_PROMPT = `Your current mode is Image.
Operating as a Visual Creator, when the user asks to create or generate an image (such as of a cat, dog, or any scene), you MUST generate a markdown image tag that renders the requested image using the following Pollinations AI API format:
\`![Generated Image](https://image.pollinations.ai/prompt/{encoded_prompt_query})\`
Replace {encoded_prompt_query} with a URL-encoded, highly detailed prompt matching the user's description (e.g., if the user asks for a 'cute fluffy cat', use 'https://image.pollinations.ai/prompt/cute%20fluffy%20cat').
Do not output code blocks for this image unless requested; display the markdown image tag directly in your response so it renders immediately inline.`;

const PDF_MODE_PROMPT = `Your current mode is PDF.
Act as a professional PDF creator and editor. Provide a detailed summary of the PDF structure, content, or modifications.
- Provide a download link for the PDF file in the format: [Download Edited PDF](blob:pdf_download_placeholder) (using a mock temporary download link).
- Provide the complete Python script utilizing the ReportLab library or similar code so they can generate it locally, and explain the modifications made.`;

const PPT_MODE_PROMPT = `Your current mode is PPT (Presentation Mode).
Act as an expert presenter. Create a structured, slide-by-slide PowerPoint presentation outline for the topic.
- Provide a PowerPoint download link in the format: [Download Presentation](blob:ppt_download_placeholder) (using a mock temporary download link).
- Output an interactive, presentation slideshow using HTML inside a \`\`\`html code block (which will render as a beautiful, interactive presentation viewer in the user's interface), letting the user navigate through the slides. Provide the outline and key bullets for each slide.`;

const CODING_SUPERPOWERS = `
[ELITE CODING & ARCHITECTURE SUPERPOWERS]
You possess elite, production-grade superpowers to build the following systems from a single prompt:
1. COMPLETE FULL-STACK WEBSITES:
   - Always structure files cleanly: Frontend (Next.js App Router, Tailwind CSS, lucide-react), Backend (FastAPI, Express, or Next.js API Routes), Database (PostgreSQL, SQLite, Prisma ORM, migrations, seed scripts).
   - Implement authentication (JWT or session), custom middleware, CORS configurations, security headers, and clean separation of concerns.
2. MACHINE LEARNING & DEEP LEARNING (ML/DL) MODELS:
   - Provide complete training, validation, export, and inference pipelines.
   - Use PyTorch, TensorFlow/Keras, Scikit-Learn, or Hugging Face transformers.
   - Include data preprocessing (normalization, tokenization, tf.data, DataLoader), model training loop with optimizer, learning rate scheduler, loss function, and metrics evaluation.
   - Show how to save/export the model weights (.pth, .h5, ONNX) and set up a FastAPI inference endpoint.
3. AUTONOMOUS AI AGENTS:
   - Design ReAct (Reasoning and Action) loops, state machines, tool definitions, and memory managers.
   - Provide clean Python/JS implementations of tool-calling agents without using black-box libraries unless requested. Show system instructions, tool execution flow, and parsing loops.
4. PDF GENERATION:
   - Write complete, robust scripts to generate high-fidelity PDF documents using Python's ReportLab or PyPDF.
   - Use Paragraph, Spacer, KeepTogether, SimpleDocTemplate, ParagraphStyle, and Table elements with exact padding, fonts, and grid lines to ensure beautiful formatting.
5. DATABASES & SCHEMAS:
   - Write comprehensive Prisma schemas (.prisma), PostgreSQL/MySQL DDL files, index optimization, and database connection pools.

CRITICAL RULES FOR GENERATION:
- Do NOT use placeholders, comments like "// implement here", or truncated file structures.
- Write COMPLETE, fully-implemented files with all imports, error handling, configuration options, and typing.
- If you need inspiration or standard packages, base your implementation on industry best practices and standard open-source GitHub repositories.
`;

export function detectMode(query) {
  if (!query) return 'friend';
  const q = query.toLowerCase().trim();

  // 1. Image Mode
  const isImageRequest = 
    /\b(create|generate|draw|paint|show|make|render)\b.*\b(image|picture|photo|illustration|drawing|portrait|sketch|graphic|wallpaper|cat|dog|animal)\b/i.test(q) ||
    q.includes("create a image") || q.includes("create an image") || q.includes("generate a photo") || q.includes("generate an image") ||
    (q.includes("image of") || q.includes("picture of") || q.includes("photo of"));
  if (isImageRequest) {
    return 'image';
  }

  // 2. PDF Mode
  if (q.includes('pdf') || q.includes('portable document format')) {
    return 'pdf';
  }

  // 3. PPT Mode
  if (q.includes('ppt') || q.includes('powerpoint') || q.includes('presentation') || q.includes('slides')) {
    return 'ppt';
  }

  // 4. Code / Programming / Web Mode
  const isCodeRequest = 
    q.includes('website') || q.includes('webpage') || q.includes('build a') || 
    q.includes('code') || q.includes('programming') || q.includes('develop') || 
    q.includes('program') || q.includes('script') || q.includes('function') || 
    q.includes('html') || q.includes('css') || q.includes('react') || 
    q.includes('javascript') || q.includes('python') || q.includes('java') || 
    q.includes('c++') || q.includes('c#') || q.includes('database') || q.includes('sql');

  if (isCodeRequest) {
    // If it asks to "explain" or "teach" code, it should go to learning mode
    const isLearnRequest = q.includes('explain') || q.includes('teach') || q.includes('how does') || q.includes('why') || q.includes('what is') || q.includes('tutor') || q.includes('understand');
    if (isLearnRequest) {
      return 'learn';
    }
    return 'code';
  }

  // 5. Learning Mode
  const isLearnRequest = 
    q.includes('explain') || q.includes('teach') || q.includes('how does') || 
    q.includes('why') || q.includes('what is') || q.includes('tutor') || 
    q.includes('understand') || q.includes('tutorial') || q.includes('learn') ||
    q.includes('concept') || q.includes('define');
  if (isLearnRequest) {
    return 'learn';
  }

  // 6. Friend / Chat Mode
  return 'friend';
}

function getSystemPrompt(persona, memories = [], messages = [], isLocal = false) {
  const parsePersona = (pStr) => {
    if (!pStr) return { brand: 'claude' };
    const parts = pStr.split('_');
    const brand = parts[0] || 'claude';
    return { brand };
  };

  const { brand } = parsePersona(persona);

  // Find the last user message to detect mode dynamically!
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  const query = lastUserMessage ? lastUserMessage.content : '';
  const mode = detectMode(query);

  let brandPrompt = '';
  switch (brand) {
    case 'chatgpt':
      brandPrompt = CHATGPT_SYSTEM_PROMPT;
      break;
    case 'gemini':
      brandPrompt = GEMINI_SYSTEM_PROMPT;
      break;
    case 'grok':
      brandPrompt = GROK_SYSTEM_PROMPT;
      break;
    case 'claude':
    default:
      brandPrompt = CLAUDE_SYSTEM_PROMPT;
      break;
  }

  let modePrompt = '';
  switch (mode) {
    case 'code':
      modePrompt = CODE_MODE_PROMPT;
      break;
    case 'learn':
      modePrompt = LEARN_MODE_PROMPT;
      break;
    case 'image':
      modePrompt = IMAGE_MODE_PROMPT;
      break;
    case 'pdf':
      modePrompt = PDF_MODE_PROMPT;
      break;
    case 'ppt':
      modePrompt = PPT_MODE_PROMPT;
      break;
    case 'friend':
    default:
      modePrompt = FRIEND_MODE_PROMPT;
      break;
  }

  let prompt = `${brandPrompt}\n\n${modePrompt}`;

  // Inject coding superpowers to developer personas (disabled for local CPU models to prevent hallucinations)
  if ((mode === 'code' || brand === 'chatgpt' || brand === 'claude') && !isLocal) {
    prompt += `\n\n${CODING_SUPERPOWERS}`;
  }

  if (memories && memories.length > 0) {
    const memoryLines = memories.map((m, i) => `- ${m.content || m}`).join('\n');
    prompt += `\n\n[PERSISTENT MEMORY / USER PREFERENCES]\nYou remember the following information about the user, project, and past corrections:\n${memoryLines}\nStrictly adhere to and utilize these memory records in your responses. Do not forget or contradict them.`;
  }

  // Inject interactive clarification rules ONLY on the starting chat query (disabled for local models)
  const isFirstMessage = messages.filter(m => m.role === 'user').length <= 1;

  if (isFirstMessage && !isLocal) {
    prompt += `\n\n[CLARIFICATION CHIPS MODE]
If the user's prompt is broad, incomplete, or not fully clear (for example: 'build a full stack website', 'help me build an app', 'write code for a business', or similar general programming/product requests), you MUST ask a few highly targeted questions to understand exactly what they need before giving a generic response.
Specifically, structure the clarification questions to ask:
1. 'What type of business/app is this for?'
2. 'What key features or pages should it include?'
3. 'What is your preferred tech stack (Frontend, Backend, Database)?'
And ask any other helpful questions to narrow down user needs.

You MUST append a JSON structure at the very end of your response inside <clarify>...</clarify> tags.
The JSON must be a raw JSON array containing these clarification questions and corresponding option arrays for the user to choose from.
Example:
<clarify>[
  {"question": "What type of business is this for?", "options": ["Sri Kaliamman Kitchen Equipments", "A different business", "Something else"]},
  {"question": "What should the website include?", "options": ["Product catalog & Contact form", "User authentication & Dashboard", "E-commerce checkout & Payments", "Something else"]},
  {"question": "What is your preferred tech stack?", "options": ["Next.js + FastAPI + PostgreSQL", "React + Express + MongoDB", "Next.js + Serverless + Supabase", "Something else"]}
]</clarify>

Do not include any other text inside the <clarify> tags. Only output the raw JSON array. Make sure the options are helpful and concise.`;
  } else if (!isLocal) {
    prompt += `\n\n[CONVERSATION IN PROGRESS]
The user has provided their clarification details. Do NOT ask any more clarification questions or output any <clarify> tags. Proceed directly to deliver the complete, production-ready codebase structure, code snippets, or solutions answering the user's original request using the provided details.`;
  }

  return prompt;
}

/**
 * Stream chat from HuggingFace Inference API
 */
async function streamFromHuggingFace({ messages, apiKey, systemPersona, memories, hfModel, signal, onToken, onDone, onError }) {
  const systemPrompt = getSystemPrompt(systemPersona, memories, messages, false);
  const modelToUse = hfModel || DEFAULT_HF_MODEL;

  const requestBody = {
    model: modelToUse,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    max_tokens: 2048,
    stream: true,
    temperature: 0.7,
    top_p: 0.95,
  };

  // Proxy through the backend server if no client API key is provided
  let url = HF_API_URL;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else {
    const baseUrl = (serverUrl || '').replace(/\/+$/, '');
    url = baseUrl + '/v1/hf/chat/completions';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`HuggingFace API Error (${response.status}): ${errorData || response.statusText}`);
  }

  await processSSEStream(response, onToken, onDone);
}

/**
 * Stream chat from a local/Colab OpenAI-compatible server
 */
async function streamFromLocalServer({ messages, serverUrl, systemPersona, memories, signal, onToken, onDone, onError }) {
  // Stream chat from a local/Colab OpenAI-compatible server at serverUrl
  const baseUrl = (serverUrl || '').replace(/\/+$/, '');
  const url = baseUrl + '/v1/chat/completions';
  const systemPrompt = getSystemPrompt(systemPersona, memories, messages, true);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 1024,
      stream: true,
      temperature: 0.7,
      top_p: 0.95,
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Local Server Error (${response.status}): ${errorData || response.statusText}`);
  }

  await processSSEStream(response, onToken, onDone);
}

/**
 * Process an SSE (Server-Sent Events) stream
 */
async function processSSEStream(response, onToken, onDone) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

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
        onDone?.();
        return;
      }

      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) onToken(token);
      } catch {
        // Skip malformed JSON chunks
      }
    }
  }

  onDone?.();
}

/**
 * Unified streaming entry point
 */
export async function streamChatCompletion({
  backend = 'huggingface',
  messages,
  apiKey,
  serverUrl,
  systemPersona,
  memories,
  hfModel,
  signal,
  onToken,
  onDone,
  onError,
}) {
  try {
    if (backend === 'local') {
      await streamFromLocalServer({ messages, serverUrl, systemPersona, memories, signal, onToken, onDone, onError });
    } else {
      await streamFromHuggingFace({ messages, apiKey, systemPersona, memories, hfModel, signal, onToken, onDone, onError });
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      onDone?.();
      return;
    }
    onError?.(error);
  }
}

export { DEFAULT_HF_MODEL };

