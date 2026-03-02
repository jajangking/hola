import { Text, type TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'link';
};

export function ThemedText({ style, type = 'default', ...otherProps }: ThemedTextProps) {
  const { colors } = useTheme();
  
  return (
    <Text
      style={[
        { color: colors.text },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        style,
      ]}
      {...otherProps}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  link: {
    color: '#00ff88',
    textDecorationLine: 'underline',
  },
});
