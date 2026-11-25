import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { AnimatedSheetModal } from '@/components/ui/AnimatedSheetModal';
import { SpringPressable } from '@/components/ui/SpringPressable';
import type { DeviceCategory } from '@/models/DeviceCategory';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';

export interface PointFilterValues {
  categoryIds: string[];
  companyId: string;
  pickupOnly: boolean;
  openOnly: boolean;
  nearbyOnly: boolean;
}

export const emptyPointFilters: PointFilterValues = {
  categoryIds: [],
  companyId: '',
  pickupOnly: false,
  openOnly: false,
  nearbyOnly: false,
};

/**
 * Hoja inferior de filtros de Puntos verdes. Mantiene un borrador propio y sólo lo aplica
 * al tocar "Aplicar filtros", para no cambiar el mapa mientras la persona todavía está eligiendo.
 */
export function PointFilterSheet({
  visible,
  categories,
  companies,
  hasLocation,
  values,
  onApply,
  onClose,
}: Readonly<{
  visible: boolean;
  categories: DeviceCategory[];
  companies: readonly (readonly [string, string])[];
  hasLocation: boolean;
  values: PointFilterValues;
  onApply: (values: PointFilterValues) => void;
  onClose: () => void;
}>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [draft, setDraft] = useState(values);
  // Al abrir la hoja, el borrador vuelve a partir de los filtros aplicados (sin useEffect:
  // se ajusta durante el render, como recomienda React para sincronizar con una prop).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(values);
  }
  const toggleCategory = (id: string) =>
    setDraft((current) => ({
      ...current,
      categoryIds: current.categoryIds.includes(id)
        ? current.categoryIds.filter((item) => item !== id)
        : [...current.categoryIds, id],
    }));
  return (
    <AnimatedSheetModal
      visible={visible}
      onClose={onClose}
      presentation="sheet"
      containerStyle={styles.sheet}
    >
      <View style={styles.handle} />
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.title}>
          Filtrar puntos verdes
        </Text>
        <SpringPressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar filtros"
          pressScale={motion.scale.icon}
          style={styles.closeButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </SpringPressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Dispositivos aceptados</Text>
        {categories.length === 0 ? (
          <Text style={styles.hint}>Todavía no hay categorías disponibles.</Text>
        ) : (
          categories.map((category) => {
            const checked = draft.categoryIds.includes(category.id);
            return (
              <Pressable
                key={category.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={category.name}
                onPress={() => toggleCategory(category.id)}
                style={styles.checkboxRow}
              >
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />}
                </View>
                <Text style={styles.checkboxLabel}>{category.name}</Text>
              </Pressable>
            );
          })
        )}
        {companies.length > 0 && (
          <>
            <Text style={styles.label}>Organización</Text>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: draft.companyId === '' }}
              onPress={() => setDraft((current) => ({ ...current, companyId: '' }))}
              style={styles.optionRow}
            >
              <Ionicons
                name={draft.companyId === '' ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={draft.companyId === '' ? colors.primary : colors.textSecondary}
              />
              <Text style={styles.checkboxLabel}>Todas</Text>
            </Pressable>
            {companies.map(([id, name]) => (
              <Pressable
                key={id}
                accessibilityRole="radio"
                accessibilityState={{ checked: draft.companyId === id }}
                onPress={() => setDraft((current) => ({ ...current, companyId: id }))}
                style={styles.optionRow}
              >
                <Ionicons
                  name={draft.companyId === id ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={draft.companyId === id ? colors.primary : colors.textSecondary}
                />
                <Text style={styles.checkboxLabel}>{name}</Text>
              </Pressable>
            ))}
          </>
        )}
        <Text style={styles.label}>Servicio</Text>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: draft.pickupOnly }}
          onPress={() => setDraft((current) => ({ ...current, pickupOnly: !current.pickupOnly }))}
          style={styles.checkboxRow}
        >
          <View style={[styles.checkbox, draft.pickupOnly && styles.checkboxChecked]}>
            {draft.pickupOnly && (
              <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />
            )}
          </View>
          <Text style={styles.checkboxLabel}>Ofrecen retiro a domicilio</Text>
        </Pressable>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: draft.openOnly }}
          onPress={() => setDraft((current) => ({ ...current, openOnly: !current.openOnly }))}
          style={styles.checkboxRow}
        >
          <View style={[styles.checkbox, draft.openOnly && styles.checkboxChecked]}>
            {draft.openOnly && <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />}
          </View>
          <Text style={styles.checkboxLabel}>Recepción en el lugar ahora</Text>
        </Pressable>
        {hasLocation && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: draft.nearbyOnly }}
            onPress={() => setDraft((current) => ({ ...current, nearbyOnly: !current.nearbyOnly }))}
            style={styles.checkboxRow}
          >
            <View style={[styles.checkbox, draft.nearbyOnly && styles.checkboxChecked]}>
              {draft.nearbyOnly && (
                <Ionicons name="checkmark" size={16} color={colors.textOnPrimary} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>A menos de 10 km</Text>
          </Pressable>
        )}
      </ScrollView>
      <View style={styles.actions}>
        <View style={styles.actionSlot}>
          <ActionButton title="Limpiar" secondary onPress={() => setDraft(emptyPointFilters)} />
        </View>
        <View style={styles.actionSlot}>
          <ActionButton
            title="Aplicar filtros"
            onPress={() => {
              onApply(draft);
              onClose();
            }}
          />
        </View>
      </View>
    </AnimatedSheetModal>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sheet: {
      width: '100%',
      maxWidth: 960,
      alignSelf: 'center',
      maxHeight: '88%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.border,
      paddingTop: 10,
      paddingBottom: Platform.select({ ios: 24, default: 16 }),
      gap: 12,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderControl,
      alignSelf: 'center',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
    },
    title: { fontFamily: fonts.bold, fontSize: 18, color: colors.text },
    closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
    label: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text, marginTop: 8 },
    hint: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary },
    checkboxRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
    optionRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.borderControl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: colors.primaryAction,
      borderColor: colors.primaryAction,
    },
    checkboxLabel: {
      flex: 1,
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: colors.text,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionSlot: { flex: 1 },
  });
