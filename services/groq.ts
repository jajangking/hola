import Groq from 'groq-sdk';
import Constants from 'expo-constants';
import { DEFAULT_SETTINGS } from '@/hooks/useAppSettings';

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
}

const SYSTEM_PROMPT: ChatMessage = {
  role: 'system',
  content: `You are Mochibot, a friendly and helpful AI companion with a cute personality.
You communicate in a warm, conversational tone.
You can use emojis occasionally to express emotions.
Keep responses concise and engaging (2-4 sentences typically).`,
};

export async function chatWithGroq(messages: ChatMessage[], options?: GroqOptions): Promise<string> {
  if (!groq) {
    return "⚠️ API key not configured. Please add EXPO_PUBLIC_GROQ_API_KEY to your .env file.";
  }

  try {
    const allMessages = [SYSTEM_PROMPT, ...messages];

    const completion = await groq.chat.completions.create({
      model: options?.model || DEFAULT_SETTINGS.chatModel,
      messages: allMessages,
      temperature: options?.temperature || DEFAULT_SETTINGS.temperature,
      max_tokens: 500,
      top_p: 1,
      stream: false,
    });

    return completion.choices[0]?.message?.content || "Hmm, I seem to have lost my thoughts. Could you try again?";
  } catch (error) {
    console.error('Groq API Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return "Oops! My API key seems to be missing. Please ask the developer to add it.";
      }
      if (error.message.includes('rate limit')) {
        return "I'm getting too many requests! Let me catch my breath and try again in a moment.";
      }
    }

    return "Sorry, I'm having trouble connecting right now. Please try again!";
  }
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
