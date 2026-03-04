import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const FACE_SIZE = Math.min(width * 0.42, 140);

type MochibotState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'surprised' | 'love' | 'sleepy' | 'excited' | 'confused' | 'sad' | 'angry' | 'proud' | 'embarrassed' | 'disgusted' | 'scared' | 'grateful' | 'curious' | 'disappointed' | 'nervous' | 'custom';

interface MochibotFaceProps {
  state?: MochibotState;
  primaryEmoji?: string;
  secondaryEmoji?: string;
}

export default function MochibotFace({
  state = 'idle',
  primaryEmoji = '😐',
  secondaryEmoji = ''
}: MochibotFaceProps) {
  const showSecondary = useSharedValue(0);
  const emojiOpacity = useSharedValue(1);
  const glowIntensity = useSharedValue(0.4);

  // Alternate between primary and secondary emoji if both exist
  useEffect(() => {
    if (secondaryEmoji && secondaryEmoji !== '') {
      const interval = setInterval(() => {
        showSecondary.value = showSecondary.value === 0 ? 1 : 0;
      }, 1500);
      return () => clearInterval(interval);
    } else {
      showSecondary.value = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondaryEmoji]);

  // Smooth breathing animation
  useEffect(() => {
    emojiOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subtle glow pulse
  useEffect(() => {
    glowIntensity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emojiStyle = useAnimatedStyle(() => ({
    opacity: emojiOpacity.value,
  }));

  const secondaryStyle = useAnimatedStyle(() => ({
    opacity: showSecondary.value,
    transform: [{ scale: showSecondary.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowIntensity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.faceContainer}>
        <Animated.View style={[styles.face, glowStyle]}>
          <Animated.View style={[styles.emojiContainer, emojiStyle]}>
            <Text style={styles.emoticon}>{primaryEmoji}</Text>
            {secondaryEmoji !== '' && (
              <Animated.View style={[styles.secondaryContainer, secondaryStyle]}>
                <Text style={styles.secondaryEmoticon}>{secondaryEmoji}</Text>
              </Animated.View>
            )}
          </Animated.View>
        </Animated.View>
      </View>

      {/* State indicator */}
      <View style={styles.stateIndicator}>
        <View style={[styles.stateDot, getStateColor(state)]} />
        <Text style={styles.stateLabel}>{state}</Text>
      </View>
    </View>
  );
}

function getStateColor(state: MochibotState) {
  const colors: Record<MochibotState, string> = {
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
  container: {
    width: FACE_SIZE,
    height: FACE_SIZE + 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceContainer: {
    width: FACE_SIZE,
    height: FACE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    width: FACE_SIZE,
    height: FACE_SIZE,
    borderRadius: FACE_SIZE / 2,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#00ff88',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    elevation: 8,
    position: 'relative',
  },
  emojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emoticon: {
    fontSize: FACE_SIZE * 0.52,
  },
  secondaryContainer: {
    position: 'absolute',
    top: FACE_SIZE * 0.02,
    right: FACE_SIZE * 0.05,
  },
  secondaryEmoticon: {
    fontSize: FACE_SIZE * 0.18,
  },
  stateIndicator: {
    marginTop: 10,
    alignItems: 'center',
    gap: 4,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stateLabel: {
    fontSize: 11,
    color: '#555',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
