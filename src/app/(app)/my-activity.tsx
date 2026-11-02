import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AccountRequired } from '@/components/auth/AccountRequired';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { rewardStyles as s } from '@/components/rewards/RewardsUI';
import { useAuth } from '@/providers/AuthProvider';
import {
  getActivityHistoryPage,
  sortActivityEntries,
  type ActivityEntry,
  type ActivityPageCursor,
} from '@/services/activity.service';
import { colors, fonts } from '@/theme';

const filters = ['Todos', 'Entregas', 'Retiros', 'Canjes'] as const;
type Filter = (typeof filters)[number];
const kindForFilter: Record<Exclude<Filter, 'Todos'>, ActivityEntry['kind']> = {
  Entregas: 'DELIVERY',
  Retiros: 'PICKUP',
  Canjes: 'REDEMPTION',
};
const initialCursor = (): ActivityPageCursor => ({ deliveries: 0, pickups: 0, redemptions: 0 });

export default function MyActivityScreen() {
  const { session } = useAuth();
  return session ? <MyActivity /> : <AccountRequired title="Mi actividad" back="/profile" />;
}

function MyActivity() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialFilter =
    filters.find((filter) => filter.toLowerCase() === params.tab?.toLowerCase()) ?? 'Todos';
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<ActivityPageCursor>(initialCursor);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const requestLock = useRef(false);

  const reload = useCallback(async () => {
    const request = ++requestVersion.current;
    requestLock.current = true;
    setEntries([]);
    setNextCursor(initialCursor());
    setHasMore(true);
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    try {
      const page = await getActivityHistoryPage(initialCursor());
      if (request === requestVersion.current) {
        setEntries(page.entries);
        setNextCursor(page.next);
        setHasMore(page.hasMore);
      }
    } catch (cause) {
      if (request === requestVersion.current) {
        setError(cause instanceof Error ? cause.message : 'No pudimos cargar tu actividad.');
        setHasMore(false);
      }
    } finally {
      if (request === requestVersion.current) {
        requestLock.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const initialLoad = setTimeout(() => void reload(), 0);
    return () => clearTimeout(initialLoad);
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (requestLock.current || !hasMore) return;
    const request = requestVersion.current;
    requestLock.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await getActivityHistoryPage(nextCursor);
      if (request === requestVersion.current) {
        setEntries((current) => {
          const unique = new Map<string, ActivityEntry>();
          current.forEach((entry) => unique.set(entry.id, entry));
          page.entries.forEach((entry) => unique.set(entry.id, entry));
          return sortActivityEntries([...unique.values()]);
        });
        setNextCursor(page.next);
        setHasMore(page.hasMore);
      }
    } catch (cause) {
      if (request === requestVersion.current) {
        setError(cause instanceof Error ? cause.message : 'No pudimos cargar más actividad.');
      }
    } finally {
      if (request === requestVersion.current) {
        requestLock.current = false;
        setLoadingMore(false);
      }
    }
  }, [hasMore, nextCursor]);

  const visible = useMemo(
    () =>
      entries.filter((entry) => filter === 'Todos' || entry.kind === kindForFilter[filter]),
    [entries, filter]
  );
  const hasPickups = entries.some((entry) => entry.kind === 'PICKUP');
  const mayHaveMorePickups = nextCursor.pickups !== null;
  const showRetirementInfo =
    !hasPickups &&
    !mayHaveMorePickups &&
    (filter === 'Retiros' || filter === 'Todos');

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.filters} accessibilityRole="tablist">
        {filters.map((item) => {
          const selected = filter === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setFilter(item)}
              style={[styles.filter, selected && styles.selectedFilter]}
            >
              <Text style={[styles.filterText, selected && styles.selectedFilterText]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const listEmpty = () => {
    if (loading) return <ActivityIndicator accessibilityLabel="Cargando actividad" color={colors.primary} />;
    if (error && entries.length === 0) {
      return (
        <Pressable onPress={() => void reload()} style={s.card} accessibilityRole="button">
          <Text style={s.body}>No pudimos cargar tu actividad. Tocá para reintentar.</Text>
        </Pressable>
      );
    }
    if (filter !== 'Retiros' && !showRetirementInfo) {
      return (
        <View style={s.card}>
          <Text style={s.body}>Todavía no hay actividad en esta sección.</Text>
        </View>
      );
    }
    return null;
  };

  const listFooter = () => (
    <View style={styles.listFooter}>
      {showRetirementInfo && (
        <View style={styles.emptyRetirements}>
          <View style={styles.truckIcon}>
            <Ionicons name="car-outline" size={28} color={colors.primaryDark} />
          </View>
          <Text style={s.label}>Tus retiros aparecerán acá</Text>
          <Text style={[s.body, { textAlign: 'center' }]}>Cuando se confirmen tus retiros, los verás en esta sección.</Text>
        </View>
      )}
      {loadingMore && <ActivityIndicator accessibilityLabel="Cargando más actividad" color={colors.primary} />}
      {!!error && entries.length > 0 && (
        <Pressable onPress={() => void loadMore()} style={s.card} accessibilityRole="button">
          <Text style={s.body}>No pudimos cargar más actividad. Tocá para reintentar.</Text>
        </Pressable>
      )}
      {!loading && !loadingMore && hasMore && visible.length === 0 && (
        <Pressable onPress={() => void loadMore()} style={styles.loadMoreButton} accessibilityRole="button">
          <Text style={styles.loadMoreText}>Cargar más movimientos</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={s.page}>
      <ScreenHeader title="Mi actividad" back="/profile" />
      <FlatList
        style={{ flex: 1 }}
        data={visible}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item }) => <ActivityRow entry={item} />}
        ItemSeparatorComponent={ActivitySeparator}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentContainerStyle={[s.content, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        onEndReached={() => {
          if (visible.length > 0 && !error) void loadMore();
        }}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

function ActivitySeparator() {
  return <View style={{ height: 12 }} />;
}

function ActivityRow({ entry }: Readonly<{ entry: ActivityEntry }>) {

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.title}: ${entry.source}. Abrir detalle`}
      onPress={() => router.push(entry.destination)}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
    >
      <View style={styles.eventIcon}>
        {entry.kind === 'DELIVERY' ? (
          <MaterialCommunityIcons name="recycle" size={22} color={colors.primaryDark} />
        ) : (
          <Ionicons
            name={entry.kind === 'REDEMPTION' ? 'gift-outline' : 'car-outline'}
            size={22}
            color={colors.primaryDark}
          />
        )}
      </View>
      <View style={styles.description}>
        <Text style={s.label} numberOfLines={1}>{entry.source}</Text>
        <Text style={s.body}>{entry.title}</Text>
        {!!entry.detail && <Text style={s.body} numberOfLines={1}>{entry.detail}</Text>}
        <Text style={s.body}>{new Date(entry.createdAt).toLocaleDateString('es-AR')}</Text>
      </View>
      <View style={styles.amountBlock}>
        {entry.amount !== null && (
          <Text style={[styles.amount, { color: entry.amount >= 0 ? colors.primaryDark : colors.danger }]}>
            {entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString('es-AR')}
          </Text>
        )}
        {entry.amount !== null && (
          <Text style={[s.body, { color: entry.amount >= 0 ? colors.primaryDark : colors.danger }]}>
            {Math.abs(entry.amount) === 1 ? 'punto' : 'puntos'}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listHeader: { paddingBottom: 16 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { minHeight: 44, minWidth: 72, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  selectedFilter: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textSecondary, fontFamily: fonts.semiBold, fontSize: 14 },
  selectedFilterText: { color: colors.textOnPrimary },
  row: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.surface, boxShadow: '0 4px 16px rgba(22,65,39,0.05)' },
  eventIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  description: { flex: 1, gap: 3 },
  amountBlock: { alignItems: 'flex-end', minWidth: 56 },
  amount: { fontFamily: fonts.bold, fontSize: 18 },
  listFooter: { gap: 12, paddingTop: 16 },
  emptyRetirements: { minHeight: 190, padding: 20, gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  truckIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  loadMoreButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  loadMoreText: { color: colors.primaryDark, fontFamily: fonts.semiBold, fontSize: 14 },
});
