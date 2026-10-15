import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActionButton } from '@/components/ui/ActionButton';
import { DiscoveryState } from '@/components/discovery/DiscoveryState';
import { PointsMap } from '@/components/discovery/PointsMap';
import { PointRow } from '@/components/discovery/PointRow';
import { SearchBar } from '@/components/discovery/SearchBar';
import { InfoNote } from '@/components/rewards/RewardsUI';
import { filterGreenPoints, type GreenPoint } from '@/models/GreenPoint';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import { useScrollReset } from '@/hooks/useScrollReset';
import { colors, fonts } from '@/theme';

function FilterButton({
  label,
  selected,
  onPress,
}: Readonly<{ label: string; selected: boolean; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.filter, selected && styles.selected]}
    >
      <Text style={[styles.filterText, selected && { color: colors.textOnPrimary }]}>{label}</Text>
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
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [companyId, setCompanyId] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [pickupOnly, setPickupOnly] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [view, setView] = useState<'map' | 'list'>('map');
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
        { search, categoryId, companyId, openOnly, pickupOnly, nearbyOnly },
        location,
        now
      ),
    [points, search, categoryId, companyId, openOnly, pickupOnly, nearbyOnly, location, now]
  );
  const openPoint = useCallback(
    (point: GreenPoint) => router.push({ pathname: '/point/[id]', params: { id: point.id } }),
    []
  );
  const clear = () => {
    setSearch('');
    setCategoryId('');
    setCompanyId('');
    setOpenOnly(false);
    setPickupOnly(false);
    setNearbyOnly(false);
  };
  return (
    <View style={styles.container}>
      <ScreenHeader title="Puntos verdes" />
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <SearchBar value={search} onChangeText={setSearch} />
        <ActionButton
          title={location ? 'Actualizar mi ubicación' : 'Usar mi ubicación'}
          secondary
          loading={locating}
          onPress={() => void requestLocation()}
        />
        {locationError && (
          <Text accessibilityRole="alert" style={styles.text}>
            {locationError}
          </Text>
        )}
        {location && (
          <Text style={styles.text}>
            Ordenados por distancia en línea recta desde tu ubicación.
          </Text>
        )}
        <Text style={styles.label}>Dispositivo</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.horizontalFilters}
        >
          <FilterButton label="Todos" selected={!categoryId} onPress={() => setCategoryId('')} />
          {categories.map((c) => (
            <FilterButton
              key={c.id}
              label={c.name}
              selected={categoryId === c.id}
              onPress={() => setCategoryId(categoryId === c.id ? '' : c.id)}
            />
          ))}
        </ScrollView>
        {companies.length > 0 && (
          <>
            <Text style={styles.label}>Organización</Text>
            <ScrollView horizontal contentContainerStyle={styles.horizontalFilters}>
              <FilterButton label="Todas" selected={!companyId} onPress={() => setCompanyId('')} />
              {companies.map(([id, name]) => (
                <FilterButton
                  key={id}
                  label={name}
                  selected={companyId === id}
                  onPress={() => setCompanyId(companyId === id ? '' : id)}
                />
              ))}
            </ScrollView>
          </>
        )}
        <View style={styles.filters}>
          <FilterButton
            label="Abiertos ahora"
            selected={openOnly}
            onPress={() => setOpenOnly(!openOnly)}
          />
          <FilterButton
            label="Ofrecen retiros"
            selected={pickupOnly}
            onPress={() => setPickupOnly(!pickupOnly)}
          />
          {location && (
            <FilterButton
              label="A menos de 10 km"
              selected={nearbyOnly}
              onPress={() => setNearbyOnly(!nearbyOnly)}
            />
          )}
        </View>
        <View style={styles.toolbar}>
          <View style={styles.filters}>
            <FilterButton label="Mapa" selected={view === 'map'} onPress={() => setView('map')} />
            <FilterButton
              label="Lista"
              selected={view === 'list'}
              onPress={() => setView('list')}
            />
          </View>
          <Pressable accessibilityRole="button" onPress={refresh}>
            <Text style={styles.link}>Actualizar</Text>
          </Pressable>
        </View>
        {loading || error ? (
          <DiscoveryState loading={loading} error={error} retry={refresh} />
        ) : (
          <>
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
            {view === 'map' && (
              <PointsMap points={filtered} location={location} onSelect={openPoint} />
            )}
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
          </>
        )}
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    padding: 24,
    gap: 16,
    paddingBottom: 32,
  },
  text: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.brandDark },
  label: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  horizontalFilters: { flexDirection: 'row', gap: 8 },
  filter: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  link: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.primary, paddingVertical: 12 },
});
