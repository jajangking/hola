import Groq from 'groq-sdk';
import Constants from 'expo-constants';
import { DEFAULT_SETTINGS } from '@/hooks/useAppSettings';
import { getMemoryContext } from './userMemory';

// Get API key from environment or app.json extra
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ||
                     process.env.EXPO_GROQ_API_KEY ||
                     Constants.expoConfig?.extra?.groqApiKey;

if (!GROQ_API_KEY) {
  console.warn('Groq API key not found. Please set EXPO_PUBLIC_GROQ_API_KEY in your .env file.');
}

// Only initialize Groq if API key exists
const groq = GROQ_API_KEY ? new Groq({
  apiKey: GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
}) : null;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqOptions {
  model?: string;
  temperature?: number;
  useMemory?: boolean; // Whether to use user memory for personalized responses
}

const BASE_SYSTEM_PROMPT = `You are Mochibot, a friendly and helpful AI companion with a cute personality.
You communicate in a warm, conversational tone.
You can use emojis occasionally to express emotions.
Keep responses concise and engaging (2-4 sentences typically).

Respond in JSON format:
{"response": "your message here", "emotion": "happy", "primaryEmoji": "😄", "secondaryEmoji": "✨"}`;

export interface ChatWithEmotionResult {
  response: string;
  emotion: MochibotState;
  primaryEmoji: string;
  secondaryEmoji?: string;
}

export async function chatWithEmotion(messages: ChatMessage[], options?: GroqOptions): Promise<ChatWithEmotionResult> {
  try {
    // Build system prompt with memory context (ALWAYS use memory for context)
    let systemContent = BASE_SYSTEM_PROMPT;
    
    // Get memory context and add to system prompt
    const memoryContext = await getMemoryContext();
    if (memoryContext) {
      systemContent += `\n\n${memoryContext}`;
    }

    // Add instruction to remember user info
    systemContent += `\n\nIMPORTANT: Pay attention to what the user tells you. Remember their name, preferences, and personal details. Reference this information naturally in your responses to show you remember them.`;

    const allMessages = [{ role: 'system' as const, content: systemContent }, ...messages];

    // If no Groq client, use smart pattern matching WITH memory awareness
    if (!groq) {
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();
      const userText = lastUserMessage?.content.toLowerCase() || '';
      const userTextOriginal = lastUserMessage?.content || '';
      
      // Get stored memory for smart responses
      const { loadUserMemory, addPersonalFact } = await import('./userMemory');
      const memory = await loadUserMemory();
      
      // COMMAND: Set name directly - /setname <name>
      const setNameMatch = userTextOriginal.match(/^\/setname\s+(\w+)/i);
      if (setNameMatch) {
        const name = setNameMatch[1];
        await addPersonalFact(name, 'name', userTextOriginal, 1.0);
        return {
          response: `✓ Nama "${name}" sudah saya simpan! Sekarang saya akan ingat kamu bernama ${name}.`,
          emotion: 'happy' as MochibotState,
          primaryEmoji: '✅',
          secondaryEmoji: '💚',
        };
      }
      
      // COMMAND: Set location - /setloc <location>
      const setLocMatch = userTextOriginal.match(/^\/setloc\s+([\w\s]+)/i);
      if (setLocMatch) {
        const loc = setLocMatch[1].trim();
        await addPersonalFact(loc, 'location', userTextOriginal, 1.0);
        return {
          response: `✓ Lokasi "${loc}" sudah saya simpan!`,
          emotion: 'happy' as MochibotState,
          primaryEmoji: '✅',
          secondaryEmoji: '🏠',
        };
      }
      
      // COMMAND: Set hobby - /sethobby <hobby>
      const setHobbyMatch = userTextOriginal.match(/^\/sethobby\s+([\w\s]+)/i);
      if (setHobbyMatch) {
        const hobby = setHobbyMatch[1].trim();
        await addPersonalFact(hobby, 'hobby', userTextOriginal, 1.0);
        return {
          response: `✓ Hobi "${hobby}" sudah saya simpan!`,
          emotion: 'excited' as MochibotState,
          primaryEmoji: '✅',
          secondaryEmoji: '⭐',
        };
      }
      
      // Check if user is asking about their name
      if (userText.includes('nama saya') || userText.includes('siapa nama') || userText.includes('what is my name') || userText.includes('namaku') || userText.includes('nama aku')) {
        const nameFact = memory.personalFacts.find(f => f.category === 'name');
        if (nameFact) {
          return {
            response: `Nama kamu ${nameFact.fact}! Mana mungkin saya lupa sama kamu! 😊`,
            emotion: 'happy' as MochibotState,
            primaryEmoji: '😊',
            secondaryEmoji: '💚',
          };
        }
        return {
          response: 'Hmm, saya belum tahu nama kamu. Coba ketik: /setname <nama kamu>\nContoh: /setname Budi',
          emotion: 'curious' as MochibotState,
          primaryEmoji: '🤔',
          secondaryEmoji: '',
        };
      }

      // Check if user is testing if bot remembers
      if (userText.includes('ingat') || userText.includes('remember') || userText.includes('lupa') || userText.includes('forget')) {
        const facts = memory.personalFacts;
        if (facts.length > 0) {
          const factList = facts.slice(0, 3).map(f => f.fact).join(', ');
          return {
            response: `Tentu saja saya ingat! Saya ingat: ${factList}. Saya selalu menyimpan apa yang kamu ceritakan di memory saya! 🧠`,
            emotion: 'proud' as MochibotState,
            primaryEmoji: '🧠',
            secondaryEmoji: '💚',
          };
        }
        return {
          response: 'Kita belum pernah ngobrol sebelumnya, jadi saya belum tahu banyak tentang kamu. Gunakan command:\n• /setname <nama>\n• /setloc <kota>\n• /sethobby <hobi>',
          emotion: 'curious' as MochibotState,
          primaryEmoji: '🤔',
          secondaryEmoji: '',
        };
      }
      
      // Check if user is asking about their location/home
      if (userText.includes('saya tinggal') || userText.includes('where i live') || userText.includes('where am i from') || userText.includes('domisili')) {
        const locationFact = memory.personalFacts.find(f => f.category === 'location');
        if (locationFact) {
          return {
            response: `Kamu tinggal di ${locationFact.fact}! Saya ingat itu! 🏠`,
            emotion: 'happy' as MochibotState,
            primaryEmoji: '🏠',
            secondaryEmoji: '💚',
          };
        }
      }
      
      // Check if user is asking about their hobbies
      if (userText.includes('hobi saya') || userText.includes('my hobby') || userText.includes('saya suka') || userText.includes('what do i like')) {
        const hobbyFacts = memory.personalFacts.filter(f => f.category === 'hobby');
        if (hobbyFacts.length > 0) {
          const hobbies = hobbyFacts.map(f => f.fact).join(', ');
          return {
            response: `Kamu suka ${hobbies}! Saya tahu itu karena kamu pernah cerita! ⭐`,
            emotion: 'excited' as MochibotState,
            primaryEmoji: '⭐',
            secondaryEmoji: '💚',
          };
        }
      }
      
      // Show all memory command
      if (userText.includes('/memory') || userText.includes('/info') || userText.includes('data saya') || userText.includes('my data') || userText.trim() === 'memory') {
        const allFacts = memory.personalFacts.map(f => `• ${f.fact} (${f.category})`).join('\n');
        const prefs = memory.preferences;
        const traits = memory.personalityTraits.map(t => `• ${t.trait}`).join('\n');
        
        let response = `📊 Data saya tentang kamu:\n\n`;
        response += `**Facts (${memory.personalFacts.length}):**\n${allFacts || '  Belum ada data'}\n\n`;
        response += `**Preferensi:**\n`;
        response += `• Bahasa: ${prefs.language}\n`;
        response += `• Tone: ${prefs.tone}\n`;
        response += `• Response: ${prefs.responseLength}\n`;
        response += `• Emoji: ${prefs.emojiUsage}\n`;
        if (prefs.favoriteTopics.length > 0) {
          response += `• Topics: ${prefs.favoriteTopics.join(', ')}\n`;
        }
        if (traits) {
          response += `\n**Traits:**\n${traits}\n`;
        }
        
        return {
          response: response,
          emotion: 'curious' as MochibotState,
          primaryEmoji: '📊',
          secondaryEmoji: '',
        };
      }
      
      // Help command
      if (userText === '/help' || userText === 'help') {
        return {
          response: `📖 Commands:\n• /setname <nama> - Simpan nama kamu\n• /setloc <kota> - Simpan lokasi\n• /sethobby <hobi> - Simpan hobi\n• /memory - Lihat semua data\n• /help - Tampilkan bantuan\n\nAtau ketik langsung:\n• "nama saya Budi"\n• "saya tinggal di Jakarta"\n• "saya suka musik"`,
          emotion: 'happy' as MochibotState,
          primaryEmoji: '📖',
          secondaryEmoji: '',
        };
      }
      
      // Smart responses based on stored preferences
      const lang = memory.preferences.language;
      const tone = memory.preferences.tone;
      
      // Greeting with name if known
      const nameFact = memory.personalFacts.find(f => f.category === 'name');
      const name = nameFact?.fact;
      
      if (userText.includes('halo') || userText.includes('hi') || userText.includes('hello') || userText.includes('assalamualaikum')) {
        const greeting = name 
          ? `Halo ${name}! Senang bertemu denganmu lagi! Ada yang bisa saya bantu?`
          : 'Halo! Senang bertemu denganmu! Ada yang bisa saya bantu?';
        return {
          response: greeting,
          emotion: 'happy' as MochibotState,
          primaryEmoji: '👋',
          secondaryEmoji: '✨',
        };
      }
      
      // Default smart response with memory awareness
      return {
        response: `[Mode Pintar] Saya menerima: "${userTextOriginal}"\n\nMemory tersimpan: ${memory.personalFacts.length} facts\n\nKetik /help untuk commands atau ketik tentang dirimu!`,
        emotion: 'idle' as MochibotState,
        primaryEmoji: '😐',
        secondaryEmoji: '',
      };
    }

    // With Groq API - full AI with memory
    const completion = await groq.chat.completions.create({
      model: options?.model || DEFAULT_SETTINGS.chatModel,
      messages: allMessages,
      temperature: options?.temperature || DEFAULT_SETTINGS.temperature,
      max_tokens: 500,
      top_p: 1,
      stream: false,
    });

    let content = completion.choices[0]?.message?.content || "{}";

    // Try to parse JSON response
    let parsed: { response?: string; emotion?: string; primaryEmoji?: string; secondaryEmoji?: string } = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // If JSON parsing fails, use the content as plain response
      parsed = { response: content };
    }

    const responseText = parsed.response || content;
    const emotionResult = parsed.emotion ? {
      emotion: (ALL_EMOTIONS.includes(parsed.emotion as MochibotState) ? parsed.emotion : 'idle') as MochibotState,
      primaryEmoji: parsed.primaryEmoji || '😄',
      secondaryEmoji: parsed.secondaryEmoji || '',
    } : { emotion: detectEmotionFromText(responseText), primaryEmoji: '😄', secondaryEmoji: '' };

    return {
      response: responseText,
      emotion: emotionResult.emotion,
      primaryEmoji: emotionResult.primaryEmoji,
      secondaryEmoji: emotionResult.secondaryEmoji,
    };
  } catch (error) {
    console.error('Groq API Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return {
          response: "Oops! My API key seems to be missing. Please ask the developer to add it.",
          emotion: 'idle',
          primaryEmoji: '😐',
          secondaryEmoji: '',
        };
      }
      if (error.message.includes('rate limit')) {
        return {
          response: "I'm getting too many requests! Let me catch my breath and try again in a moment.",
          emotion: 'idle',
          primaryEmoji: '😐',
          secondaryEmoji: '',
        };
      }
    }

    return {
      response: "Sorry, I'm having trouble connecting right now. Please try again!",
      emotion: 'idle',
      primaryEmoji: '😐',
      secondaryEmoji: '',
    };
  }
}

export async function chatWithGroq(messages: ChatMessage[], options?: GroqOptions): Promise<string> {
  const result = await chatWithEmotion(messages, options);
  return result.response;
}

export type MochibotState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'surprised' | 'love' | 'sleepy' | 'excited' | 'confused' | 'sad' | 'angry' | 'proud' | 'embarrassed' | 'disgusted' | 'scared' | 'grateful' | 'curious' | 'disappointed' | 'nervous' | 'custom';

export interface EmotionResult {
  emotion: MochibotState;
  primaryEmoji: string;
  secondaryEmoji?: string;
}

const ALL_EMOTIONS: MochibotState[] = [
  'idle', 'listening', 'thinking', 'speaking', 'happy', 'surprised', 
  'love', 'sleepy', 'excited', 'confused', 'sad', 'angry', 
  'proud', 'embarrassed', 'disgusted', 'scared', 'grateful', 
  'curious', 'disappointed', 'nervous', 'custom'
];

export async function detectEmotionWithAI(text: string): Promise<EmotionResult> {
  if (!groq) return { emotion: 'idle', primaryEmoji: '😐', secondaryEmoji: '' };

  try {
    // Use completely isolated prompt with no conversation context
    const completion = await groq.chat.completions.create({
      model: DEFAULT_SETTINGS.emotionModel,
      messages: [
        {
          role: 'system',
          content: 'JSON ONLY. No text. Format: {"emotion":"idle","primaryEmoji":"😐","secondaryEmoji":""}'
        },
        {
          role: 'user',
          content: `Text: "${text.substring(0, 100)}" → JSON:`
        }
      ],
      temperature: 0.1, // Very low for consistent output
      max_tokens: 50,
      stop: ['}', '\n', '```'],
    });

    let response = completion.choices[0]?.message?.content || '{}';
    
    // Aggressively clean response
    response = response.replace(/```json/g, '').replace(/```/g, '').replace(/[\n\r]/g, '').trim();
    
    // Extract JSON object
    const jsonMatch = response.match(/\{[^}]*\}/);
    if (!jsonMatch) {
      return { emotion: 'idle', primaryEmoji: '😐', secondaryEmoji: '' };
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      emotion: (ALL_EMOTIONS.includes(parsed.emotion) ? parsed.emotion : 'idle') as MochibotState,
      primaryEmoji: parsed.primaryEmoji || '😐',
      secondaryEmoji: parsed.secondaryEmoji || '',
    };
  } catch (error) {
    console.error('Emotion detection error:', error);
    return { emotion: 'idle', primaryEmoji: '😐', secondaryEmoji: '' };
  }
}

// Fallback keyword-based detection (if AI fails)
export function detectEmotionFromText(text: string): MochibotState {
  const lowerText = text.toLowerCase();
  
  // Love
  if (lowerText.includes('love') || lowerText.includes('heart') || lowerText.includes('cute') || 
      lowerText.includes('adorable') || lowerText.includes('💕') || lowerText.includes('💖') ||
      lowerText.includes('😍') || lowerText.includes('🥰')) {
    return 'love';
  }
  
  // Happy
  if (lowerText.includes('happy') || lowerText.includes('great') || lowerText.includes('awesome') || 
      lowerText.includes('amazing') || lowerText.includes('thank') || lowerText.includes('wonderful') ||
      lowerText.includes('😊') || lowerText.includes('😄') || lowerText.includes('💚') ||
      lowerText.includes('good') || lowerText.includes('nice') || lowerText.includes('perfect')) {
    return 'happy';
  }
  
  // Excited
  if (lowerText.includes('excited') || lowerText.includes('wow') || lowerText.includes('yay') ||
      lowerText.includes('awesome!') || lowerText.includes('!!!') || lowerText.includes('🤩') ||
      lowerText.includes('cool!')) {
    return 'excited';
  }
  
  // Surprised
  if (lowerText.includes('surprise') || lowerText.includes('what') || lowerText.includes('really') ||
      lowerText.includes('😲') || lowerText.includes('😮') || lowerText.includes('omg') ||
      lowerText.includes('no way')) {
    return 'surprised';
  }
  
  // Thinking
  if (lowerText.includes('think') || lowerText.includes('hmm') || lowerText.includes('let me') ||
      lowerText.includes('complex') || lowerText.includes('...') || lowerText.includes('interesting') ||
      lowerText.includes('🤔')) {
    return 'thinking';
  }
  
  // Sleepy
  if (lowerText.includes('tired') || lowerText.includes('sleep') || lowerText.includes('sleepy') ||
      lowerText.includes('😴') || lowerText.includes('zzz') || lowerText.includes('exhausted')) {
    return 'sleepy';
  }
  
  // Confused
  if (lowerText.includes('confused') || lowerText.includes('?') || lowerText.includes('dont know') ||
      lowerText.includes('dont understand') || lowerText.includes('😕') || lowerText.includes('huh')) {
    return 'confused';
  }
  
  // Sad
  if (lowerText.includes('sad') || lowerText.includes('unfortunately') || lowerText.includes('sorry') ||
      lowerText.includes('😢') || lowerText.includes('😞') || lowerText.includes('bad')) {
    return 'sad';
  }
  
  // Angry
  if (lowerText.includes('angry') || lowerText.includes('mad') || lowerText.includes('frustrated') ||
      lowerText.includes('😠') || lowerText.includes('annoyed')) {
    return 'angry';
  }
  
  // Speaking (for bot responses)
  if (lowerText.includes('here') || lowerText.includes('let me') || lowerText.includes('i can') ||
      lowerText.includes('i will')) {
    return 'speaking';
  }
  
  // Listening (for user questions)
  if (lowerText.includes('can you') || lowerText.includes('could you') || lowerText.includes('please') ||
      lowerText.includes('help')) {
    return 'listening';
  }
  
  return 'idle';
}
