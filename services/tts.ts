import * as Speech from 'expo-speech';
import Groq from 'groq-sdk';
import Constants from 'expo-constants';
import { DEFAULT_SETTINGS } from '@/hooks/useAppSettings';
import { TTSOptions, GROQ_BASE_URL, GROQ_TTS_MODEL, GROQ_DEFAULT_VOICE } from '@/services/ttsConfig';

// Get API key from environment or app.json extra
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ||
                     process.env.EXPO_GROQ_API_KEY ||
                     Constants.expoConfig?.extra?.groqApiKey;

console.log('[TTS] GROQ_API_KEY exists:', !!GROQ_API_KEY);

let groq: Groq | null = null;
if (GROQ_API_KEY) {
  groq = new Groq({
    apiKey: GROQ_API_KEY,
    dangerouslyAllowBrowser: true,
  });
  console.log('[TTS] Groq client initialized');
} else {
  console.warn('[TTS] Groq API key not found. Please set EXPO_PUBLIC_GROQ_API_KEY in your .env file.');
}

// Native TTS (expo-speech) - Bahasa Indonesia, Free, Unlimited, Always works!
export async function textToSpeech(options: TTSOptions): Promise<null> {
  const provider = options.provider || 'native';
  
  console.log('[TTS] textToSpeech called with provider:', provider);
  console.log('[TTS] settings.ttsProvider:', options.provider);

  if (provider === 'groq') {
    console.log('[TTS] Using Groq TTS');
    return textToSpeechWithGroq(options);
  }

  // Fallback to native TTS
  console.log('[TTS] Using Native TTS');
  try {
    await Speech.speak(options.text || '', {
      language: 'id-ID', // Bahasa Indonesia
      pitch: 1.0,
      rate: options.speed || DEFAULT_SETTINGS.ttsSpeed,
      onStart: () => console.log('TTS started'),
      onDone: () => console.log('TTS completed'),
      onError: (error) => console.error('TTS error:', error),
    });
  } catch (error) {
    console.error('TTS Error:', error);
  }
  return null;
}

export async function textToSpeechWithGroq(options: TTSOptions): Promise<null> {
  if (!groq) {
    console.warn('Groq client not initialized. Falling back to native TTS.');
    return textToSpeechNative(options);
  }

  try {
    const response = await groq.audio.speech.create({
      model: options.model || GROQ_TTS_MODEL,
      input: options.text || '',
      voice: options.voice || GROQ_DEFAULT_VOICE,
      response_format: 'wav',
      speed: options.speed || 1.0,
    });

    // Get the audio data as ArrayBuffer
    const audioBuffer = await response.arrayBuffer();
    
    // Convert to base64 for playing
    const base64Audio = arrayBufferToBase64(audioBuffer);
    const dataUrl = `data:audio/wav;base64,${base64Audio}`;

    // Play the audio
    await playAudioFromUrl(dataUrl);
    
    return null;
  } catch (error) {
    console.error('Groq TTS Error:', error);
    // Fallback to native TTS on error
    return textToSpeechNative(options);
  }
}

function textToSpeechNative(options: TTSOptions): Promise<null> {
  return new Promise((resolve) => {
    Speech.speak(options.text || '', {
      language: 'id-ID',
      pitch: 1.0,
      rate: options.speed || DEFAULT_SETTINGS.ttsSpeed,
      onStart: () => console.log('Native TTS started'),
      onDone: () => {
        console.log('Native TTS completed');
        resolve(null);
      },
      onError: (error) => {
        console.error('Native TTS error:', error);
        resolve(null);
      },
    });
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function stopSpeaking(): Promise<void> {
  await Speech.stop();
}

export async function playAudioFromUrl(url: string): Promise<null> {
  try {
    const { Audio } = await import('expo-av');
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true }
    );

    sound.setOnPlaybackStatusUpdate((status: any) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch (error) {
    console.error('Play audio error:', error);
  }
  return null;
}
