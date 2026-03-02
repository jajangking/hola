import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  index: number;
}

export function AnimatedChatBubble({ message, isUser, index }: ChatBubbleProps) {
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bubbleContainer,
        isUser ? styles.userBubbleContainer : styles.botBubbleContainer,
        animatedStyle,
      ]}
    >
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        <View style={styles.bubbleContent}>
          <Animated.Text style={styles.bubbleText} numberOfLines={0}>
            {message}
          </Animated.Text>
        </View>
      </View>
    </Animated.View>
  );
}

interface TypingIndicatorProps {
  isVisible: boolean;
}

export function TypingIndicator({ isVisible }: TypingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <View style={[styles.bubbleContainer, styles.botBubbleContainer, styles.typingContainer]}>
      <View style={[styles.bubble, styles.botBubble, styles.typingBubble]}>
        <View style={styles.dotsContainer}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleContainer: {
    maxWidth: width * 0.85,
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userBubbleContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  botBubbleContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  typingContainer: {
    maxWidth: 60,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#1a1a2e',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  typingBubble: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  bubbleContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bubbleText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00ff88',
  },
});
