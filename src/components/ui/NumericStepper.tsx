import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/theme';

export interface NumericStepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export function NumericStepper({
  value,
  min = 1,
  max = 999,
  step = 1,
  onChange,
  disabled = false,
  accessibilityLabel = 'Cantidad',
  testID,
}: Readonly<NumericStepperProps>) {
  const safeValue = Number.isFinite(value) ? value : min;
  const canDecrement = !disabled && safeValue > min;
  const canIncrement = !disabled && safeValue < max;

  const handleDecrement = () => {
    if (!canDecrement) return;
    const next = Math.max(min, safeValue - step);
    onChange(next);
  };

  const handleIncrement = () => {
    if (!canIncrement) return;
    const next = Math.min(max, safeValue + step);
    onChange(next);
  };

  return (
    <View testID={testID} style={styles.container}>
      <Pressable
        testID={testID ? `${testID}-minus` : undefined}
        accessibilityRole="button"
        accessibilityLabel="Disminuir cantidad"
        accessibilityState={{ disabled: !canDecrement }}
        disabled={!canDecrement}
        onPress={handleDecrement}
        style={({ pressed }) => [
          styles.button,
          (!canDecrement || disabled) && styles.buttonDisabled,
          pressed && canDecrement && styles.buttonPressed,
        ]}
      >
        <Ionicons
          name="remove"
          size={22}
          color={canDecrement ? colors.primary : colors.textSecondary}
        />
      </Pressable>

      <Text
        testID={testID ? `${testID}-value` : undefined}
        accessibilityRole="text"
        accessibilityLabel={`${accessibilityLabel}: ${safeValue}`}
        style={[styles.value, disabled && styles.valueDisabled]}
      >
        {safeValue}
      </Text>

      <Pressable
        testID={testID ? `${testID}-plus` : undefined}
        accessibilityRole="button"
        accessibilityLabel="Aumentar cantidad"
        accessibilityState={{ disabled: !canIncrement }}
        disabled={!canIncrement}
        onPress={handleIncrement}
        style={({ pressed }) => [
          styles.button,
          (!canIncrement || disabled) && styles.buttonDisabled,
          pressed && canIncrement && styles.buttonPressed,
        ]}
      >
        <Ionicons
          name="add"
          size={22}
          color={canIncrement ? colors.primary : colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
    backgroundColor: colors.surfaceSoft,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  value: {
    minWidth: 52,
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 28,
    color: colors.text,
    textAlign: 'center',
  },
  valueDisabled: {
    color: colors.textSecondary,
    opacity: 0.6,
  },
});
