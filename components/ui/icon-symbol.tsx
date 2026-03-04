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
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <MaterialIcons
          name={name as any}
          size={size}
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
