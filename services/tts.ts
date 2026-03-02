import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { DEFAULT_SETTINGS } from '@/hooks/useAppSettings';

const TTS_MODEL = 'canopylabs/orpheus-v1-english';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// Available voices for Orpheus English TTS
export const TTS_VOICES = [
  'autumn',
  'diana',
  'hannah',
  'austin',
  'daniel',
  'troy',
];

export interface TTSOptions {
  text: string;
  voice?: string;
  model?: string;
  speed?: number;
}

// Helper function to convert array buffer to base64 without stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // @ts-ignore - btoa exists in React Native
  return btoa(binary);
}

export async function textToSpeech(options: TTSOptions): Promise<Audio.Sound | null> {
  const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  
  if (!apiKey) {
    console.warn('Groq API key not found for TTS');
    return null;
  }

  try {
    const response = await fetch(`${GROQ_BASE_URL}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || TTS_MODEL,
        input: options.text,
        voice: options.voice || DEFAULT_SETTINGS.ttsVoice,
        response_format: 'wav',
        speed: options.speed || DEFAULT_SETTINGS.ttsSpeed,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('TTS API Error:', error);
      return null;
    }

    // Get audio as array buffer
    const audioArrayBuffer = await response.arrayBuffer();
    const audioBase64 = arrayBufferToBase64(audioArrayBuffer);
    
    // Save to file
    // @ts-ignore - expo-file-system types
    const filename = `${FileSystem.documentDirectory}tts_${Date.now()}.wav`;
    // @ts-ignore - expo-file-system types
    await FileSystem.writeAsStringAsync(filename, audioBase64, {
      encoding: 'base64',
    });

    // Load and play audio
    // @ts-ignore - expo-av types
    const { sound } = await Audio.Sound.createAsync(
      { uri: filename },
      { shouldPlay: true }
    );

    return sound;
  } catch (error) {
    console.error('TTS Error:', error);
    return null;
  }
}

export async function playAudioFromUrl(url: string): Promise<Audio.Sound | null> {
  try {
    // @ts-ignore - expo-av types
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: true }
    );
    return sound;
  } catch (error) {
    console.error('Audio Play Error:', error);
    return null;
  }
}
