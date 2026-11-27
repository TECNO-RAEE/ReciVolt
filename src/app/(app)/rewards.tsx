import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { SearchBar } from '@/components/discovery/SearchBar';
import {
  CitizenPage,
  InfoNote,
  PointsBadge,
  RewardPhoto,
  RewardsBalance,
  useRewardStyles,
} from '@/components/rewards/RewardsUI';
import { RewardCard, RewardsSkeleton } from '@/components/rewards/RewardCard';
import { PortalLink, PortalLoading } from '@/components/portal/PortalUI';
import { AccountRequired } from '@/components/auth/AccountRequired';
import { usePortalData } from '@/hooks/usePortalData';
import { rewardExamples } from '@/data/rewardExamples';
import { pointsLabel, rewardCategories, type RewardCategory } from '@/models/Reward';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useWallet } from '@/providers/WalletProvider';
import { getRewards, getRedemptions } from '@/services/reward.service';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';

const REWARD_CATEGORY_ICONS: Record<
  RewardCategory | 'all',
  ComponentProps<typeof Ionicons>['name']
> = {
  all: 'apps-outline',
  food: 'restaurant-outline',
  wellness: 'heart-outline',
  education: 'book-outline',
  shopping: 'home-outline',
  other: 'gift-outline',
};

export default function RewardsScreen() {
  const colors = useColors();
  const s = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const isWide = width >= 720;
  const gridCardWidth = isWide ? Math.floor((Math.min(width, 960) - 40 - 12) / 2) : undefined;
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState(params.tab === 'canjes' ? 'Mis canjes' : 'Disponibles');
  useEffect(() => {
    const nextTab = params.tab === 'canjes' ? 'Mis canjes' : 'Disponibles';
    const syncTab = setTimeout(() => setTab(nextTab), 0);
    return () => clearTimeout(syncTab);
  }, [params.tab]);
  const [category, setCategory] = useState<RewardCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const { session } = useAuth();
  const { now } = useDiscovery();
  const wallet = useWallet();
  const loader = useCallback(() => getRewards(), []);
  const { data, loading, error, refresh } = usePortalData(loader);
  const { refresh: refreshWallet } = wallet;
  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshWallet();
    }, [refresh, refreshWallet])
  );
  const available = useMemo(
    () =>
      (data ?? []).filter(
        (r) =>
          r.active &&
          (!r.startsAt || Date.parse(r.startsAt) <= now.getTime()) &&
          (!r.endsAt || Date.parse(r.endsAt) > now.getTime())
      ),
    [data, now]
  );
  const preview = !loading && !error && available.length === 0;
  const source = preview ? rewardExamples : available;
  const categoryOptions = useMemo(() => {
    const entries = Object.entries(rewardCategories) as [RewardCategory, string][];
    const visible = preview
      ? entries.filter(([key]) => source.some((r) => r.category === key))
      : entries;
    return [['all', 'Todos'], ...visible] as [RewardCategory | 'all', string][];
  }, [preview, source]);
  const activeCategory =
    preview && category !== 'all' && !source.some((r) => r.category === category)
      ? 'all'
      : category;
  const filtered = source.filter(
    (r) =>
      (activeCategory === 'all' || r.category === activeCategory) &&
      `${r.title} ${r.businessName}`
        .toLocaleLowerCase('es-AR')
        .includes(search.trim().toLocaleLowerCase('es-AR'))
  );
  const userPoints = session ? (wallet.data?.points ?? null) : null;

  return (
    <CitizenPage title="Premios">
      {session && (
        <RewardsBalance
          points={wallet.data?.points ?? null}
          loading={wallet.loading}
          error={wallet.error}
          onPress={() => (wallet.error ? void refreshWallet() : router.push('/my-points'))}
        />
      )}
      <View accessibilityRole="tablist" style={styles.segmentedControl}>
        {['Disponibles', 'Mis canjes'].map((label) => {
          const selected = tab === label;
          return (
            <SpringPressable
              key={label}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                setTab(label);
                // Clear ?tab=canjes so "Ver mis canjes" can switch tabs again later.
                if (params.tab) router.setParams({ tab: undefined });
              }}
              pressScale={motion.scale.button}
              style={[styles.segment, selected && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                {label}
              </Text>
            </SpringPressable>
          );
        })}
      </View>
      {tab === 'Mis canjes' ? (
        session ? (
          <MyRedemptions key={session.user.id} isWide={isWide} gridCardWidth={gridCardWidth} />
        ) : (
          <AccountRequired title="Mis canjes" embedded />
        )
      ) : (
        <>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            label="Buscar por premio o comercio"
            placeholder="Buscá un premio o comercio"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {categoryOptions.map(([key, label]) => {
              const selected = activeCategory === key;
              return (
                <SpringPressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected }}
                  onPress={() => setCategory(key)}
                  pressScale={motion.scale.chip}
                  style={[styles.chip, selected && styles.selectedChip]}
                >
                  <View accessibilityElementsHidden importantForAccessibility="no">
                    <Ionicons
                      name={REWARD_CATEGORY_ICONS[key]}
                      size={15}
                      color={selected ? colors.textOnPrimary : colors.primaryDark}
                    />
                  </View>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {label}
                  </Text>
                </SpringPressable>
              );
            })}
          </ScrollView>
          {loading ? (
            <RewardsSkeleton />
          ) : error ? (
            <PortalLoading loading={false} error={error} retry={() => void refresh()} />
          ) : (
            <>
              {preview && (
                <InfoNote>
                  Vista de ejemplo. Aún no hay premios publicados. Estos beneficios no se pueden
                  canjear.
                </InfoNote>
              )}
              {filtered.length === 0 && (
                <View style={s.card}>
                  <Text style={s.subtitle}>No encontramos premios</Text>
                  <Text style={s.body}>Probá otra categoría o búsqueda.</Text>
                  <ActionButton
                    title="Limpiar filtros"
                    secondary
                    onPress={() => {
                      setCategory('all');
                      setSearch('');
                    }}
                  />
                </View>
              )}
              <View style={[styles.list, isWide && styles.listGrid]}>
                {filtered.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    userPoints={userPoints}
                    style={gridCardWidth ? { width: gridCardWidth } : undefined}
                    onPress={() =>
                      router.push({ pathname: '/reward/[id]', params: { id: reward.id } })
                    }
                  />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </CitizenPage>
  );
}
function MyRedemptions({
  isWide,
  gridCardWidth,
}: Readonly<{ isWide: boolean; gridCardWidth?: number }>) {
  const colors = useColors();
  const s = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  const [page, setPage] = useState(0);
  const loader = useCallback(() => getRedemptions(page), [page]);
  const { data, loading, error, refresh } = usePortalData(loader);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );
  return (
    <View style={{ gap: 16 }}>
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {!loading && !error && data?.length === 0 && (
        <View style={s.card}>
          <Text style={s.subtitle}>{page ? 'No hay más canjes' : 'Todavía no tenés canjes'}</Text>
          <Text style={s.body}>Cuando elijas un premio, su código quedará guardado acá.</Text>
        </View>
      )}
      <View style={[styles.list, isWide && styles.listGrid]}>
        {data?.map((r) => {
          const reserved = r.status === 'RESERVED';
          const statusHint = reserved ? 'Reservado · Ver código' : 'Entregado · Ver detalle';
          return (
            <SpringPressable
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`${r.reward.title}, ${r.reward.businessName}, ${pointsLabel(r.pointsCost)}, ${statusHint}`}
              onPress={() => router.push({ pathname: '/redemption/[id]', params: { id: r.id } })}
              pressScale={motion.scale.card}
              style={[styles.redemptionCard, gridCardWidth ? { width: gridCardWidth } : undefined]}
            >
              <View style={styles.redemptionPhoto}>
                <RewardPhoto reward={r.reward} height={104} />
              </View>
              <View style={styles.redemptionBody}>
                <Text style={styles.redemptionTitle} numberOfLines={2}>
                  {r.reward.title}
                </Text>
                <Text style={styles.redemptionBusiness} numberOfLines={1}>
                  {r.reward.businessName}
                </Text>
                <View style={styles.redemptionBadges}>
                  <PointsBadge points={r.pointsCost} />
                  <View
                    style={[
                      styles.statusPill,
                      reserved ? styles.statusPillReserved : styles.statusPillDelivered,
                    ]}
                  >
                    <Ionicons
                      name={reserved ? 'time-outline' : 'checkmark-circle-outline'}
                      size={14}
                      color={reserved ? colors.primaryDark : colors.textOnPrimary}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        reserved ? styles.statusPillTextReserved : styles.statusPillTextDelivered,
                      ]}
                    >
                      {reserved ? 'Reservado' : 'Entregado'}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </SpringPressable>
          );
        })}
      </View>
      {(page > 0 || (data?.length ?? 0) >= 30) && (
        <View style={s.row}>
          {page > 0 && <PortalLink title="Anterior" onPress={() => setPage(page - 1)} />}
          {(data?.length ?? 0) >= 30 && (
            <PortalLink title="Más canjes" onPress={() => setPage(page + 1)} />
          )}
        </View>
      )}
    </View>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    segmentedControl: {
      flexDirection: 'row',
      padding: 4,
      gap: 4,
      borderRadius: 14,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    segment: {
      flex: 1,
      minHeight: 44,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    segmentActive: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      boxShadow: '0 2px 6px rgba(22,65,39,0.06)',
    },
    segmentText: {
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.textSecondary,
    },
    segmentTextActive: {
      fontFamily: fonts.bold,
      color: colors.primaryDark,
    },
    chips: { gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      paddingHorizontal: 14,
      minHeight: 44,
      justifyContent: 'center',
      backgroundColor: colors.surfaceSoft,
    },
    selectedChip: { backgroundColor: colors.primaryAction, borderColor: colors.primaryAction },
    chipText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text },
    chipTextSelected: { color: colors.textOnPrimary },
    list: { gap: 12 },
    listGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'stretch',
    },
    redemptionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 10,
      paddingRight: 12,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: '0 3px 12px rgba(22,65,39,0.05)',
    },
    redemptionPhoto: { width: 104, borderRadius: 12, overflow: 'hidden', flexShrink: 0 },
    redemptionBody: { flex: 1, minWidth: 0, gap: 6 },
    redemptionTitle: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.text },
    redemptionBusiness: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
    redemptionBadges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    statusPillReserved: {
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
    },
    statusPillDelivered: { backgroundColor: colors.primaryAction },
    statusPillText: { fontFamily: fonts.semiBold, fontSize: 12 },
    statusPillTextReserved: { color: colors.primaryDark },
    statusPillTextDelivered: { color: colors.textOnPrimary },
  });
