import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import {
  CATEGORY_GROUP_ICONS,
  isGroupSelected,
  type CategoryGroup,
} from '@/models/DeviceCategory';
import { fonts, useColors, useThemedStyles, type ThemeColors } from '@/theme';

/**
 * Panel de filtros rápidos sobre el mapa: un chip por tipo de residuo (pilas, celulares,
 * cables, electrodomésticos...). Se pueden combinar; "Todos" limpia la selección.
 */
export function CategoryChips({
  groups,
  selectedIds,
  onToggle,
  onClear,
}: Readonly<{
  groups: CategoryGroup[];
  selectedIds: readonly string[];
  onToggle: (group: CategoryGroup) => void;
  onClear: () => void;
}>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  if (groups.length === 0) return null;
  const noneSelected = groups.every((group) => !group.categoryIds.some((id) => selectedIds.includes(id)));
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityLabel="Filtrar puntos por tipo de residuo"
      contentContainerStyle={styles.content}
      style={styles.bar}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: noneSelected }}
        onPress={onClear}
        style={[styles.chip, noneSelected && styles.chipSelected]}
      >
        <Text style={[styles.text, noneSelected && { color: colors.textOnPrimary }]}>Todos</Text>
      </Pressable>
      {groups.map((group) => {
        const selected = isGroupSelected(group, selectedIds);
        return (
          <Pressable
            key={group.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${group.label}${selected ? ', seleccionado' : ''}`}
            onPress={() => onToggle(group)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <MaterialCommunityIcons
              name={CATEGORY_GROUP_ICONS[group.key]}
              size={16}
              color={selected ? colors.textOnPrimary : colors.primaryDark}
            />
            <Text style={[styles.text, selected && { color: colors.textOnPrimary }]}>
              {group.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    bar: { position: 'absolute', top: 12, left: 0, right: 72, maxHeight: 48 },
    content: { gap: 8, paddingLeft: 16, paddingRight: 8, alignItems: 'center' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 40,
      paddingHorizontal: 14,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
    },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    text: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  });
