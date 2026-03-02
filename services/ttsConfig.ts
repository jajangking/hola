// TTS Configuration - Separated to avoid require cycles

export type TTSProvider = 'groq' | 'native';

// Base URLs
export const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// Groq TTS (Orpheus)
export const GROQ_TTS_MODEL = 'canopylabs/orpheus-v1-english';
export const GROQ_VOICES = ['autumn', 'diana', 'hannah', 'austin', 'daniel', 'troy'];
export const GROQ_DEFAULT_VOICE = 'autumn';

// Default voices
export const AVAILABLE_VOICES = GROQ_VOICES.map(id => {
  const names: Record<string, string> = {
    autumn: 'Autumn (Female, Warm)',
    diana: 'Diana (Female, Professional)',
    hannah: 'Hannah (Female, Friendly)',
    austin: 'Austin (Male, Casual)',
    daniel: 'Daniel (Male, Professional)',
    troy: 'Troy (Male, Deep)',
  };
  return { id, name: names[id] || id };
});

export const AVAILABLE_TTS_PROVIDERS = [
  { id: 'groq', name: '🤖 Groq (AI Voice)' },
  { id: 'native', name: '📱 Native (Offline)' },
];

export interface TTSOptions {
  text: string;
  voice?: string;
  model?: string;
  speed?: number;
  provider?: TTSProvider;
}

export function getVoicesForProvider(provider: TTSProvider) {
  return AVAILABLE_VOICES;
}

export function getDefaultVoiceForProvider(provider: TTSProvider): string {
  return GROQ_DEFAULT_VOICE;
}
