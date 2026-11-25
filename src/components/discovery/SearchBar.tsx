import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';
export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  label = 'Buscar puntos verdes',
  placeholder = 'Nombre, dirección o dispositivo',
  autoFocus = false,
  accessibilityHint,
}: Readonly<{
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  accessibilityHint?: string;
}>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.bar}>
      <Ionicons name="search-outline" size={20} color={colors.brandDark} />
      <TextInput
        autoFocus={autoFocus}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
      />
      {value !== '' && (
        <SpringPressable
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
          onPress={() => onChangeText('')}
          pressScale={motion.scale.icon}
          style={styles.iconButton}
        >
          <Ionicons name="close" size={20} color={colors.brandDark} />
        </SpringPressable>
      )}
      {onSubmit && (
        <SpringPressable
          accessibilityRole="button"
          accessibilityLabel="Buscar"
          onPress={onSubmit}
          pressScale={motion.scale.icon}
          style={styles.iconButton}
        >
          <Ionicons name="arrow-forward" size={20} color={colors.primary} />
        </SpringPressable>
      )}
    </View>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingLeft: 14,
      paddingRight: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderControl,
      borderRadius: 8,
      minHeight: 50,
    },
    iconButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontFamily: fonts.regular,
      fontSize: 15,
      color: colors.text,
      minWidth: 0,
    },
  });
