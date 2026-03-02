import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, TouchableOpacity, Text, Alert, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MochibotFace from './MochibotFace';
import { AnimatedChatBubble, TypingIndicator } from './AnimatedChatBubble';
import { ChatInput } from './ChatInput';
import { ThemedText } from './themed-text';
import { chatWithEmotion, ChatMessage as GroqMessage, MochibotState, detectEmotionFromText } from '@/services/groq';
import { textToSpeech, stopSpeaking as stopTTS } from '@/services/tts';
import { IconSymbol } from './ui/icon-symbol';
import { useAppSettings, AppSettings } from '@/hooks/useAppSettings';
import SettingsScreen from '@/app/settings';
import { analyzeAndLearn, loadUserMemory, type UserMemory } from '@/services/userMemory';
import {
  getAllSessions,
  getCurrentSessionId,
  createSession,
  saveSessionMessages,
  getSessionById,
  deleteSession,
  regenerateSessionTitle,
  type ChatSession,
  type ChatMessage as HistoryMessage,
} from '@/services/chatHistory';

type MochibotStateType = MochibotState;

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: '1',
    text: "Konnichiwa! 👋 I'm Mochibot, your AI companion. How can I help you today?",
    sender: 'bot',
    timestamp: new Date(),
  },
];

export default function ChatScreen() {
  const { settings, refreshSettings } = useAppSettings();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [mochibotState, setMochibotState] = useState<MochibotStateType>('happy');
  const [primaryEmoji, setPrimaryEmoji] = useState('😄');
  const [secondaryEmoji, setSecondaryEmoji] = useState('✨');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [ttsError, setTtsError] = useState(false);
  const [userMemory, setUserMemory] = useState<UserMemory | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load user memory and current session on mount
  useEffect(() => {
    loadUserMemory().then(setUserMemory);
    loadCurrentSession();
  }, []);

  // Load chat sessions when history is shown
  useEffect(() => {
    if (showHistory) {
      getAllSessions().then(setChatSessions);
    }
  }, [showHistory]);

  // Load current session messages
  const loadCurrentSession = async () => {
    try {
      const sessionId = await getCurrentSessionId();
      if (sessionId) {
        const session = await getSessionById(sessionId);
        if (session && session.messages.length > 0) {
          // Convert history messages to chat messages
          const convertedMessages: ChatMessage[] = session.messages.map((m) => ({
            id: m.id,
            text: m.text,
            sender: m.sender,
            timestamp: new Date(m.timestamp),
          }));
          setMessages(convertedMessages);
          setCurrentSessionId(sessionId);
          return;
        }
      }
      // Create new session if no existing one
      const newSession = await createSession();
      setCurrentSessionId(newSession.id);
    } catch (error) {
      console.error('[ChatScreen] Error loading session:', error);
    }
  };

  // Save messages to session
  const saveCurrentSession = async (msgs: ChatMessage[]) => {
    if (!currentSessionId) return;
    
    const historyMessages: HistoryMessage[] = msgs.map((m) => ({
      id: m.id,
      text: m.text,
      sender: m.sender,
      timestamp: m.timestamp.getTime(),
    }));
    
    await saveSessionMessages(currentSessionId, historyMessages);
  };

  // Handle Android hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (showSettings) {
        setShowSettings(false);
        return true; // Prevent default back behavior (exiting app)
      }
      return false; // Allow default behavior (exit app from chat)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [showSettings]);

  // Refresh settings when returning from settings screen
  useEffect(() => {
    if (!showSettings) {
      refreshSettings();
    }
  }, [showSettings]);

  // Log settings changes
  useEffect(() => {
    console.log('[ChatScreen] Settings changed:', settings);
  }, [settings]);

  // Detect initial emotion on mount
  useEffect(() => {
    const result = detectEmotionFromText(INITIAL_MESSAGES[0].text);
    setMochibotState(result);
    setPrimaryEmoji('😄');
    setSecondaryEmoji('✨');
  }, []);

  const speakResponse = async (text: string) => {
    if (!settings.ttsEnabled || isSpeaking) return;

    setIsSpeaking(true);
    await textToSpeech({ 
      text, 
      provider: settings.ttsProvider,
      voice: settings.ttsVoice,
      speed: settings.ttsSpeed,
    });
    setIsSpeaking(false);
  };

  const fixTTS = async () => {
    setTtsError(false);
    Alert.alert('TTS Info', 'Using Native TTS - Free, Offline, Bahasa Indonesia!');
  };

  const stopSpeaking = async () => {
    await stopTTS();
    setIsSpeaking(false);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = (text: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setMochibotState('listening');

    // Convert FULL conversation history to Groq message format
    // This gives AI full context of the conversation
    const groqMessages: GroqMessage[] = updatedMessages.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));

    // Call Groq API with full context
    setTimeout(() => {
      setMochibotState('thinking');
      setIsTyping(true);

      chatWithEmotion(groqMessages, {
        model: settings.chatModel,
        temperature: settings.temperature,
        useMemory: true, // Enable personalized responses based on user memory
      }).then((result) => {
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: result.response,
          sender: 'bot',
          timestamp: new Date(),
        };

        // Use emotion from response
        setMochibotState(result.emotion);
        setPrimaryEmoji(result.primaryEmoji);
        setSecondaryEmoji(result.secondaryEmoji || '');

        const finalMessages = [...updatedMessages, botMessage];
        setMessages(finalMessages);
        setIsTyping(false);

        // Save to chat history
        saveCurrentSession(finalMessages);

        // Auto-learning: Analyze conversation and update memory
        analyzeAndLearn(text, result.response).then(async () => {
          // Reload memory after learning and log it
          const updatedMemory = await loadUserMemory();
          setUserMemory(updatedMemory);
          console.log('[ChatScreen] Memory updated:', JSON.stringify(updatedMemory, null, 2));
        });

        // Auto speak the response
        speakResponse(result.response);
      });
    }, 300);
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => (
    <AnimatedChatBubble
      message={item.text}
      isUser={item.sender === 'user'}
      index={index}
    />
  );

  const statusBadge = (
    <View style={styles.statusBadge}>
      <View style={[styles.statusDot, getStatusColor(mochibotState)]} />
      <ThemedText style={styles.statusText}>
        {mochibotState === 'listening' && 'Listening'}
        {mochibotState === 'thinking' && 'Thinking'}
        {mochibotState === 'speaking' && 'Speaking'}
        {mochibotState === 'happy' && 'Happy'}
        {mochibotState === 'surprised' && 'Surprised'}
        {mochibotState === 'love' && 'Love'}
        {mochibotState === 'sleepy' && 'Sleepy'}
        {mochibotState === 'excited' && 'Excited'}
        {mochibotState === 'confused' && 'Confused'}
        {mochibotState === 'sad' && 'Sad'}
        {mochibotState === 'angry' && 'Angry'}
        {mochibotState === 'proud' && 'Proud'}
        {mochibotState === 'embarrassed' && 'Embarrassed'}
        {mochibotState === 'disgusted' && 'Disgusted'}
        {mochibotState === 'scared' && 'Scared'}
        {mochibotState === 'grateful' && 'Grateful'}
        {mochibotState === 'curious' && 'Curious'}
        {mochibotState === 'disappointed' && 'Disappointed'}
        {mochibotState === 'nervous' && 'Nervous'}
        {mochibotState === 'custom' && `Custom: ${primaryEmoji}`}
        {mochibotState === 'idle' && 'Online'}
      </ThemedText>
    </View>
  );

  if (showSettings) {
    return <SettingsScreen onGoBack={() => setShowSettings(false)} initialMemory={userMemory} />;
  }

  // Show chat history screen
  if (showHistory) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <ThemedText type="title" style={styles.historyTitle}>📚 Chat History</ThemedText>
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={async () => {
                setShowHistory(false);
                const newSession = await createSession();
                setCurrentSessionId(newSession.id);
                setMessages(INITIAL_MESSAGES);
              }}
            >
              <Text style={styles.newChatButtonText}>➕ New Chat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.historyList}>
            {chatSessions.length === 0 ? (
              <View style={styles.emptyHistory}>
                <ThemedText style={styles.emptyHistoryText}>No chat history yet</ThemedText>
              </View>
            ) : (
              chatSessions.map((session) => (
                <TouchableOpacity
                  key={session.id}
                  style={[
                    styles.historyItem,
                    currentSessionId === session.id && styles.historyItemActive,
                  ]}
                  onPress={async () => {
                    const loadedSession = await getSessionById(session.id);
                    if (loadedSession) {
                      const convertedMessages: ChatMessage[] = loadedSession.messages.map((m) => ({
                        id: m.id,
                        text: m.text,
                        sender: m.sender,
                        timestamp: new Date(m.timestamp),
                      }));
                      setMessages(convertedMessages);
                      setCurrentSessionId(loadedSession.id);
                      setShowHistory(false);
                    }
                  }}
                >
                  <View style={styles.historyItemContent}>
                    <Text style={styles.historyItemTitle} numberOfLines={1}>
                      {session.title}
                    </Text>
                    <Text style={styles.historyItemMeta}>
                      {session.messages.length} messages • {new Date(session.updatedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.historyItemActions}>
                    <TouchableOpacity
                      style={styles.regenerateTitleButton}
                      onPress={() => {
                        Alert.alert(
                          'Regenerate Title',
                          'Generate new title from conversation?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Generate',
                              onPress: async () => {
                                await regenerateSessionTitle(session.id);
                                getAllSessions().then(setChatSessions);
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.regenerateTitleButtonText}>🔄</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteSessionButton}
                      onPress={async () => {
                        Alert.alert(
                          'Delete Chat',
                          `Delete "${session.title}"?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: async () => {
                                await deleteSession(session.id);
                                getAllSessions().then(setChatSessions);
                                if (currentSessionId === session.id) {
                                  setMessages(INITIAL_MESSAGES);
                                  setCurrentSessionId(null);
                                }
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.deleteSessionButtonText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.backToChatButton}
            onPress={() => setShowHistory(false)}
          >
            <ThemedText style={styles.backToChatButtonText}>← Back to Chat</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header Buttons */}
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setShowHistory(true)}
          >
            <Text style={styles.historyButtonText}>📚</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Face Section - Always visible at top */}
        <View style={styles.faceSection}>
          <MochibotFace
            state={mochibotState}
            primaryEmoji={primaryEmoji}
            secondaryEmoji={secondaryEmoji}
          />
          {statusBadge}
          
          {/* Memory Status */}
          {userMemory && userMemory.personalFacts.length > 0 && (
            <TouchableOpacity
              style={styles.memoryBadge}
              onPress={() => {
                Alert.alert(
                  '🧠 Memory Info',
                  `Saya menyimpan ${userMemory.personalFacts.length} fakta tentang user:\n\n${userMemory.personalFacts.slice(0, 5).map(f => `• ${f.fact}`).join('\n')}${userMemory.personalFacts.length > 5 ? '\n...dan lainnya' : ''}`,
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={styles.memoryBadgeText}>🧠 {userMemory.personalFacts.length} facts</Text>
            </TouchableOpacity>
          )}

          {/* TTS Controls */}
          <View style={styles.ttsControls}>
            {ttsError ? (
              <TouchableOpacity style={[styles.ttsButton, styles.ttsButtonError]} onPress={fixTTS}>
                <Text style={styles.ttsButtonErrorText}>🔧 Fix TTS</Text>
              </TouchableOpacity>
            ) : isSpeaking ? (
              <TouchableOpacity style={styles.ttsButton} onPress={stopSpeaking}>
                <IconSymbol name="stop.fill" size={20} color="#00ff88" />
                <ThemedText style={styles.ttsButtonText}>Stop</ThemedText>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.ttsButton} 
                onPress={() => {
                  const lastBotMessage = messages.filter(m => m.sender === 'bot').pop();
                  if (lastBotMessage) {
                    speakResponse(lastBotMessage.text);
                  }
                }}
              >
                <IconSymbol name="play.fill" size={20} color="#00ff88" />
                <ThemedText style={styles.ttsButtonText}>Speak</ThemedText>
              </TouchableOpacity>
            )}
          </View>
          
          {isTyping && (
            <View style={styles.typingBadge}>
              <ActivityIndicator size="small" color="#00ff88" />
              <ThemedText style={styles.typingText}>Typing</ThemedText>
            </View>
          )}
        </View>

        {/* Chat Messages - Scrollable area */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesSection}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        >
          {messages.map((msg, index) => (
            <React.Fragment key={msg.id}>
              {renderMessage({ item: msg, index })}
            </React.Fragment>
          ))}
          <TypingIndicator isVisible={isTyping} />
          <View style={styles.messagesSpacer} />
        </ScrollView>

        {/* Input Section */}
        <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStatusColor(state: MochibotStateType) {
  const colors: Record<MochibotStateType, string> = {
    idle: '#888888',
    listening: '#45B7D1',
    thinking: '#4ECDC4',
    speaking: '#96CEB4',
    happy: '#FFD700',
    surprised: '#FF6B6B',
    love: '#FF69B4',
    sleepy: '#9B59B6',
    excited: '#F39C12',
    confused: '#E74C3C',
    sad: '#5DADE2',
    angry: '#E74C3C',
    proud: '#FFA500',
    embarrassed: '#FFB6C1',
    disgusted: '#9ACD32',
    scared: '#8B008B',
    grateful: '#FF69B4',
    curious: '#20B2AA',
    disappointed: '#708090',
    nervous: '#FFA07A',
    custom: '#00ff88',
  };
  return { backgroundColor: colors[state] || '#888888' };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  settingsButton: {
    position: 'absolute',
    top: 10,
    right: 16,
    zIndex: 100,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  settingsButtonText: {
    fontSize: 20,
  },
  faceSection: {
    backgroundColor: '#0a0a1a',
    paddingTop: 20,
    paddingBottom: 15,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#00ff88',
    fontWeight: '500',
  },
  typingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  typingText: {
    fontSize: 12,
    color: '#888888',
  },
  ttsControls: {
    marginTop: 12,
  },
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  ttsButtonError: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderColor: 'rgba(255, 107, 107, 0.5)',
  },
  ttsButtonErrorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
  ttsButtonText: {
    fontSize: 14,
    color: '#00ff88',
    fontWeight: '600',
  },
  messagesSection: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  messagesSpacer: {
    height: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    position: 'absolute',
    top: 10,
    right: 16,
    zIndex: 100,
    gap: 10,
  },
  historyButton: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  historyButtonText: {
    fontSize: 20,
  },
  settingsButton: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  settingsButtonText: {
    fontSize: 20,
  },
  historyContainer: {
    flex: 1,
    padding: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  historyTitle: {
    color: '#00ff88',
  },
  newChatButton: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  newChatButtonText: {
    color: '#0a0a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  historyItemActive: {
    borderColor: '#00ff88',
    backgroundColor: '#1a1a3e',
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 4,
  },
  historyItemMeta: {
    fontSize: 12,
    color: '#888888',
  },
  historyItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  regenerateTitleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#4ECDC4',
  },
  regenerateTitleButtonText: {
    fontSize: 16,
  },
  deleteSessionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#ff6b6b',
  },
  deleteSessionButtonText: {
    fontSize: 18,
  },
  emptyHistory: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },
  backToChatButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#00ff88',
    alignItems: 'center',
    marginTop: 16,
  },
  backToChatButtonText: {
    color: '#0a0a1a',
    fontSize: 15,
    fontWeight: '600',
  },
  memoryBadge: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.5)',
  },
  memoryBadgeText: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '600',
  },
});
