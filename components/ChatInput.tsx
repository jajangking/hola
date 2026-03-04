import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from './ui/icon-symbol';
import * as Haptics from 'expo-haptics';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSend = async () => {
    if (text.trim() && !disabled) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Ask Mochibot..."
          placeholderTextColor="#5a5a7a"
          multiline
          maxLength={500}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!text.trim() || disabled) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || disabled}
          activeOpacity={0.7}
        >
          <IconSymbol
            name="send"
            size={26}
            color={text.trim() && !disabled ? '#00ff88' : '#4a4a6a'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#0a0a1a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1a1a2e',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#2a2a4e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainerFocused: {
    borderColor: '#00ff88',
    shadowColor: '#00ff88',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 8,
    lineHeight: 24,
  },
  sendButton: {
    padding: 4,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
