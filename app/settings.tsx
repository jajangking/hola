import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Switch, TouchableOpacity, Text, TextInput, Alert, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppSettings, AVAILABLE_MODELS } from '@/hooks/useAppSettings';
import { getVoicesForProvider, AVAILABLE_TTS_PROVIDERS } from '@/services/ttsConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadUserMemory,
  clearUserMemory,
  exportUserMemory,
  removePersonalFact,
  addPersonalFact,
  updatePreferences,
  addPersonalityTrait,
  type UserMemory,
  type PersonalFact,
  saveUserMemory,
} from '@/services/userMemory';

interface SettingsScreenProps {
  onGoBack: () => void;
  initialMemory: UserMemory | null;
}

export default function SettingsScreen({ onGoBack, initialMemory }: SettingsScreenProps) {
  const { settings, updateSetting, resetSettings, resetTTSProvider, status } = useAppSettings();
  const [groqApiKey, setGroqApiKey] = useState('');
  const [userMemory, setUserMemory] = useState<UserMemory | null>(initialMemory);
  const [memoryLoading, setMemoryLoading] = useState(false);
  
  // New state for custom inputs
  const [newFactText, setNewFactText] = useState('');
  const [newFactCategory, setNewFactCategory] = useState<PersonalFact['category']>('other');
  const [newTraitText, setNewTraitText] = useState('');
  const [botName, setBotName] = useState('Mochibot');
  const [showAddFact, setShowAddFact] = useState(false);
  const [showAddTrait, setShowAddTrait] = useState(false);

  // Handle Android hardware back button in settings
  React.useEffect(() => {
    const onBackPress = () => {
      onGoBack();
      return true; // Prevent exiting app
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [onGoBack]);

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

  const loadUserMemoryData = async () => {
    setMemoryLoading(true);
    try {
      const memory = await loadUserMemory();
      setUserMemory(memory);
    } catch (error) {
      console.error('Error loading user memory:', error);
      Alert.alert('Error', 'Failed to load user memory');
    } finally {
      setMemoryLoading(false);
    }
  };

  const handleExportMemory = async () => {
    try {
      const exported = await exportUserMemory();
      Alert.alert(
        'Export Memory',
        'Your data has been exported to console. In production, this would download a JSON file.',
        [{ text: 'OK' }]
      );
      console.log('=== USER MEMORY EXPORT ===');
      console.log(exported);
      console.log('==========================');
    } catch (error) {
      Alert.alert('Error', 'Failed to export memory');
    }
  };

  const handleClearMemory = async () => {
    Alert.alert(
      'Clear All Memory',
      'Are you sure you want to delete all learned data about you? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearUserMemory();
              setUserMemory(null);
              Alert.alert('Success', 'All memory has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear memory');
            }
          },
        },
      ]
    );
  };

  const handleRemoveFact = async (factId: string) => {
    try {
      await removePersonalFact(factId);
      loadUserMemoryData(); // Refresh
      Alert.alert('Success', 'Fact removed');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove fact');
    }
  };

  const handleAddFact = async () => {
    if (!newFactText.trim()) {
      Alert.alert('Error', 'Please enter a fact');
      return;
    }
    await addPersonalFact(newFactText, newFactCategory, 'Manual input', 1.0);
    setNewFactText('');
    setShowAddFact(false);
    loadUserMemoryData();
    Alert.alert('Success', 'Fact added!');
  };

  const handleAddTrait = async () => {
    if (!newTraitText.trim()) {
      Alert.alert('Error', 'Please enter a trait');
      return;
    }
    await addPersonalityTrait(newTraitText, 'Manual input', 1.0);
    setNewTraitText('');
    setShowAddTrait(false);
    loadUserMemoryData();
    Alert.alert('Success', 'Trait added!');
  };

  const handleUpdatePreference = async (key: keyof UserPreferences, value: any) => {
    await updatePreferences({ [key]: value });
    loadUserMemoryData();
  };

  const handleUpdateBotName = async () => {
    if (!botName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    try {
      await AsyncStorage.setItem('@mochibot_bot_name', botName.trim());
      Alert.alert('Success', `Bot name changed to ${botName}!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to save bot name');
    }
  };

  const handleLoadBotName = async () => {
    try {
      const name = await AsyncStorage.getItem('@mochibot_bot_name');
      if (name) setBotName(name);
    } catch (error) {
      console.error('Error loading bot name:', error);
    }
  };

  // Load initial memory on mount
  React.useEffect(() => {
    if (initialMemory) {
      setUserMemory(initialMemory);
    } else {
      loadUserMemoryData();
    }
  }, [initialMemory]);

  React.useEffect(() => {
    loadApiKeys();
    handleLoadBotName();
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

        {/* Bot Customization Section */}
        <ThemedView style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>🤖 Bot Customization</ThemedText>
          </View>

          <View style={styles.setting}>
            <ThemedText style={styles.settingLabel}>Bot Name</ThemedText>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={botName}
                onChangeText={setBotName}
                placeholder="Bot name"
                placeholderTextColor="#888"
              />
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateBotName}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.setting}>
            <ThemedText style={styles.settingLabel}>Bot Personality Preset</ThemedText>
            <View style={styles.presetRow}>
              {['friendly', 'professional', 'playful', 'caring'].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetButton,
                    settings.tone === preset && styles.presetButtonActive,
                  ]}
                  onPress={() => {
                    updateSetting('tone', preset as any);
                    handleUpdatePreference('tone', preset as any);
                  }}
                >
                  <Text style={[
                    styles.presetButtonText,
                    settings.tone === preset && styles.presetButtonTextActive,
                  ]}>
                    {preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ThemedView>

        {/* Memory & Privacy Section */}
        <ThemedView style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>🧠 Memory & Privacy</ThemedText>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadUserMemoryData}
              disabled={memoryLoading}
            >
              <Text style={styles.refreshButtonText}>{memoryLoading ? '...' : '🔄'}</Text>
            </TouchableOpacity>
          </View>

          <ThemedText style={styles.settingDescription}>
            Mochibot learns from your conversations to provide more personalized responses.
            You can view, export, or delete this data anytime.
          </ThemedText>

          {/* Add Fact Button */}
          <TouchableOpacity
            style={styles.addFactButton}
            onPress={() => setShowAddFact(!showAddFact)}
          >
            <Text style={styles.addFactButtonText}>{showAddFact ? '✕ Cancel' : '➕ Add Personal Fact'}</Text>
          </TouchableOpacity>

          {showAddFact && (
            <View style={styles.addFactForm}>
              <TextInput
                style={styles.textInputFull}
                value={newFactText}
                onChangeText={setNewFactText}
                placeholder="E.g., My name is John, I live in Jakarta"
                placeholderTextColor="#888"
                multiline
              />
              <View style={styles.categoryRow}>
                <Text style={styles.categoryLabel}>Category:</Text>
                <View style={styles.categoryButtons}>
                  {['name', 'location', 'hobby', 'work', 'other'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        newFactCategory === cat && styles.categoryButtonActive,
                      ]}
                      onPress={() => setNewFactCategory(cat as any)}
                    >
                      <Text style={[
                        styles.categoryButtonText,
                        newFactCategory === cat && styles.categoryButtonTextActive,
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleAddFact}
              >
                <Text style={styles.confirmButtonText}>✓ Add Fact</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Add Trait Button */}
          <TouchableOpacity
            style={styles.addTraitButton}
            onPress={() => setShowAddTrait(!showAddTrait)}
          >
            <Text style={styles.addTraitButtonText}>{showAddTrait ? '✕ Cancel' : '➕ Add Behavior Trait'}</Text>
          </TouchableOpacity>

          {showAddTrait && (
            <View style={styles.addFactForm}>
              <TextInput
                style={styles.textInputFull}
                value={newTraitText}
                onChangeText={setNewTraitText}
                placeholder="E.g., Patient, Humorous, Empathetic"
                placeholderTextColor="#888"
                multiline
              />
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleAddTrait}
              >
                <Text style={styles.confirmButtonText}>✓ Add Trait</Text>
              </TouchableOpacity>
            </View>
          )}

          {userMemory ? (
            <>
              {/* Personal Facts */}
              {userMemory.personalFacts.length > 0 && (
                <View style={styles.memorySubsection}>
                  <ThemedText style={styles.memorySubsectionTitle}>📝 Personal Facts</ThemedText>
                  {userMemory.personalFacts.map((fact: any) => (
                    <View key={fact.id} style={styles.memoryItem}>
                      <View style={styles.memoryItemContent}>
                        <Text style={styles.memoryItemText}>• {fact.fact}</Text>
                        <Text style={styles.memoryItemMeta}>{fact.category} • {new Date(fact.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeFactButton}
                        onPress={() => handleRemoveFact(fact.id)}
                      >
                        <Text style={styles.removeFactButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Preferences */}
              <View style={styles.memorySubsection}>
                <ThemedText style={styles.memorySubsectionTitle}>⚙️ Learned Preferences</ThemedText>
                <View style={styles.memoryItem}>
                  <Text style={styles.memoryItemText}>
                    Language: {userMemory.preferences.language} | Tone: {userMemory.preferences.tone} | 
                    Response: {userMemory.preferences.responseLength} | Emoji: {userMemory.preferences.emojiUsage}
                  </Text>
                </View>
                {userMemory.preferences.favoriteTopics.length > 0 && (
                  <View style={styles.memoryItem}>
                    <Text style={styles.memoryItemText}>
                      Favorite Topics: {userMemory.preferences.favoriteTopics.join(', ')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Personality Traits */}
              {userMemory.personalityTraits.length > 0 && (
                <View style={styles.memorySubsection}>
                  <ThemedText style={styles.memorySubsectionTitle}>🎭 Personality Traits</ThemedText>
                  {userMemory.personalityTraits.map((trait: any) => (
                    <View key={trait.id} style={styles.memoryItem}>
                      <Text style={styles.memoryItemText}>• {trait.trait}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Stats */}
              <View style={styles.memorySubsection}>
                <ThemedText style={styles.memorySubsectionTitle}>📊 Conversation Stats</ThemedText>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userMemory.conversationSummary.totalConversations}</Text>
                    <Text style={styles.statLabel}>Conversations</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userMemory.personalFacts.length}</Text>
                    <Text style={styles.statLabel}>Facts</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userMemory.personalityTraits.length}</Text>
                    <Text style={styles.statLabel}>Traits</Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyMemory}>
              <ThemedText style={styles.emptyMemoryText}>
                {memoryLoading ? 'Loading memory...' : 'No memory data yet. Start chatting to let Mochibot learn about you!'}
              </ThemedText>
            </View>
          )}

          {/* Privacy Actions */}
          <View style={styles.privacyActions}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportMemory}
            >
              <Text style={styles.exportButtonText}>📥 Export My Data</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearMemory}
            >
              <Text style={styles.clearButtonText}>🗑️ Clear All Memory</Text>
            </TouchableOpacity>
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
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#2a2a4e',
    borderWidth: 1,
    borderColor: '#3a3a5e',
  },
  refreshButtonText: {
    fontSize: 16,
  },
  memorySubsection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
  },
  memorySubsectionTitle: {
    fontSize: 14,
    color: '#00ff88',
    fontWeight: '600',
    marginBottom: 12,
  },
  memoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2a2a4e',
    borderRadius: 8,
    marginBottom: 8,
  },
  memoryItemContent: {
    flex: 1,
  },
  memoryItemText: {
    fontSize: 13,
    color: '#ffffff',
  },
  memoryItemMeta: {
    fontSize: 11,
    color: '#888888',
    marginTop: 4,
  },
  removeFactButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#ff6b6b',
    marginLeft: 8,
  },
  removeFactButtonText: {
    color: '#0a0a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyMemory: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMemoryText: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2a2a4e',
    borderRadius: 8,
    minWidth: 80,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00ff88',
  },
  statLabel: {
    fontSize: 11,
    color: '#888888',
    marginTop: 4,
  },
  privacyActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  exportButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#0a0a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#ff6b6b',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#0a0a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#2a2a4e',
    borderWidth: 1,
    borderColor: '#3a3a5e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
  },
  textInputFull: {
    width: '100%',
    backgroundColor: '#2a2a4e',
    borderWidth: 1,
    borderColor: '#3a3a5e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    minWidth: 80,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a4e',
    borderWidth: 1,
    borderColor: '#3a3a5e',
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  presetButtonText: {
    color: '#888888',
    fontSize: 12,
  },
  presetButtonTextActive: {
    color: '#0a0a1a',
    fontWeight: '600',
  },
  addFactButton: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    marginTop: 16,
  },
  addFactButtonText: {
    color: '#0a0a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  addTraitButton: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F39C12',
    alignItems: 'center',
    marginTop: 12,
  },
  addTraitButtonText: {
    color: '#0a0a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  addFactForm: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'column',
    gap: 8,
  },
  categoryLabel: {
    fontSize: 13,
    color: '#888888',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#2a2a4e',
    borderWidth: 1,
    borderColor: '#3a3a5e',
  },
  categoryButtonActive: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  categoryButtonText: {
    color: '#888888',
    fontSize: 11,
  },
  categoryButtonTextActive: {
    color: '#0a0a1a',
    fontWeight: '600',
  },
  confirmButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#00ff88',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#0a0a1a',
    fontSize: 14,
    fontWeight: '600',
  },
});
