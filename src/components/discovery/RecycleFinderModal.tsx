import { useMemo, useState } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/ui/ActionButton';
import { AnimatedSheetModal } from '@/components/ui/AnimatedSheetModal';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { DiscoveryState } from '@/components/discovery/DiscoveryState';
import { PointRow } from '@/components/discovery/PointRow';
import { SearchBar } from '@/components/discovery/SearchBar';
import { PortalFeedback } from '@/components/portal/PortalUI';
import { InfoNote } from '@/components/rewards/RewardsUI';
import { getCategoryVisual, type DeviceCategory } from '@/models/DeviceCategory';
import { filterGreenPoints, type GreenPoint } from '@/models/GreenPoint';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';

type RecycleFinderModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectPoint: (point: GreenPoint) => void;
  onViewAllPoints: () => void;
};

function buildResultSummary(
  count: number,
  selectedCategory: DeviceCategory | null,
  trimmedQuery: string,
  hasLocation: boolean
): string {
  const topic =
    selectedCategory && trimmedQuery
      ? `${selectedCategory.name} («${trimmedQuery}»)`
      : (selectedCategory?.name ?? (trimmedQuery ? `«${trimmedQuery}»` : null));

  if (count === 0) {
    return topic ? `0 puntos para ${topic}` : '0 puntos disponibles';
  }

  if (topic) {
    if (hasLocation) {
      return count === 1
        ? `1 punto cercano que recibe ${topic}`
        : `${count} puntos más cercanos que reciben ${topic}`;
    }
    return count === 1
      ? `1 punto verde que recibe ${topic}`
      : `${count} puntos verdes que reciben ${topic}`;
  }

  if (hasLocation) {
    return count === 1 ? '1 punto verde más cercano' : `${count} puntos más cercanos`;
  }
  return count === 1 ? '1 punto verde disponible' : `${count} puntos verdes disponibles`;
}

/**
 * Search sheet opened from Home so citizens can type a device or pick a category chip
 * and jump directly to the nearest green points that accept it.
 */
export function RecycleFinderModal({
  visible,
  onClose,
  onSelectPoint,
  onViewAllPoints,
}: Readonly<RecycleFinderModalProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const {
    points,
    categories,
    loading,
    error,
    refresh,
    location,
    locating,
    locationError,
    requestLocation,
    now,
  } = useDiscovery();

  const [query, setQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [wasVisible, setWasVisible] = useState(visible);

  // Reset search state cleanly each time the modal opens so it matches the Home prompt.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setQuery('');
      setSelectedCategoryId(null);
    }
  }

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const filteredPoints = useMemo(
    () =>
      filterGreenPoints(
        points,
        {
          search: query,
          categoryId: selectedCategoryId ?? undefined,
        },
        location,
        now
      ),
    [points, query, selectedCategoryId, location, now]
  );

  const trimmedQuery = query.trim();
  const hasActiveFilter = trimmedQuery.length > 0 || selectedCategoryId !== null;
  const hasDemoPoints = !loading && !error && filteredPoints.some((point) => point.demo);
  const summaryText = buildResultSummary(
    filteredPoints.length,
    selectedCategory,
    trimmedQuery,
    Boolean(location)
  );

  const clearFilters = () => {
    setQuery('');
    setSelectedCategoryId(null);
  };

  const handleSelectPoint = (point: GreenPoint) => {
    Keyboard.dismiss();
    onClose();
    onSelectPoint(point);
  };

  const handleViewAll = () => {
    Keyboard.dismiss();
    onClose();
    onViewAllPoints();
  };

  return (
    <AnimatedSheetModal
      visible={visible}
      onClose={onClose}
      presentation="sheet"
      containerStyle={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <View style={styles.handle} />
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.title}>
          ¿Qué tenés para reciclar?
        </Text>
        <SpringPressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar buscador"
          onPress={onClose}
          pressScale={motion.scale.icon}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </SpringPressable>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar
          autoFocus
          value={query}
          onChangeText={setQuery}
          label="Buscar qué tenés para reciclar"
          placeholder="Ej. celular, notebook, TV, cargador"
        />
      </View>

      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsRow}
        >
          <SpringPressable
            accessibilityRole="button"
            accessibilityLabel="Todos"
            accessibilityState={{ selected: selectedCategoryId === null }}
            onPress={() => setSelectedCategoryId(null)}
            pressScale={motion.scale.chip}
            style={[styles.chip, selectedCategoryId === null && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selectedCategoryId === null && styles.chipTextSelected]}>
              Todos
            </Text>
          </SpringPressable>
          {categories.map((category) => {
            const selected = selectedCategoryId === category.id;
            const visual = getCategoryVisual(category);
            return (
              <SpringPressable
                key={category.id}
                accessibilityRole="button"
                accessibilityLabel={category.name}
                accessibilityState={{ selected }}
                onPress={() =>
                  setSelectedCategoryId((current) => (current === category.id ? null : category.id))
                }
                pressScale={motion.scale.chip}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <View accessibilityElementsHidden importantForAccessibility="no">
                  <MaterialCommunityIcons
                    name={visual.icon}
                    size={16}
                    color={selected ? colors.textOnPrimary : colors.primaryDark}
                  />
                </View>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {category.name}
                </Text>
              </SpringPressable>
            );
          })}
        </ScrollView>
      )}

      {!loading && !error && (
        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            <Text style={styles.summary}>{summaryText}</Text>
            {!location && (
              <SpringPressable
                accessibilityRole="button"
                accessibilityLabel="Usar mi ubicación para ordenar por cercanía"
                disabled={locating}
                onPress={() => void requestLocation()}
                pressScale={motion.scale.chip}
                style={[styles.locationPill, locating && styles.pressed]}
              >
                {locating ? (
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                ) : (
                  <Ionicons name="locate-outline" size={16} color={colors.primaryDark} />
                )}
                <Text style={styles.locationPillText}>
                  {locating ? 'Ubicando…' : 'Usar mi ubicación'}
                </Text>
              </SpringPressable>
            )}
          </View>
          {locationError && <PortalFeedback error={locationError} />}
        </View>
      )}

      {loading || error ? (
        <View style={styles.stateWrap}>
          <DiscoveryState loading={loading} error={error} retry={refresh} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={filteredPoints}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            hasDemoPoints ? (
              <View style={styles.demoNoteWrap}>
                <InfoNote>
                  Explorá un punto verde de ejemplo. Las entregas reales estarán disponibles cuando
                  haya puntos publicados.
                </InfoNote>
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <PointRow
              point={item}
              location={location}
              now={now}
              onPress={() => handleSelectPoint(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>
                {points.length === 0
                  ? 'Todavía no hay puntos verdes publicados.'
                  : hasActiveFilter
                    ? `No encontramos puntos verdes que reciban ${
                        selectedCategory && trimmedQuery
                          ? `${selectedCategory.name} con «${trimmedQuery}»`
                          : (selectedCategory?.name ?? `«${trimmedQuery}»`)
                      }.`
                    : 'No encontramos puntos verdes disponibles.'}
              </Text>
              <Text style={styles.emptyHint}>
                {points.length === 0
                  ? 'Volvé a consultar más adelante o actualizá la lista.'
                  : 'Probá con otro dispositivo o explorá todos los puntos en el mapa.'}
              </Text>
              <View style={styles.emptyActions}>
                {points.length > 0 && hasActiveFilter && (
                  <ActionButton title="Limpiar búsqueda" secondary onPress={clearFilters} />
                )}
                {points.length === 0 ? (
                  <ActionButton title="Actualizar" secondary onPress={refresh} />
                ) : (
                  <ActionButton title="Ver todos en Puntos verdes" onPress={handleViewAll} />
                )}
              </View>
            </View>
          }
        />
      )}
    </AnimatedSheetModal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sheet: {
      width: '100%',
      maxWidth: 720,
      height: '86%',
      maxHeight: '90%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: colors.border,
      paddingTop: 10,
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
    title: {
      flex: 1,
      fontFamily: fonts.bold,
      fontSize: 20,
      lineHeight: 26,
      color: colors.text,
    },
    closeButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: -8,
    },
    searchWrap: {
      paddingHorizontal: 20,
    },
    chipsScroll: {
      flexGrow: 0,
    },
    chipsRow: {
      paddingHorizontal: 20,
      gap: 8,
    },
    chip: {
      minHeight: 44,
      paddingHorizontal: 14,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceSoft,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chipSelected: {
      backgroundColor: colors.primaryAction,
      borderColor: colors.primaryAction,
    },
    chipText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.text,
    },
    chipTextSelected: {
      color: colors.textOnPrimary,
    },
    statusSection: {
      paddingHorizontal: 20,
      gap: 8,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
    },
    summary: {
      flex: 1,
      minWidth: 180,
      fontFamily: fonts.semiBold,
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
    },
    locationPill: {
      minHeight: 44,
      paddingHorizontal: 12,
      borderRadius: 22,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    locationPillText: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      color: colors.primaryDark,
    },
    stateWrap: {
      paddingHorizontal: 20,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    demoNoteWrap: {
      marginBottom: 4,
    },
    emptyWrap: {
      paddingVertical: 20,
      gap: 10,
    },
    emptyTitle: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
    },
    emptyHint: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    emptyActions: {
      marginTop: 6,
      gap: 10,
    },
    pressed: {
      opacity: 0.7,
    },
  });
