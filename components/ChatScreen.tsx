import React, { useState, useRef, useEffect } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import MochibotFace from './MochibotFace';
import { AnimatedChatBubble, TypingIndicator } from './AnimatedChatBubble';
import { ChatInput } from './ChatInput';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { chatWithGroq, detectEmotionWithAI, ChatMessage as GroqMessage, MochibotState, EmotionResult, GroqOptions } from '@/services/groq';
import { textToSpeech } from '@/services/tts';
import { IconSymbol } from './ui/icon-symbol';
import { useAppSettings } from '@/hooks/useAppSettings';
import SettingsScreen from '@/app/settings';

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
  const { settings } = useAppSettings();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [mochibotState, setMochibotState] = useState<MochibotStateType>('happy');
  const [primaryEmoji, setPrimaryEmoji] = useState('😄');
  const [secondaryEmoji, setSecondaryEmoji] = useState('✨');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Detect initial emotion on mount
  useEffect(() => {
    detectEmotionWithAI(INITIAL_MESSAGES[0].text).then((result) => {
      setMochibotState(result.emotion);
      setPrimaryEmoji(result.primaryEmoji);
      setSecondaryEmoji(result.secondaryEmoji || '');
    });
  }, []);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, [currentSound]);

  const speakResponse = async (text: string) => {
    if (!settings.ttsEnabled || isSpeaking) return;

    setIsSpeaking(true);
    const sound = await textToSpeech({ 
      text,
      voice: settings.ttsVoice,
      speed: settings.ttsSpeed,
    });

    if (sound) {
      setCurrentSound(sound);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsSpeaking(false);
          setCurrentSound(null);
        }
      });
    } else {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = async () => {
    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      setCurrentSound(null);
      setIsSpeaking(false);
    }
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

    setMessages((prev) => [...prev, userMessage]);
    setMochibotState('listening');

    // Convert to Groq message format
    const groqMessages: GroqMessage[] = messages.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));
    groqMessages.push({ role: 'user', content: text });

    // Call Groq API
    setTimeout(() => {
      setMochibotState('thinking');
      setIsTyping(true);

      chatWithGroq(groqMessages, {
        model: settings.chatModel,
        temperature: settings.temperature,
      }).then(async (response) => {
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: response,
          sender: 'bot',
          timestamp: new Date(),
        };

        // Detect emotion from response using AI
        const emotionResult: EmotionResult = await detectEmotionWithAI(response);
        setMochibotState(emotionResult.emotion);
        setPrimaryEmoji(emotionResult.primaryEmoji);
        setSecondaryEmoji(emotionResult.secondaryEmoji || '');

        setMessages((prev) => [...prev, botMessage]);
        setIsTyping(false);
        
        // Auto speak the response
        speakResponse(response);
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
    return <SettingsScreen onGoBack={() => setShowSettings(false)} />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Settings Button */}
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>

        {/* Face Section - Always visible at top */}
        <View style={styles.faceSection}>
          <MochibotFace
            state={mochibotState}
            primaryEmoji={primaryEmoji}
            secondaryEmoji={secondaryEmoji}
          />
          {statusBadge}
          
          {/* TTS Controls */}
          <View style={styles.ttsControls}>
            {isSpeaking ? (
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
});
