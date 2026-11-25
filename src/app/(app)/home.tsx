import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { HomeBotanical, ImpactPlant, LeafMark } from '@/components/ui/EcoArtwork';
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
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
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
  const firstName = profile?.fullName.split(' ')[0] || 'visitante';

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
          <View style={styles.introText}>
            <Text style={styles.greeting}>¡Hola, {firstName}!</Text>
            <Text style={styles.description} numberOfLines={2}>
              Reciclá tus equipos en la red de puntos.
            </Text>
          </View>
          <View pointerEvents="none" style={styles.ecology}>
            <HomeBotanical size={86} />
          </View>
        </View>

        <View style={[styles.heroGrid, isWide && styles.heroGridWide]}>
          <SpringPressable
            accessibilityRole="button"
            accessibilityLabel="¿Qué tenés para reciclar? Buscá puntos verdes cercanos"
            accessibilityHint="Abre el buscador de dispositivos para ver qué puntos verdes los reciben"
            onPress={() => setFinderOpen(true)}
            pressScale={motion.scale.card}
            style={[styles.recycleSearch, isWide && styles.heroCell]}
          >
            <View style={styles.recycleSearchIcon}>
              <Ionicons name="search-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.recycleSearchCopy}>
              <Text style={styles.recycleSearchPlaceholder}>¿Qué tenés para reciclar?</Text>
              <Text style={styles.recycleSearchHint} numberOfLines={2}>
                Elegí un dispositivo y mirá los puntos cercanos
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.primaryDark} />
          </SpringPressable>

          <View style={isWide ? styles.heroCell : undefined}>
            <PointsCard
              compact
              guest={!session}
              points={wallet.data?.points ?? null}
              loading={!!session && wallet.loading}
              error={wallet.error}
              onPress={() =>
                wallet.error ? void refreshWallet() : router.push('/(app)/my-points')
              }
            />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {location ? 'Punto más cercano' : 'Puntos verdes'}
          </Text>
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
            {!location && (
              <SpringPressable
                accessibilityRole="button"
                accessibilityLabel="Encontrar cerca de mí"
                disabled={locating}
                onPress={() => void requestLocation()}
                pressScale={motion.scale.button}
                style={[styles.locationBar, locating && styles.locationBarDisabled]}
              >
                {locating ? (
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                ) : (
                  <Ionicons name="locate-outline" size={18} color={colors.primaryDark} />
                )}
                <Text style={styles.locationBarText}>
                  {locating ? 'Buscando tu ubicación…' : 'Encontrar cerca de mí'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
              </SpringPressable>
            )}
            {locationError && <PortalFeedback error={locationError} />}
            {sorted.length ? (
              <>
                <PointRow
                  point={sorted[0]}
                  location={location}
                  now={now}
                  variant="inset"
                  onPress={() => openPoint(sorted[0])}
                />
                <PointsMap
                  points={nearest}
                  location={location}
                  preview
                  previewHeight={isWide ? 200 : 148}
                  onSelect={openPoint}
                />
              </>
            ) : (
              <DiscoveryState
                loading={false}
                error={null}
                retry={refresh}
                empty="Todavía no hay puntos verdes publicados en la red."
              />
            )}
          </View>
        )}

        <SpringPressable
          accessibilityRole="button"
          onPress={() => router.push('/impact')}
          pressScale={motion.scale.card}
          style={styles.guideRow}
        >
          <View style={styles.guideIcon}>
            <ImpactPlant width={34} height={40} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={styles.guideTitle}>Preparar tus dispositivos</Text>
            <Text style={styles.guideHint}>
              Copia de seguridad, cierre de sesiones y accesorios antes de entregar.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
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
      maxWidth: 920,
      alignSelf: 'center',
      padding: 20,
      paddingTop: 14,
      gap: 14,
      paddingBottom: 28,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    wordmark: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    brand: { fontFamily: fonts.bold, color: colors.text, fontSize: 24, letterSpacing: -0.6 },
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
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    introText: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    ecology: {
      opacity: 0.85,
      flexShrink: 0,
      marginRight: -20,
    },
    greeting: {
      fontFamily: fonts.bold,
      fontSize: 24,
      lineHeight: 30,
      color: colors.text,
      letterSpacing: -0.5,
    },
    description: {
      fontFamily: fonts.regular,
      fontSize: 14,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    heroGrid: {
      gap: 12,
    },
    heroGridWide: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    heroCell: {
      flex: 1,
      minWidth: 0,
    },
    recycleSearch: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 62,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      boxShadow: '0 4px 16px rgba(22,65,39,0.05)',
    },
    recycleSearchIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    recycleSearchCopy: { flex: 1, minWidth: 0, gap: 2 },
    recycleSearchPlaceholder: {
      fontFamily: fonts.bold,
      fontSize: 16,
      lineHeight: 21,
      color: colors.text,
    },
    recycleSearchHint: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: -6,
    },
    sectionTitle: { fontFamily: fonts.bold, fontSize: 19, color: colors.text },
    mapCard: {
      backgroundColor: colors.surface,
      padding: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
      overflow: 'hidden',
      boxShadow: '0 5px 18px rgba(31,75,48,0.07)',
    },
    locationBar: {
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    locationBarDisabled: {
      opacity: 0.7,
    },
    locationBarText: {
      flex: 1,
      fontFamily: fonts.semiBold,
      fontSize: 14,
      color: colors.primaryDark,
    },
    guideRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      minHeight: 68,
    },
    guideIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    guideTitle: {
      fontFamily: fonts.semiBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.text,
    },
    guideHint: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
  });
