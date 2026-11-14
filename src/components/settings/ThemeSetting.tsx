import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  fonts,
  useColors,
  useTheme,
  useThemedStyles,
  type ThemeColors,
  type ThemePreference,
} from '@/theme';

const OPTIONS: { value: ThemePreference; label: string; hint: string; icon: 'phone-portrait-outline' | 'sunny-outline' | 'moon-outline' }[] = [
  { value: 'system', label: 'Automático', hint: 'Sigue el modo de tu dispositivo', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Claro', hint: 'Fondo claro siempre', icon: 'sunny-outline' },
  { value: 'dark', label: 'Oscuro', hint: 'Fondo oscuro siempre', icon: 'moon-outline' },
];

/** Selector de apariencia. La elección se guarda en el dispositivo. */
export function ThemeSetting() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { preference, setPreference } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Apariencia de la app" style={styles.group}>
      {OPTIONS.map((option, index) => {
        const selected = option.value === preference;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={`${option.label}. ${option.hint}`}
            onPress={() => setPreference(option.value)}
            style={({ pressed }) => [
              styles.row,
              index > 0 && styles.rowDivider,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name={option.icon} size={24} color={colors.primaryDark} />
            <View style={styles.texts}>
              <Text style={styles.label}>{option.label}</Text>
              <Text style={styles.hint}>{option.hint}</Text>
            </View>
            <Ionicons
              name={selected ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={selected ? colors.primary : colors.textSecondary}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    group: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      minHeight: 64,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
    texts: { flex: 1, gap: 2 },
    label: { fontFamily: fonts.semiBold, fontSize: 16, color: colors.text },
    hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  });
