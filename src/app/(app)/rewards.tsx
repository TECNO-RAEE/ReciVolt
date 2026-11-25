import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { SpringPressable } from '@/components/ui/SpringPressable';
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

export default function RewardsScreen() {
  const colors = useColors();
  const s = useRewardStyles();
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState(params.tab === 'canjes' ? 'Mis canjes' : 'Disponibles');
  useEffect(() => {
    const nextTab = params.tab === 'canjes' ? 'Mis canjes' : 'Disponibles';
    const syncTab = setTimeout(() => setTab(nextTab), 0);
    return () => clearTimeout(syncTab);
  }, [params.tab]);
  const [category, setCategory] = useState<RewardCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
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
  return (
    <CitizenPage
      title="Premios"
      action={
        <SpringPressable
          accessibilityRole="button"
          accessibilityLabel={searching ? 'Cerrar búsqueda' : 'Buscar premios'}
          pressScale={motion.scale.icon}
          style={styles.searchButton}
          onPress={() => {
            setSearching(!searching);
            setSearch('');
          }}
        >
          <Ionicons name={searching ? 'close' : 'search-outline'} size={23} color={colors.text} />
        </SpringPressable>
      }
    >
      {session && (
        <RewardsBalance
          points={wallet.data?.points ?? null}
          loading={wallet.loading}
          error={wallet.error}
          onPress={() => (wallet.error ? void refreshWallet() : router.push('/my-points'))}
        />
      )}
      <View accessibilityRole="tablist" style={styles.tabs}>
        {['Disponibles', 'Mis canjes'].map((label) => (
          <SpringPressable
            key={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === label }}
            onPress={() => {
              setTab(label);
              // Clear ?tab=canjes so "Ver mis canjes" can switch tabs again later.
              if (params.tab) router.setParams({ tab: undefined });
            }}
            pressScale={motion.scale.button}
            style={[styles.tab, tab === label && styles.activeTab]}
          >
            <Text style={[styles.tabText, tab === label && { color: colors.primaryDark }]}>
              {label}
            </Text>
          </SpringPressable>
        ))}
      </View>
      {tab === 'Mis canjes' ? (
        session ? (
          <MyRedemptions key={session.user.id} />
        ) : (
          <AccountRequired title="Mis canjes" embedded />
        )
      ) : (
        <>
          {searching && (
            <View style={styles.searchBar}>
              <TextInput
                autoFocus
                accessibilityLabel="Buscar por premio o comercio"
                returnKeyType="search"
                value={search}
                onChangeText={setSearch}
                placeholder="Buscá un premio o comercio"
                placeholderTextColor={colors.textSecondary}
                style={styles.searchInput}
              />
              {search !== '' && (
                <SpringPressable
                  accessibilityRole="button"
                  accessibilityLabel="Borrar búsqueda"
                  onPress={() => setSearch('')}
                  pressScale={motion.scale.icon}
                  style={styles.clearSearch}
                >
                  <Ionicons name="close" size={20} color={colors.text} />
                </SpringPressable>
              )}
            </View>
          )}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {categoryOptions.map(([key, label]) => (
              <SpringPressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: activeCategory === key }}
                onPress={() => setCategory(key)}
                pressScale={motion.scale.chip}
                style={[styles.chip, activeCategory === key && styles.selectedChip]}
              >
                <Text
                  style={[
                    styles.chipText,
                    activeCategory === key && { color: colors.textOnPrimary },
                  ]}
                >
                  {label}
                </Text>
              </SpringPressable>
            ))}
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
              <View style={styles.list}>
                {filtered.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
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
function MyRedemptions() {
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
            style={styles.redemptionCard}
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
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </SpringPressable>
        );
      })}
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
    searchButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border },
    tab: {
      flex: 1,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderColor: 'transparent',
    },
    activeTab: { borderColor: colors.primaryDark },
    tabText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textSecondary },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderControl,
      borderRadius: 12,
      minHeight: 48,
      paddingLeft: 12,
      paddingRight: 4,
    },
    searchInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 44,
      paddingVertical: 10,
      fontFamily: fonts.regular,
      fontSize: 16,
      color: colors.text,
    },
    clearSearch: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chips: { gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      paddingHorizontal: 15,
      minHeight: 44,
      justifyContent: 'center',
      backgroundColor: colors.surfaceSoft,
    },
    selectedChip: { backgroundColor: colors.primaryAction, borderColor: colors.primaryAction },
    chipText: { fontFamily: fonts.regular, fontSize: 12, color: colors.text },
    list: { gap: 12 },
    redemptionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      padding: 8,
      paddingRight: 12,
      borderRadius: 15,
      backgroundColor: colors.surface,
      boxShadow: '0 3px 12px rgba(22,65,39,0.06)',
    },
    redemptionPhoto: { width: 112, borderRadius: 12, overflow: 'hidden' },
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
