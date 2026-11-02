import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActionButton } from '@/components/ui/ActionButton';
import { DiscoveryState } from '@/components/discovery/DiscoveryState';
import { PointCardPreview } from '@/components/discovery/PointCardPreview';
import {
  PointFilterSheet,
  emptyPointFilters,
  type PointFilterValues,
} from '@/components/discovery/PointFilterSheet';
import { PointsMap } from '@/components/discovery/PointsMap';
import { PointRow } from '@/components/discovery/PointRow';
import { SearchBar } from '@/components/discovery/SearchBar';
import { InfoNote } from '@/components/rewards/RewardsUI';
import { filterGreenPoints, type GreenPoint } from '@/models/GreenPoint';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import { useScrollReset } from '@/hooks/useScrollReset';
import { colors, fonts } from '@/theme';

function ViewToggle({
  label,
  selected,
  onPress,
}: Readonly<{ label: string; selected: boolean; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.pill, selected && styles.pillSelected]}
    >
      <Text style={[styles.pillText, selected && { color: colors.textOnPrimary }]}>{label}</Text>
    </Pressable>
  );
}
export default function GreenPointsScreen() {
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  return (
    <GreenPointsExplorer
      key={`${params.q ?? ''}|${params.category ?? ''}`}
      initialSearch={params.q ?? ''}
      initialCategory={params.category ?? ''}
    />
  );
}
function GreenPointsExplorer({
  initialSearch,
  initialCategory,
}: Readonly<{ initialSearch: string; initialCategory: string }>) {
  const scroll = useScrollReset();
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
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );
  const [search, setSearch] = useState(initialSearch);
  const [filters, setFilters] = useState<PointFilterValues>({
    ...emptyPointFilters,
    categoryIds: initialCategory ? [initialCategory] : [],
  });
  const [view, setView] = useState<'map' | 'list'>('map');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const companies = useMemo(
    () =>
      [...new Map(points.map((p) => [p.companyId, p.companyName])).entries()].sort((a, b) =>
        a[1].localeCompare(b[1], 'es')
      ),
    [points]
  );
  const filtered = useMemo(
    () =>
      filterGreenPoints(
        points,
        {
          search,
          categoryIds: filters.categoryIds,
          companyId: filters.companyId,
          openOnly: filters.openOnly,
          pickupOnly: filters.pickupOnly,
          nearbyOnly: filters.nearbyOnly,
        },
        location,
        now
      ),
    [points, search, filters, location, now]
  );
  const selectedPoint = useMemo(
    () => filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId]
  );
  const activeFilterCount =
    filters.categoryIds.length +
    (filters.companyId ? 1 : 0) +
    (filters.pickupOnly ? 1 : 0) +
    (filters.openOnly ? 1 : 0) +
    (filters.nearbyOnly ? 1 : 0);
  const openPoint = useCallback(
    (point: GreenPoint) => router.push({ pathname: '/point/[id]', params: { id: point.id } }),
    []
  );
  const clear = () => {
    setSearch('');
    setFilters(emptyPointFilters);
    setSelectedId(null);
  };
  return (
    <View style={styles.container}>
      <ScreenHeader title="Puntos verdes" />
      <View style={styles.toolbar}>
        <View style={styles.searchRow}>
          <View style={styles.searchSlot}>
            <SearchBar value={search} onChangeText={setSearch} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar puntos verdes"
            onPress={refresh}
            style={({ pressed }) => [styles.filterButton, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="refresh-outline" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Filtrar puntos verdes${activeFilterCount ? `, ${activeFilterCount} filtros activos` : ''}`}
            onPress={() => setFilterSheetOpen(true)}
            style={({ pressed }) => [styles.filterButton, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="options-outline" size={22} color={colors.primary} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <View style={styles.pillRow}>
          <ViewToggle label="Mapa" selected={view === 'map'} onPress={() => setView('map')} />
          <ViewToggle label="Lista" selected={view === 'list'} onPress={() => setView('list')} />
        </View>
      </View>
      {loading || error ? (
        <View style={styles.stateContent}>
          <DiscoveryState loading={loading} error={error} retry={refresh} />
        </View>
      ) : view === 'map' ? (
        <View style={styles.mapArea}>
          <PointsMap
            points={filtered}
            location={location}
            fill
            selectedId={selectedPoint?.id ?? null}
            onSelect={(point) => setSelectedId(point.id)}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={location ? 'Actualizar mi ubicación' : 'Usar mi ubicación'}
            onPress={() => void requestLocation()}
            style={({ pressed }) => [styles.locateButton, pressed && { opacity: 0.7 }]}
          >
            <Ionicons
              name={locating ? 'hourglass-outline' : 'locate-outline'}
              size={22}
              color={colors.primary}
            />
          </Pressable>
          {(locationError || points.some((p) => p.demo)) && (
            <View style={styles.mapNotices}>
              {locationError && (
                <View style={styles.mapNotice}>
                  <Text style={styles.mapNoticeText}>{locationError}</Text>
                </View>
              )}
              {points.some((p) => p.demo) && (
                <View style={styles.mapNotice}>
                  <Text style={styles.mapNoticeText}>
                    Todavía no hay puntos publicados. Explorá este punto verde de ejemplo; no
                    permite registrar entregas reales.
                  </Text>
                </View>
              )}
            </View>
          )}
          <View style={styles.floatingCard}>
            {filtered.length === 0 ? (
              <View style={styles.emptyFloating}>
                <DiscoveryState
                  loading={false}
                  error={null}
                  retry={refresh}
                  empty={
                    points.length === 0
                      ? 'Todavía no hay puntos publicados. Volvé a consultar más adelante.'
                      : 'No encontramos puntos con estos filtros.'
                  }
                />
                {points.length > 0 && (
                  <ActionButton title="Limpiar filtros" secondary onPress={clear} />
                )}
              </View>
            ) : (
              <PointCardPreview
                count={filtered.length}
                demo={points.some((p) => p.demo)}
                point={selectedPoint}
                location={location}
                now={now}
                onViewAll={() => setView('list')}
                onOpenPoint={() => selectedPoint && openPoint(selectedPoint)}
              />
            )}
          </View>
        </View>
      ) : (
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
        >
          {points.some((p) => p.demo) && (
            <InfoNote>
              Todavía no hay puntos publicados. Explorá este punto verde de ejemplo; no permite
              registrar entregas reales.
            </InfoNote>
          )}
          <Text style={styles.label}>
            {filtered.length}{' '}
            {points.some((p) => p.demo)
              ? filtered.length === 1
                ? 'punto de ejemplo'
                : 'puntos de ejemplo'
              : filtered.length === 1
                ? 'punto disponible'
                : 'puntos disponibles'}
          </Text>
          {filtered.length === 0 ? (
            <>
              <DiscoveryState
                loading={false}
                error={null}
                retry={refresh}
                empty={
                  points.length === 0
                    ? 'Todavía no hay puntos publicados. Volvé a consultar más adelante.'
                    : 'No encontramos puntos con estos filtros.'
                }
              />
              {points.length > 0 && (
                <ActionButton title="Limpiar filtros" secondary onPress={clear} />
              )}
            </>
          ) : (
            filtered.map((point) => (
              <PointRow
                key={point.id}
                point={point}
                location={location}
                now={now}
                onPress={() => openPoint(point)}
              />
            ))
          )}
        </ScrollView>
      )}
      <PointFilterSheet
        visible={filterSheetOpen}
        categories={categories}
        companies={companies}
        hasLocation={!!location}
        values={filters}
        onApply={setFilters}
        onClose={() => setFilterSheetOpen(false)}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  toolbar: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 12,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchSlot: { flex: 1 },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.textOnPrimary },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  stateContent: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  mapArea: { flex: 1 },
  locateButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 5px 16px rgba(22,65,39,0.08)',
  },
  mapNotices: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 68,
    gap: 8,
  },
  mapNotice: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    boxShadow: '0 5px 16px rgba(22,65,39,0.08)',
  },
  mapNoticeText: { fontFamily: fonts.regular, fontSize: 13, color: colors.text },
  floatingCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  emptyFloating: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    boxShadow: '0 7px 20px rgba(22,65,39,0.10)',
  },
  listContent: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: 24,
    paddingTop: 0,
    gap: 16,
    paddingBottom: 32,
  },
  label: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
});
