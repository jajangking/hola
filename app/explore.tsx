import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaterialIcons } from '@expo/vector-icons';

const FEATURES = [
  {
    icon: 'face' as const,
    title: 'OLED Mochibot Face',
    description: 'Animated virtual face with expressive emotions that responds to your conversations.',
  },
  {
    icon: 'chat-bubble' as const,
    title: 'Smart Chatbot',
    description: 'Natural language conversations with contextual responses and personality.',
  },
  {
    icon: 'auto-awesome' as const,
    title: 'Emotional AI',
    description: 'Mochibot shows emotions like happiness, surprise, thinking, and more!',
  },
  {
    icon: 'brightness-3' as const,
    title: 'Dark Theme',
    description: 'Beautiful OLED-optimized dark interface that\'s easy on the eyes.',
  },
  {
    icon: 'flash-on' as const,
    title: 'Real-time Animations',
    description: 'Smooth 60fps animations powered by React Native Reanimated.',
  },
  {
    icon: 'smartphone' as const,
    title: 'Cross-Platform',
    description: 'Works seamlessly on iOS, Android, and Web.',
  },
];

export default function ExploreScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <MaterialIcons name="star" size={40} color="#00ff88" />
          <ThemedText type="title" style={styles.headerTitle}>
            Hola AI Features
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Discover what makes Mochibot special
          </ThemedText>
        </View>

        <View style={styles.featuresGrid}>
          {FEATURES.map((feature, index) => (
            <ThemedView key={index} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <MaterialIcons name={feature.icon} size={28} color="#00ff88" />
              </View>
              <ThemedText type="subtitle" style={styles.featureTitle}>
                {feature.title}
              </ThemedText>
              <ThemedText style={styles.featureDescription}>
                {feature.description}
              </ThemedText>
            </ThemedView>
          ))}
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText}>
            Built with ❤️ using Expo & React Native
          </ThemedText>
        </View>
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
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  headerTitle: {
    marginTop: 12,
    color: '#00ff88',
  },
  headerSubtitle: {
    marginTop: 8,
    color: '#888888',
    textAlign: 'center',
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0f0f1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    marginBottom: 8,
    color: '#ffffff',
  },
  featureDescription: {
    color: '#888888',
    lineHeight: 22,
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    color: '#666666',
    fontSize: 14,
  },
});
