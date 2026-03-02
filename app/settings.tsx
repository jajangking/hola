import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Switch, TouchableOpacity, Text, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppSettings, AVAILABLE_MODELS } from '@/hooks/useAppSettings';
import { getVoicesForProvider, AVAILABLE_TTS_PROVIDERS } from '@/services/ttsConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsScreenProps {
  onGoBack: () => void;
}

export default function SettingsScreen({ onGoBack }: SettingsScreenProps) {
  const { settings, updateSetting, resetSettings, resetTTSProvider, status } = useAppSettings();
  const [groqApiKey, setGroqApiKey] = useState('');

  const loadApiKeys = async () => {
    try {
      const groq = await AsyncStorage.getItem('@mochibot_groq_key');
      setGroqApiKey(groq || '');
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const saveApiKey = async (provider: 'groq', key: string) => {
    try {
      const storageKey = `@mochibot_${provider}_key`;
      if (key.trim()) {
        await AsyncStorage.setItem(storageKey, key.trim());
        Alert.alert('Success', `${provider} API key saved!`);
      } else {
        await AsyncStorage.removeItem(storageKey);
        Alert.alert('Success', `${provider} API key removed!`);
      }
      loadApiKeys();
    } catch (error) {
      Alert.alert('Error', 'Failed to save API key');
      console.error('Error saving API key:', error);
    }
  };

  React.useEffect(() => {
    loadApiKeys();
  }, []);

  const StatusBadge = ({ working }: { working: boolean }) => (
    <View style={[
      styles.statusBadge,
      working ? styles.statusBadgeWorking : styles.statusBadgeNotWorking,
    ]}>
      <Text style={styles.statusBadgeText}>
        {working ? '✓ Working' : '✗ Not Working'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>⚙️ Settings</ThemedText>
        </View>

        {/* TTS Settings */}
        <ThemedView style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>🎤 Text-to-Speech</ThemedText>
            <StatusBadge working={status.tts} />
          </View>
          
          <View style={styles.setting}>
            <ThemedText style={styles.settingLabel}>Enable TTS</ThemedText>
            <Switch
              value={settings.ttsEnabled}
              onValueChange={(value) => { updateSetting('ttsEnabled', value); }}
              trackColor={{ false: '#2a2a4e', true: '#00ff88' }}
              thumbColor="#0a0a1a"
            />
          </View>

          <View style={styles.setting}>
            <ThemedText style={styles.settingLabel}>Provider: {settings.ttsProvider}</ThemedText>
            <View style={styles.modelSelector}>
              {AVAILABLE_TTS_PROVIDERS.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.modelButton,
                    settings.ttsProvider === provider.id && styles.modelButtonActive,
                  ]}
                  onPress={() => updateSetting('ttsProvider', provider.id as any)}
                >
                  <Text style={[
                    styles.modelButtonText,
                    settings.ttsProvider === provider.id && styles.modelButtonTextActive,
                  ]}>
                    {provider.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.resetProviderButton}
              onPress={async () => {
                await resetTTSProvider();
                Alert.alert('Success', 'TTS Provider reset to Groq!');
              }}
            >
              <Text style={styles.resetProviderButtonText}>🔄 Reset to Groq</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.setting}>
            <ThemedText style={styles.settingLabel}>Voice</ThemedText>
            <View style={styles.voiceSelector}>
              {getVoicesForProvider(settings.ttsProvider).map((voice) => (
                <TouchableOpacity
                  key={voice.id}
                  style={[
                    styles.voiceButton,
                    settings.ttsVoice === voice.id && styles.voiceButtonActive,
                  ]}
                  onPress={() => updateSetting('ttsVoice', voice.id)}
                >
                  <Text style={[
                    styles.voiceButtonText,
                    settings.ttsVoice === voice.id && styles.voiceButtonTextActive,
                  ]}>
                    {voice.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.setting}>
            <ThemedText style={styles.settingLabel}>Speed: {settings.ttsSpeed}x</ThemedText>
            <View style={styles.speedControls}>
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[
                    styles.speedButton,
                    settings.ttsSpeed === speed && styles.speedButtonActive,
                  ]}
                  onPress={() => updateSetting('ttsSpeed', speed)}
                >
                  <Text style={[
                    styles.speedButtonText,
                    settings.ttsSpeed === speed && styles.speedButtonTextActive,
                  ]}>
                    {speed}x
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ThemedView>

        {/* API Keys Settings */}
        <ThemedView style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>🔑 API Keys</ThemedText>
          </View>

          <View style={styles.setting}>
            <ThemedText style={styles.settingLabel}>Groq API Key</ThemedText>
            <TextInput
              style={styles.apiKeyInput}
              value={groqApiKey}
              onChangeText={setGroqApiKey}
              placeholder="gsk_..."
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => saveApiKey('groq', groqApiKey)}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </ThemedView>

        {/* AI Settings */}
        <ThemedView style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>🤖 AI Model</ThemedText>
            <StatusBadge working={status.ai} />
          </View>
          
          <View style={styles.setting}>
            <ThemedText style={styles.settingLabel}>Chat Model</ThemedText>
            <View style={styles.modelSelector}>
              {AVAILABLE_MODELS.map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelButton,
                    settings.chatModel === model.id && styles.modelButtonActive,
                  ]}
                  onPress={() => updateSetting('chatModel', model.id)}
                >
                  <Text style={[
                    styles.modelButtonText,
                    settings.chatModel === model.id && styles.modelButtonTextActive,
                  ]}>
                    {model.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.setting}>
            <ThemedText style={styles.settingLabel}>Emotion Model</ThemedText>
            <View style={styles.modelSelector}>
              {AVAILABLE_MODELS.filter(m => m.id.includes('8b') || m.id.includes('Fast')).map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelButton,
                    settings.emotionModel === model.id && styles.modelButtonActive,
                  ]}
                  onPress={() => updateSetting('emotionModel', model.id)}
                >
                  <Text style={[
                    styles.modelButtonText,
                    settings.emotionModel === model.id && styles.modelButtonTextActive,
                  ]}>
                    {model.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.setting}>
            <ThemedText style={styles.settingLabel}>Temperature: {settings.temperature}</ThemedText>
            <ThemedText style={styles.settingDescription}>
              Lower = more focused, Higher = more creative
            </ThemedText>
            <View style={styles.speedControls}>
              {[0.3, 0.5, 0.7, 0.9].map((temp) => (
                <TouchableOpacity
                  key={temp}
                  style={[
                    styles.speedButton,
                    settings.temperature === temp && styles.speedButtonActive,
                  ]}
                  onPress={() => updateSetting('temperature', temp)}
                >
                  <Text style={[
                    styles.speedButtonText,
                    settings.temperature === temp && styles.speedButtonTextActive,
                  ]}>
                    {temp}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ThemedView>

        {/* UI Settings */}
        <ThemedView style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>🎨 UI Settings</ThemedText>
            <StatusBadge working={status.ui} />
          </View>
          
          <View style={styles.setting}>
            <ThemedText style={styles.settingLabel}>Show Secondary Emoji</ThemedText>
            <Switch
              value={settings.showSecondaryEmoji}
              onValueChange={(value) => { updateSetting('showSecondaryEmoji', value); }}
              trackColor={{ false: '#2a2a4e', true: '#00ff88' }}
              thumbColor="#0a0a1a"
            />
          </View>

          <View style={styles.setting}>
            <ThemedText style={styles.settingLabel}>Emoji Animation Speed</ThemedText>
            <View style={styles.speedControls}>
              {[1000, 1500, 2000, 2500].map((speed) => (
                <TouchableOpacity
                  key={speed}
                  style={[
                    styles.speedButton,
                    settings.emojiAlternateSpeed === speed && styles.speedButtonActive,
                  ]}
                  onPress={() => updateSetting('emojiAlternateSpeed', speed)}
                >
                  <Text style={[
                    styles.speedButtonText,
                    settings.emojiAlternateSpeed === speed && styles.speedButtonTextActive,
                  ]}>
                    {speed / 1000}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ThemedView>

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={resetSettings}>
          <ThemedText style={styles.resetButtonText}>🔄 Reset to Defaults</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={onGoBack}>
          <ThemedText style={styles.backButtonText}>← Back to Chat</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    color: '#00ff88',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  sectionTitle: {
    marginBottom: 16,
    color: '#00ff88',
  },
  setting: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 15,
    color: '#ffffff',
    marginBottom: 10,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 10,
  },
  voiceSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  voiceButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a4e',
    borderWidth: 1,
    borderColor: '#3a3a5e',
  },
  voiceButtonActive: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  voiceButtonText: {
    color: '#888888',
    fontSize: 13,
  },
  voiceButtonTextActive: {
    color: '#0a0a1a',
    fontWeight: '600',
  },
  speedControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2a2a4e',
    borderWidth: 1,
    borderColor: '#3a3a5e',
    minWidth: 50,
    alignItems: 'center',
  },
  speedButtonActive: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  speedButtonText: {
    color: '#888888',
    fontSize: 13,
  },
  speedButtonTextActive: {
    color: '#0a0a1a',
    fontWeight: '600',
  },
  modelSelector: {
    gap: 8,
  },
  modelButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a4e',
    borderWidth: 1,
    borderColor: '#3a3a5e',
  },
  modelButtonActive: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  modelButtonText: {
    color: '#888888',
    fontSize: 13,
  },
  modelButtonTextActive: {
    color: '#0a0a1a',
    fontWeight: '600',
  },
  resetButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2a2a4e',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3a3a5e',
  },
  resetButtonText: {
    color: '#ff6b6b',
    fontSize: 15,
    fontWeight: '600',
  },
  backButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#00ff88',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#0a0a1a',
    fontSize: 15,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeWorking: {
    backgroundColor: '#00ff88',
  },
  statusBadgeNotWorking: {
    backgroundColor: '#ff6b6b',
  },
  statusBadgeText: {
    color: '#0a0a1a',
    fontSize: 11,
    fontWeight: '600',
  },
  apiKeyInput: {
    backgroundColor: '#2a2a4e',
    borderWidth: 1,
    borderColor: '#3a3a5e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#00ff88',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  saveButtonText: {
    color: '#0a0a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  resetProviderButton: {
    backgroundColor: '#00ff88',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  resetProviderButtonText: {
    color: '#0a0a1a',
    fontSize: 14,
    fontWeight: '600',
  },
});
