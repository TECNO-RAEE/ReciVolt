import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { HomeBotanical, ImpactPlant, LeafMark } from '@/components/ui/EcoArtwork';
import { ActionButton } from '@/components/ui/ActionButton';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { PortalFeedback, PortalLink } from '@/components/portal/PortalUI';
import { InfoNote, PointsCard } from '@/components/rewards/RewardsUI';
import { PointsMap } from '@/components/discovery/PointsMap';
import { PointRow } from '@/components/discovery/PointRow';
import { DiscoveryState } from '@/components/discovery/DiscoveryState';
import { RecycleFinderModal } from '@/components/discovery/RecycleFinderModal';
import { filterGreenPoints, type GreenPoint } from '@/models/GreenPoint';
import { useAuth } from '@/providers/AuthProvider';
import { useWallet } from '@/providers/WalletProvider';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import {
  fonts,
  motion,
  useColors,
  useThemePreference,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';
import { brand } from '@/config/brand';
import { useScrollReset } from '@/hooks/useScrollReset';

export default function HomeScreen() {
  const colors = useColors();
  const { scheme, setPreference } = useThemePreference();
  const isDark = scheme === 'dark';
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const isInitialThemeMount = useRef(true);
  const themeIconScale = useSharedValue(1);
  const themeIconRotate = useSharedValue(0);

  useEffect(() => {
    if (isInitialThemeMount.current) {
      isInitialThemeMount.current = false;
      return;
    }
    if (reducedMotion) return;
    themeIconScale.value = 0.74;
    themeIconRotate.value = isDark ? -26 : 26;
    themeIconScale.value = withSpring(1, {
      ...motion.iconSpring,
      reduceMotion: ReduceMotion.System,
    });
    themeIconRotate.value = withSpring(0, {
      ...motion.iconSpring,
      reduceMotion: ReduceMotion.System,
    });
  }, [isDark, reducedMotion, themeIconScale, themeIconRotate]);

  const themeIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: themeIconScale.value }, { rotate: `${themeIconRotate.value}deg` }],
  }));
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
  const [finderOpen, setFinderOpen] = useState(false);
  const sorted = useMemo(() => filterGreenPoints(points, {}, location), [points, location]);
  const nearest = useMemo(() => sorted.slice(0, 1), [sorted]);
  const openPoint = useCallback(
    (point: GreenPoint) => router.push({ pathname: '/point/[id]', params: { id: point.id } }),
    []
  );
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
          <SpringPressable
            accessibilityRole="button"
            accessibilityState={{ selected: isDark }}
            aria-pressed={isDark}
            accessibilityLabel={
              isDark ? 'Modo oscuro. Cambiar a modo claro' : 'Modo claro. Cambiar a modo oscuro'
            }
            accessibilityHint="Cambia entre apariencia clara y oscura"
            onPress={() => setPreference(isDark ? 'light' : 'dark')}
            pressScale={motion.scale.icon}
            style={styles.themeToggle}
          >
            <Animated.View style={themeIconStyle}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.primaryDark} />
            </Animated.View>
          </SpringPressable>
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
          onPress={() => (wallet.error ? void refreshWallet() : router.push('/(app)/my-points'))}
        />
        <SpringPressable
          accessibilityRole="button"
          accessibilityLabel="¿Qué tenés para reciclar? Buscá puntos verdes cercanos"
          accessibilityHint="Abre el buscador de dispositivos para ver qué puntos verdes los reciben"
          onPress={() => setFinderOpen(true)}
          pressScale={motion.scale.card}
          style={styles.recycleSearch}
        >
          <View style={styles.recycleSearchIcon}>
            <Ionicons name="search-outline" size={20} color={colors.primaryDark} />
          </View>
          <View style={styles.recycleSearchCopy}>
            <Text style={styles.recycleSearchPlaceholder}>¿Qué tenés para reciclar?</Text>
            <Text style={styles.recycleSearchHint}>
              Elegí un dispositivo y mirá los puntos más cercanos
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primaryDark} />
        </SpringPressable>
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
            <PointsMap points={nearest} location={location} preview onSelect={openPoint} />
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
            {locationError && <PortalFeedback error={locationError} />}
          </View>
        )}
        <SpringPressable
          accessibilityRole="button"
          onPress={() => router.push('/impact')}
          pressScale={motion.scale.card}
          style={styles.impact}
        >
          <ImpactPlant />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.impactTitle}>Pequeñas acciones,{'\n'}grandes cambios</Text>
            <Text style={styles.impactHint}>Tus entregas ayudan a un futuro más verde.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.primaryDark} />
        </SpringPressable>
      </ScrollView>
      <RecycleFinderModal
        visible={finderOpen}
        onClose={() => setFinderOpen(false)}
        onSelectPoint={openPoint}
        onViewAllPoints={() => router.push('/green-points')}
      />
    </SafeAreaView>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    themeToggle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    intro: {
      flexDirection: 'row',
      minHeight: 106,
      paddingTop: 12,
      justifyContent: 'space-between',
    },
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
    recycleSearch: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 58,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderControl,
      boxShadow: '0 4px 16px rgba(22,65,39,0.05)',
    },
    recycleSearchIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recycleSearchCopy: { flex: 1, minWidth: 0, gap: 2 },
    recycleSearchPlaceholder: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      color: colors.text,
    },
    recycleSearchHint: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textSecondary,
    },
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
