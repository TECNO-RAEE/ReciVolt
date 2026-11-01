import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts } from '@/theme';
export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  label = 'Buscar puntos verdes',
  placeholder = 'Nombre, dirección o dispositivo',
}: Readonly<{
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  label?: string;
  placeholder?: string;
}>) {
  return (
    <View style={styles.bar}>
      <Ionicons name="search-outline" size={20} color={colors.brandDark} />
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.brandDark}
        style={styles.input}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
      />
      {value !== '' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
          onPress={() => onChangeText('')}
          hitSlop={10}
        >
          <Ionicons name="close" size={20} color={colors.brandDark} />
        </Pressable>
      )}
      {onSubmit && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buscar"
          onPress={onSubmit}
          hitSlop={10}
        >
          <Ionicons name="arrow-forward" size={20} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    minHeight: 50,
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
