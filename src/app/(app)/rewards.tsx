import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CitizenPage,
  InfoNote,
  RewardsBalance,
  rewardStyles as s,
} from '@/components/rewards/RewardsUI';
import { RewardCard, RewardsSkeleton } from '@/components/rewards/RewardCard';
import { PortalLink, PortalLoading } from '@/components/portal/PortalUI';
import { AccountRequired } from '@/components/auth/AccountRequired';
import { usePortalData } from '@/hooks/usePortalData';
import { rewardExamples } from '@/data/rewardExamples';
import { rewardCategories, type RewardCategory } from '@/models/Reward';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import { useAuth } from '@/providers/AuthProvider';
import { useWallet } from '@/providers/WalletProvider';
import { getRewards, getRedemptions } from '@/services/reward.service';
import { colors, fonts } from '@/theme';

export default function RewardsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState(params.tab === 'canjes' ? 'Mis canjes' : 'Disponibles');
  const [requestedTab, setRequestedTab] = useState(params.tab);
  if (params.tab !== requestedTab) {
    setRequestedTab(params.tab);
    if (params.tab === 'canjes') setTab('Mis canjes');
  }
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
  const filtered = source.filter(
    (r) =>
      (category === 'all' || r.category === category) &&
      `${r.title} ${r.businessName}`
        .toLocaleLowerCase('es-AR')
        .includes(search.trim().toLocaleLowerCase('es-AR'))
  );
  return (
    <CitizenPage
      title="Premios"
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={searching ? 'Cerrar búsqueda' : 'Buscar premios'}
          style={styles.searchButton}
          onPress={() => {
            setSearching(!searching);
            setSearch('');
          }}
        >
          <Ionicons name={searching ? 'close' : 'search-outline'} size={23} color={colors.text} />
        </Pressable>
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
      <View style={styles.tabs}>
        {['Disponibles', 'Mis canjes'].map((label) => (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === label }}
            onPress={() => setTab(label)}
            style={[styles.tab, tab === label && styles.activeTab]}
          >
            <Text style={[styles.tabText, tab === label && { color: colors.primaryDark }]}>
              {label}
            </Text>
          </Pressable>
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
            <TextInput
              autoFocus
              accessibilityLabel="Buscar por premio o comercio"
              value={search}
              onChangeText={setSearch}
              placeholder="Buscá un premio o comercio"
              placeholderTextColor={colors.textSecondary}
              style={styles.search}
            />
          )}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {(
              [['all', 'Todos'], ...Object.entries(rewardCategories)] as [
                RewardCategory | 'all',
                string,
              ][]
            ).map(([key, label]) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: category === key }}
                onPress={() => setCategory(key)}
                style={[styles.chip, category === key && styles.selectedChip]}
              >
                <Text style={[styles.chipText, category === key && { color: '#fff' }]}>
                  {label}
                </Text>
              </Pressable>
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
      {data?.map((r) => (
        <RewardCard
          key={r.id}
          reward={r.reward}
          status={r.status === 'RESERVED' ? 'Reservado · Ver código' : 'Entregado · Ver detalle'}
          onPress={() => router.push({ pathname: '/redemption/[id]', params: { id: r.id } })}
        />
      ))}
      <View style={s.row}>
        {page > 0 && <PortalLink title="Anterior" onPress={() => setPage(page - 1)} />}
        {data?.length === 30 && <PortalLink title="Más canjes" onPress={() => setPage(page + 1)} />}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  searchButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderColor: 'transparent',
  },
  activeTab: { borderColor: colors.primaryDark },
  tabText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.textSecondary },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 48,
    padding: 12,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  chips: { gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    paddingHorizontal: 15,
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: colors.surfaceSoft,
  },
  selectedChip: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  chipText: { fontFamily: fonts.regular, fontSize: 12, color: colors.text },
  list: { gap: 12 },
});
