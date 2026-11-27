import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useColors } from '@/theme';

export function ScreenLoadingBackdrop({
  label = 'Cargando pantalla',
  bottomInset = 0,
  hideFromAccessibility = true,
}: Readonly<{
  label?: string;
  bottomInset?: number;
  hideFromAccessibility?: boolean;
}>) {
  const colors = useColors();

  return (
    <View
      pointerEvents="none"
      accessible={hideFromAccessibility ? false : undefined}
      importantForAccessibility={hideFromAccessibility ? 'no-hide-descendants' : undefined}
      aria-hidden={hideFromAccessibility ? true : undefined}
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: bottomInset,
        },
      ]}
    >
      <ActivityIndicator size="large" color={colors.primary} accessibilityLabel={label} />
    </View>
  );
}
