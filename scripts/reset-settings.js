/**
 * Reset Mochibot Settings
 * Run with: node scripts/reset-settings.js
 * 
 * This clears all stored settings from AsyncStorage
 */

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

const STORAGE_KEYS = [
  '@mochibot_settings',
  '@mochibot_groq_key',
  '@mochibot_elevenlabs_key',
  '@mochibot_openai_key',
];

async function resetSettings() {
  console.log('🔄 Resetting Mochibot settings...\n');

  try {
    // Note: This script needs to run in React Native context
    // For direct AsyncStorage access, use Expo DevTools console instead:
    
    console.log('To reset settings, open Expo DevTools console and run:\n');
    console.log('```javascript');
    console.log("const AsyncStorage = require('@react-native-async-storage/async-storage').default;");
    STORAGE_KEYS.forEach(key => {
      console.log(`await AsyncStorage.removeItem('${key}');`);
    });
    console.log('console.log(\'✅ Settings reset!\');');
    console.log('```\n');

    console.log('Or simply:');
    console.log('1. Open app Settings (⚙️)');
    console.log('2. Click "🔄 Reset to Defaults"');
    console.log('3. Select Groq as TTS Provider');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

resetSettings();
