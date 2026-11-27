import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActionButton } from '@/components/ui/ActionButton';
import { SpringPressable } from '@/components/ui/SpringPressable';
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
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';

function ViewToggle({
  label,
  selected,
  onPress,
}: Readonly<{ label: string; selected: boolean; onPress: () => void }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <SpringPressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      pressScale={motion.scale.chip}
      style={[styles.pill, selected && styles.pillSelected]}
    >
      <Text style={[styles.pillText, selected && { color: colors.textOnPrimary }]}>{label}</Text>
    </SpringPressable>
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
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const listRef = useRef<FlatList<GreenPoint>>(null);
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
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
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
  const [dismissedNoticeKey, setDismissedNoticeKey] = useState<string | null>(null);
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
  const hasDemoPoints = points.some((p) => p.demo);
  const mapNoticeText = [
    locationError,
    hasDemoPoints
      ? 'Todavía no hay puntos publicados. Explorá este punto verde de ejemplo; no permite registrar entregas reales.'
      : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(' ');
  const showMapNotice = Boolean(mapNoticeText) && dismissedNoticeKey !== mapNoticeText;
  const countLabel =
    filtered.length === 0 && points.length > 0
      ? '0 resultados'
      : `${filtered.length} ${
          filtered.some((p) => p.demo)
            ? filtered.length === 1
              ? 'punto de ejemplo'
              : 'puntos de ejemplo'
            : filtered.length === 1
              ? 'punto disponible'
              : 'puntos disponibles'
        }`;
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
          <SpringPressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar puntos verdes"
            onPress={refresh}
            pressScale={motion.scale.icon}
            style={styles.filterButton}
          >
            <Ionicons name="refresh-outline" size={22} color={colors.primary} />
          </SpringPressable>
          <SpringPressable
            accessibilityRole="button"
            accessibilityLabel={`Filtrar puntos verdes${activeFilterCount ? `, ${activeFilterCount} filtros activos` : ''}`}
            onPress={() => setFilterSheetOpen(true)}
            pressScale={motion.scale.icon}
            style={styles.filterButton}
          >
            <Ionicons name="options-outline" size={22} color={colors.primary} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </SpringPressable>
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
          <SpringPressable
            accessibilityRole="button"
            accessibilityLabel={location ? 'Actualizar mi ubicación' : 'Usar mi ubicación'}
            onPress={() => void requestLocation()}
            pressScale={motion.scale.icon}
            style={styles.locateButton}
          >
            <Ionicons
              name={locating ? 'hourglass-outline' : 'locate-outline'}
              size={22}
              color={colors.primary}
            />
          </SpringPressable>
          {showMapNotice && (
            <View style={styles.mapNotices}>
              <View style={styles.mapNotice}>
                <Text style={styles.mapNoticeText}>{mapNoticeText}</Text>
                <SpringPressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar aviso"
                  onPress={() => setDismissedNoticeKey(mapNoticeText)}
                  pressScale={motion.scale.icon}
                  style={styles.dismissNoticeBtn}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </SpringPressable>
              </View>
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
                demo={hasDemoPoints}
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
        <FlatList
          ref={listRef}
          style={{ flex: 1 }}
          data={filtered}
          keyExtractor={(point) => point.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <PointRow point={item} location={location} now={now} onPress={() => openPoint(item)} />
          )}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {hasDemoPoints && (
                <InfoNote>
                  Todavía no hay puntos publicados. Explorá este punto verde de ejemplo; no permite
                  registrar entregas reales.
                </InfoNote>
              )}
              <Text style={styles.label}>{countLabel}</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.listEmpty}>
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
          }
        />
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
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
      backgroundColor: colors.primaryAction,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.textOnPrimary },
    pillRow: { flexDirection: 'row', gap: 8 },
    pill: {
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.borderControl,
      backgroundColor: colors.surface,
      justifyContent: 'center',
    },
    pillSelected: { backgroundColor: colors.primaryAction, borderColor: colors.primaryAction },
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingVertical: 8,
      paddingLeft: 12,
      paddingRight: 6,
      boxShadow: '0 5px 16px rgba(22,65,39,0.08)',
    },
    mapNoticeText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.text },
    dismissNoticeBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
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
    listHeader: { gap: 12 },
    listEmpty: { gap: 12 },
    label: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  });
