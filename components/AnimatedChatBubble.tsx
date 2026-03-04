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
  const scale = useSharedValue(0.95);

  React.useEffect(() => {
    opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
    scale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
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
    maxWidth: width * 0.82,
    marginVertical: 5,
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  userBubble: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 6,
    shadowColor: '#667eea',
    shadowOpacity: 0.2,
  },
  botBubble: {
    backgroundColor: '#1a1a2e',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  typingBubble: {
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  bubbleContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bubbleText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 23,
    letterSpacing: 0.2,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00ff88',
  },
});
