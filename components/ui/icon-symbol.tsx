import { Platform, View, ViewStyle } from 'react-native';
import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { MaterialIcons } from '@expo/vector-icons';

interface IconSymbolProps {
  name: SymbolViewProps['name'] | string;
  size?: number;
  color: string;
  style?: ViewStyle;
  weight?: SymbolWeight;
}

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: IconSymbolProps) {
  // Use Material Icons on Android for better compatibility
  if (Platform.OS !== 'ios') {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 255, 136, 0.1)',
            borderRadius: size / 2,
          },
          style,
        ]}
      >
        <MaterialIcons
          name="send"
          size={size * 0.6}
          color={color}
        />
      </View>
    );
  }

  // Use SF Symbols on iOS
  return (
    <SymbolView
      name={name as SymbolViewProps['name']}
      tintColor={color}
      resizeMode="scaleAspectFit"
      weight={weight}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
