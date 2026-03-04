import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, TouchableOpacity, Text, Alert, BackHandler, Keyboard, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MochibotFace from './MochibotFace';
import { AnimatedChatBubble, TypingIndicator } from './AnimatedChatBubble';
import { ChatInput } from './ChatInput';
import { chatWithEmotion, ChatMessage as GroqMessage, MochibotState, detectEmotionFromText } from '@/services/groq';
import { textToSpeech, stopSpeaking as stopTTS } from '@/services/tts';
import { IconSymbol } from './ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { useAppSettings } from '@/hooks/useAppSettings';
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
  const [mochibotState, setMochibotState] = useState<MochibotState>('happy');
  const [primaryEmoji, setPrimaryEmoji] = useState('😄');
  const [secondaryEmoji, setSecondaryEmoji] = useState('✨');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [ttsError, setTtsError] = useState(false);
  const [userMemory, setUserMemory] = useState<UserMemory | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Keyboard visibility listener
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

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
      if (showSettings || showHistory || showSidebar) {
        if (showSettings) setShowSettings(false);
        if (showHistory) setShowHistory(false);
        if (showSidebar) setShowSidebar(false);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [showSettings, showHistory, showSidebar]);

  // Refresh settings when returning from settings screen
  useEffect(() => {
    if (!showSettings && !showHistory && !showSidebar) {
      refreshSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSettings, showHistory, showSidebar]);

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
  }, [messages, isTyping, keyboardVisible]);

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

    const groqMessages: GroqMessage[] = updatedMessages.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));

    setTimeout(() => {
      setMochibotState('thinking');
      setIsTyping(true);

      chatWithEmotion(groqMessages, {
        model: settings.chatModel,
        temperature: settings.temperature,
        useMemory: true,
      }).then((result) => {
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: result.response,
          sender: 'bot',
          timestamp: new Date(),
        };

        setMochibotState(result.emotion);
        setPrimaryEmoji(result.primaryEmoji);
        setSecondaryEmoji(result.secondaryEmoji || '');

        const finalMessages = [...updatedMessages, botMessage];
        setMessages(finalMessages);
        setIsTyping(false);

        saveCurrentSession(finalMessages);

        analyzeAndLearn(text, result.response).then(() => {
          loadUserMemory().then(setUserMemory);
        });

        speakResponse(result.response);
      });
    }, 300);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCurrentSession();
    if (userMemory) {
      await loadUserMemory().then(setUserMemory);
    }
    setRefreshing(false);
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => (
    <AnimatedChatBubble
      message={item.text}
      isUser={item.sender === 'user'}
      index={index}
    />
  );

  if (showSettings) {
    return <SettingsScreen onGoBack={() => { setShowSettings(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} initialMemory={userMemory} />;
  }

  if (showHistory) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <View>
              <Text style={styles.historyTitle}>📚 Chat History</Text>
              <Text style={styles.historySubtitle}>{chatSessions.length} conversations</Text>
            </View>
            <TouchableOpacity
              style={styles.newChatButton}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowHistory(false);
                const newSession = await createSession();
                setCurrentSessionId(newSession.id);
                setMessages(INITIAL_MESSAGES);
              }}
            >
              <IconSymbol name="add" size={22} color="#0a0a1a" />
              <Text style={styles.newChatButtonText}>New Chat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.historyList} refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00ff88" />
          }>
            {chatSessions.length === 0 ? (
              <View style={styles.emptyHistory}>
                <IconSymbol name="chat" size={48} color="#444" />
                <Text style={styles.emptyHistoryText}>No conversations yet</Text>
                <Text style={styles.emptyHistorySubtext}>Start chatting to create your first conversation!</Text>
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
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                  <View style={styles.historyItemIcon}>
                    <IconSymbol name="chat" size={26} color={currentSessionId === session.id ? '#00ff88' : '#4ECDC4'} />
                  </View>
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
                      <IconSymbol name="refresh" size={20} color="#0a0a1a" />
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
                      <IconSymbol name="delete" size={20} color="#0a0a1a" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.backToChatButton}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowHistory(false);
            }}
          >
            <IconSymbol name="arrow-back" size={22} color="#0a0a1a" />
            <Text style={styles.backToChatButtonText}>Back to Chat</Text>
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Top Bar - Menu Button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSidebar(true);
            }}
          >
            <IconSymbol name="menu" size={28} color="#00ff88" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Mochibot</Text>
          <View style={styles.topBarSpacer} />
        </View>

        {/* Sidebar - Left Side */}
        {showSidebar && (
          <>
            <TouchableOpacity
              style={styles.sidebarOverlay}
              activeOpacity={0.5}
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowSidebar(false);
              }}
            />
            <View style={styles.sidebar}>
              <View style={styles.sidebarHeader}>
                <Text style={styles.sidebarTitle}>Menu</Text>
                <TouchableOpacity
                  style={styles.closeSidebarButton}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowSidebar(false);
                  }}
                >
                  <IconSymbol name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
                <TouchableOpacity
                  style={styles.sidebarItem}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowSidebar(false);
                    handleSendMessage("/help");
                  }}
                >
                  <IconSymbol name="help-outline" size={24} color="#4ECDC4" />
                  <Text style={styles.sidebarItemText}>Help</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sidebarItem}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowSidebar(false);
                    handleSendMessage("/memory");
                  }}
                >
                  <IconSymbol name="favorite" size={24} color="#FFD700" />
                  <Text style={styles.sidebarItemText}>Memory</Text>
                </TouchableOpacity>

                <View style={styles.sidebarDivider} />

                <TouchableOpacity
                  style={styles.sidebarItem}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowSidebar(false);
                    const newSession = await createSession();
                    setCurrentSessionId(newSession.id);
                    setMessages(INITIAL_MESSAGES);
                  }}
                >
                  <IconSymbol name="add-circle-outline" size={24} color="#ff6b6b" />
                  <Text style={styles.sidebarItemText}>New Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sidebarItem}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowSidebar(false);
                    setShowHistory(true);
                  }}
                >
                  <IconSymbol name="history" size={24} color="#9B59B6" />
                  <Text style={styles.sidebarItemText}>Chat History</Text>
                </TouchableOpacity>

                <View style={styles.sidebarDivider} />

                <TouchableOpacity
                  style={styles.sidebarItem}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowSidebar(false);
                    setShowSettings(true);
                  }}
                >
                  <IconSymbol name="settings" size={24} color="#E74C3C" />
                  <Text style={styles.sidebarItemText}>Settings</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </>
        )}

        {/* Emoticon Section - Fixed at top */}
        <View style={styles.emoticonSection}>
          <MochibotFace
            state={mochibotState}
            primaryEmoji={primaryEmoji}
            secondaryEmoji={secondaryEmoji}
          />
          <View style={styles.ttsControls}>
            {!ttsError && !isSpeaking ? (
              <TouchableOpacity
                style={styles.ttsButton}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const lastBotMessage = messages.filter(m => m.sender === 'bot').pop();
                  if (lastBotMessage) speakResponse(lastBotMessage.text);
                }}
              >
                <IconSymbol name="volume-up" size={18} color="#00ff88" />
                <Text style={styles.ttsButtonText}>Speak</Text>
              </TouchableOpacity>
            ) : isSpeaking ? (
              <TouchableOpacity
                style={styles.ttsButtonActive}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await stopSpeaking();
                }}
              >
                <IconSymbol name="stop-circle" size={18} color="#ff6b6b" />
                <Text style={styles.ttsButtonTextActive}>Stop</Text>
              </TouchableOpacity>
            ) : null}

            {ttsError && (
              <TouchableOpacity
                style={styles.ttsButtonError}
                onPress={fixTTS}
              >
                <IconSymbol name="error-outline" size={18} color="#ff6b6b" />
                <Text style={styles.ttsButtonTextError}>Fix TTS</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Chat Messages - Scrollable Column */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesSection}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Typing Indicator */}
          {isTyping && (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#00ff88" />
                <Text style={styles.typingText}>Mochibot is thinking...</Text>
              </View>
            </View>
          )}

          {/* Chat Messages */}
          {messages.map((msg, index) => (
            <React.Fragment key={msg.id}>
              {renderMessage({ item: msg, index })}
            </React.Fragment>
          ))}
          <TypingIndicator isVisible={isTyping} />
          <View style={styles.messagesSpacer} />
        </ScrollView>

        {/* Input */}
        <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  container: {
    flex: 1,
  },
  // Top Bar - Menu Button
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#0a0a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  menuButton: {
    padding: 4,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00ff88',
  },
  topBarSpacer: {
    width: 36,
  },
  // Sidebar
  sidebarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#1a1a2e',
    zIndex: 999,
    borderRightWidth: 1,
    borderRightColor: '#2a2a4e',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  closeSidebarButton: {
    padding: 4,
  },
  sidebarContent: {
    flex: 1,
    paddingTop: 8,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sidebarItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#2a2a4e',
    marginVertical: 8,
  },
  // Emoticon Section - Fixed
  emoticonSection: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#0a0a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  // TTS Controls - Compact
  ttsControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  ttsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 136, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  ttsButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00ff88',
  },
  ttsButtonActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  ttsButtonTextActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff6b6b',
  },
  ttsButtonError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  ttsButtonTextError: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff6b6b',
  },
  // Typing Indicator
  typingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  typingText: {
    fontSize: 12,
    color: '#888',
  },
  // Messages
  messagesSection: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 100,
  },
  messagesSpacer: {
    height: 8,
  },
  // History Screen
  historyContainer: {
    flex: 1,
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  historyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00ff88',
  },
  historySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00ff88',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  newChatButtonText: {
    color: '#0a0a1a',
    fontSize: 14,
    fontWeight: '700',
  },
  historyList: {
    flex: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#1a1a2e',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  historyItemActive: {
    borderColor: '#00ff88',
    backgroundColor: '#1a1a3e',
  },
  historyItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
  },
  historyItemMeta: {
    fontSize: 12,
    color: '#666',
  },
  historyItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  regenerateTitleButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteSessionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ff6b6b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistory: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    marginTop: 8,
  },
  backToChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#00ff88',
    marginTop: 16,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  backToChatButtonText: {
    color: '#0a0a1a',
    fontSize: 15,
    fontWeight: '700',
  },
});
