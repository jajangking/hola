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
    console.log('[Groq TTS] Requesting speech with model:', options.model || GROQ_TTS_MODEL);
    console.log('[Groq TTS] Voice:', options.voice || GROQ_DEFAULT_VOICE);
    console.log('[Groq TTS] Text length:', (options.text || '').length);

    const response = await groq.audio.speech.create({
      model: options.model || GROQ_TTS_MODEL,
      input: options.text || '',
      voice: options.voice || GROQ_DEFAULT_VOICE,
      response_format: 'wav',
      speed: options.speed || 1.0,
    });

    console.log('[Groq TTS] Response received, getting array buffer...');

    // Get the audio data as ArrayBuffer
    const audioBuffer = await response.arrayBuffer();
    console.log('[Groq TTS] Audio buffer size:', audioBuffer.byteLength);

    // Convert to base64 for playing
    const base64Audio = arrayBufferToBase64(audioBuffer);
    const dataUrl = `data:audio/wav;base64,${base64Audio}`;

    console.log('[Groq TTS] Playing audio...');

    // Play the audio
    await playAudioFromUrl(dataUrl);

    return null;
  } catch (error: any) {
    console.error('Groq TTS Error:', error?.message || error);
    // Check for specific error types
    if (error?.message?.includes('Parsing failed')) {
      console.warn('[Groq TTS] Model output parse error - this may be a temporary API issue');
    }
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
    console.log('[playAudioFromUrl] Playing:', url.substring(0, 50) + '...');

    // Use expo-audio NativeModule directly (SDK 54+)
    const AudioModule = await import('expo-audio/build/AudioModule');
    const nativeModule = AudioModule.default;
    
    if (!nativeModule || !nativeModule.AudioPlayer) {
      console.error('[playAudioFromUrl] AudioPlayer not available in native module');
      console.log('[playAudioFromUrl] Module:', !!nativeModule);
      console.log('[playAudioFromUrl] AudioPlayer:', !!nativeModule?.AudioPlayer);
      return null;
    }

    const AudioPlayerClass = nativeModule.AudioPlayer;

    // Create new player instance
    const player = new AudioPlayerClass({ uri: url }, 1000, false);
    
    // Play the audio
    player.play();
    console.log('[playAudioFromUrl] Audio playing...');

    // Clean up when done using remove()
    const cleanup = () => {
      if (player && typeof player.remove === 'function') {
        player.remove();
        console.log('[playAudioFromUrl] Player cleaned up');
      }
    };

    // Check periodically if playback finished
    const checkInterval = setInterval(() => {
      if (player && !player.playing && player.currentTime > 0) {
        cleanup();
        clearInterval(checkInterval);
      }
    }, 1000);

    // Also cleanup after max duration (60s)
    setTimeout(cleanup, 60000);
  } catch (error) {
    console.error('Play audio error:', error);
  }
  return null;
}
