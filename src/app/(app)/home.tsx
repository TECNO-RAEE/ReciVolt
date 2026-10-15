import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QuickAccess } from '@/components/home/QuickAccess';
import { HomeBotanical, ImpactPlant, LeafMark } from '@/components/ui/EcoArtwork';
import { ActionButton } from '@/components/ui/ActionButton';
import { PortalLink } from '@/components/portal/PortalUI';
import { InfoNote, PointsCard } from '@/components/rewards/RewardsUI';
import { PointsMap } from '@/components/discovery/PointsMap';
import { PointRow } from '@/components/discovery/PointRow';
import { DiscoveryState } from '@/components/discovery/DiscoveryState';
import { filterGreenPoints, type GreenPoint } from '@/models/GreenPoint';
import { useAuth } from '@/providers/AuthProvider';
import { useWallet } from '@/providers/WalletProvider';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import { colors, fonts } from '@/theme';
import { brand } from '@/config/brand';
import { useScrollReset } from '@/hooks/useScrollReset';

export default function HomeScreen() {
  const scroll = useScrollReset();
  const { profile, session } = useAuth();
  const wallet = useWallet();
  const { refresh: refreshWallet } = wallet;
  useFocusEffect(
    useCallback(() => {
      void refreshWallet();
    }, [refreshWallet])
  );
  const {
    points,
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
  const sorted = useMemo(() => filterGreenPoints(points, {}, location), [points, location]);
  const openPoint = useCallback(
    (point: GreenPoint) => router.push({ pathname: '/point/[id]', params: { id: point.id } }),
    []
  );
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.wordmark}>
            <LeafMark />
            <Text style={styles.brand}>
              {brand.wordmarkPrefix}
              <Text style={{ color: colors.primaryDark }}>{brand.wordmarkSuffix}</Text>
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil"
            onPress={() => router.push('/profile')}
            style={styles.avatar}
          >
            <Ionicons name="person" size={20} color={colors.primaryDark} />
          </Pressable>
        </View>
        <View style={styles.intro}>
          <View style={{ flex: 1, zIndex: 1 }}>
            <Text style={styles.greeting}>
              ¡Hola, {profile?.fullName.split(' ')[0] || 'visitante'}!
            </Text>
            <Text style={styles.description}>
              Gracias por ser parte de un{'\n'}mundo más limpio y responsable.
            </Text>
          </View>
          <View pointerEvents="none" style={styles.ecology}>
            <HomeBotanical />
          </View>
        </View>
        <PointsCard
          guest={!session}
          points={wallet.data?.points ?? null}
          loading={!!session && wallet.loading}
          error={wallet.error}
          onPress={() => (wallet.error ? void refreshWallet() : router.push('/my-points'))}
        />
        <View style={styles.quickGrid}>
          <QuickAccess
            title="Entregas"
            icon={<MaterialCommunityIcons name="recycle" size={27} color={colors.primaryDark} />}
            onPress={() => router.push('/my-raee')}
          />
          <QuickAccess
            title="Mis puntos"
            icon={<Ionicons name="bar-chart" size={25} color={colors.primaryDark} />}
            onPress={() => router.push('/my-points')}
          />
          <QuickAccess
            title="Premios"
            icon={<Ionicons name="gift-outline" size={26} color={colors.primaryDark} />}
            onPress={() => router.push('/rewards')}
          />
          <QuickAccess
            title="Impacto"
            icon={<Ionicons name="leaf" size={26} color={colors.primaryDark} />}
            onPress={() => router.push('/impact')}
          />
        </View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Puntos verdes</Text>
          <PortalLink title="Ver todos ›" onPress={() => router.push('/green-points')} />
        </View>
        {loading || error ? (
          <DiscoveryState loading={loading} error={error} retry={refresh} />
        ) : (
          <View style={styles.mapCard}>
            {sorted.some((p) => p.demo) && (
              <InfoNote>
                Explorá un punto verde de ejemplo. Las entregas estarán disponibles cuando haya
                puntos reales publicados.
              </InfoNote>
            )}
            <PointsMap points={sorted} location={location} preview onSelect={openPoint} />
            {sorted.length ? (
              <PointRow
                point={sorted[0]}
                location={location}
                now={now}
                onPress={() => openPoint(sorted[0])}
              />
            ) : (
              <DiscoveryState
                loading={false}
                error={null}
                retry={refresh}
                empty="Todavía no hay puntos verdes publicados en la red."
              />
            )}
            {!location && (
              <ActionButton
                title="Encontrar cerca de mí"
                secondary
                loading={locating}
                onPress={() => void requestLocation()}
              />
            )}
            {locationError && (
              <Text accessibilityRole="alert" style={styles.description}>
                {locationError}
              </Text>
            )}
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/impact')}
          style={styles.impact}
        >
          <ImpactPlant />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.impactTitle}>Pequeñas acciones,{'\n'}grandes cambios</Text>
            <Text style={styles.impactHint}>
              Tus entregas de RAEE ayudan{'\n'}a un futuro más verde.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.primaryDark} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: 20,
    gap: 16,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brand: { fontFamily: fonts.bold, color: colors.text, fontSize: 25, letterSpacing: -0.7 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCEBE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  intro: { flexDirection: 'row', minHeight: 106, paddingTop: 12, justifyContent: 'space-between' },
  ecology: { position: 'absolute', right: -20, bottom: -24, opacity: 0.8 },
  greeting: { fontFamily: fonts.bold, fontSize: 27, color: colors.text, letterSpacing: -0.6 },
  description: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSecondary,
    marginTop: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: -10,
  },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  quickGrid: { flexDirection: 'row', gap: 10 },
  mapCard: {
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 18,
    gap: 10,
    overflow: 'hidden',
    boxShadow: '0 5px 18px rgba(31,75,48,0.07)',
  },
  impact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    padding: 16,
  },
  impactTitle: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 20, color: colors.text },
  impactHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
});
