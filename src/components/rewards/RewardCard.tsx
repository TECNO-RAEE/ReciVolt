import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { pointsLabel, type Reward } from '@/models/Reward';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';
import { PointsBadge, RewardPhoto } from './RewardsUI';

export function RewardCard({
  reward,
  onPress,
  status,
  userPoints,
  style,
}: Readonly<{
  reward: Reward;
  onPress: () => void;
  status?: string;
  userPoints?: number | null;
  style?: StyleProp<ViewStyle>;
}>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const canRedeemHint =
    !status && typeof userPoints === 'number' && !reward.demo && reward.stock !== 0;
  const redeemable = canRedeemHint && userPoints >= reward.pointsCost;
  const missingPoints = canRedeemHint && !redeemable ? reward.pointsCost - userPoints : 0;
  const lowStock = reward.stock !== null && reward.stock > 0 && reward.stock <= 5;

  return (
    <SpringPressable
      accessibilityRole="button"
      accessibilityLabel={`${reward.title}, ${reward.businessName}, ${status ?? pointsLabel(reward.pointsCost)}. Ver detalle`}
      onPress={onPress}
      pressScale={motion.scale.card}
      style={[styles.card, style]}
    >
      <View style={styles.photo}>
        <RewardPhoto reward={reward} height={104} />
        {reward.stock === 0 && (
          <View style={styles.stockBadge}>
            <Text style={styles.stockText}>Agotado</Text>
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {reward.title}
        </Text>
        <Text style={styles.business} numberOfLines={1}>
          {reward.businessName}
        </Text>
        {status ? (
          <Text style={styles.status}>{status}</Text>
        ) : (
          <View style={styles.metaRow}>
            <PointsBadge points={reward.pointsCost} />
            {redeemable ? (
              <View style={styles.redeemablePill}>
                <Ionicons name="checkmark-circle" size={12} color={colors.primaryDark} />
                <Text style={styles.redeemableText}>Disponible</Text>
              </View>
            ) : canRedeemHint ? (
              <Text style={styles.missingText}>Faltan {missingPoints.toLocaleString('es-AR')}</Text>
            ) : null}
            {lowStock ? (
              <View style={styles.lowStockPill}>
                <Text style={styles.lowStockText}>
                  {reward.stock === 1 ? 'Último' : `Quedan ${reward.stock}`}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </SpringPressable>
  );
}
export function RewardsSkeleton() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      cancelAnimation(pulse);
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withTiming(0.55, {
        duration: motion.duration.skeletonPulse,
        easing: Easing.inOut(Easing.ease),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [reducedMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
  }));

  return (
    <Animated.View accessibilityLabel="Cargando premios" style={[{ gap: 12 }, pulseStyle]}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.card, { gap: 14 }]}>
          <View style={[styles.photo, { height: 104, backgroundColor: colors.primarySoft }]} />
          <View style={{ flex: 1, gap: 10 }}>
            <View style={{ height: 16, width: '80%', backgroundColor: colors.skeletonHighlight }} />
            <View style={{ height: 14, width: '55%', backgroundColor: colors.skeletonHighlight }} />
            <View
              style={{
                height: 22,
                width: 70,
                borderRadius: 10,
                backgroundColor: colors.skeletonHighlight,
              }}
            />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
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
    photo: { width: 104, borderRadius: 12, overflow: 'hidden', flexShrink: 0 },
    stockBadge: {
      position: 'absolute',
      left: 6,
      top: 6,
      paddingHorizontal: 6,
      paddingVertical: 3,
      backgroundColor: colors.surface,
      borderRadius: 6,
    },
    stockText: { color: colors.textSecondary, fontFamily: fonts.semiBold, fontSize: 11 },
    body: { flex: 1, minWidth: 0, gap: 5 },
    title: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.text },
    status: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primaryDark },
    business: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    redeemablePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
    },
    redeemableText: {
      fontFamily: fonts.semiBold,
      fontSize: 11,
      color: colors.primaryDark,
    },
    missingText: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    lowStockPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.warningSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    lowStockText: {
      fontFamily: fonts.semiBold,
      fontSize: 11,
      color: colors.warning,
    },
  });
