import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppSettings {
  // TTS Settings
  ttsVoice: string;
  ttsSpeed: number;
  ttsEnabled: boolean;

  // AI Settings
  chatModel: string;
  emotionModel: string;
  temperature: number;

  // UI Settings
  showSecondaryEmoji: boolean;
  emojiAlternateSpeed: number;
}

export interface SettingsStatus {
  tts: boolean;
  ai: boolean;
  ui: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  // TTS
  ttsVoice: 'autumn',
  ttsSpeed: 1.0,
  ttsEnabled: true,
  
  // AI
  chatModel: 'llama-3.3-70b-versatile',
  emotionModel: 'llama-3.1-8b-instant',
  temperature: 0.7,
  
  // UI
  showSecondaryEmoji: true,
  emojiAlternateSpeed: 1500,
};

export const AVAILABLE_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Best)', provider: 'Meta' },
  { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', provider: 'Meta' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Fast)', provider: 'Meta' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B MoE', provider: 'Mistral' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', provider: 'Google' },
  { id: 'gpt-oss-120b', name: 'GPT-OSS 120B', provider: 'OpenAI' },
  { id: 'gpt-oss-20b', name: 'GPT-OSS 20B (Fast)', provider: 'OpenAI' },
];

export const AVAILABLE_VOICES = [
  { id: 'autumn', name: 'Autumn (Female, Warm)' },
  { id: 'diana', name: 'Diana (Female, Professional)' },
  { id: 'hannah', name: 'Hannah (Female, Friendly)' },
  { id: 'austin', name: 'Austin (Male, Casual)' },
  { id: 'daniel', name: 'Daniel (Male, Professional)' },
  { id: 'troy', name: 'Troy (Male, Deep)' },
];

const STORAGE_KEY = '@mochibot_settings';

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<SettingsStatus>({ tts: false, ai: false, ui: false });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
      // Debug: Check AsyncStorage status
      setStatus({
        tts: true,
        ai: true,
        ui: true,
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      setStatus({ tts: false, ai: false, ui: false });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSettings(updated);
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  };

  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    return saveSettings({ [key]: value });
  };

  const resetSettings = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setSettings(DEFAULT_SETTINGS);
      return true;
    } catch (error) {
      console.error('Error resetting settings:', error);
      return false;
    }
  };

  return {
    settings,
    isLoading,
    status,
    saveSettings,
    updateSetting,
    resetSettings,
  };
}
