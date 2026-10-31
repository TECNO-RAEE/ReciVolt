import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { pointsLabel, type Reward } from '@/models/Reward';
import { colors, fonts } from '@/theme';
import { PointsBadge, RewardPhoto } from './RewardsUI';

export function RewardCard({
  reward,
  onPress,
  status,
}: Readonly<{ reward: Reward; onPress: () => void; status?: string }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${reward.title}, ${reward.businessName}, ${status ?? pointsLabel(reward.pointsCost)}. Ver detalle`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
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
          <PointsBadge points={reward.pointsCost} />
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.text} />
    </Pressable>
  );
}
export function RewardsSkeleton() {
  return (
    <View accessibilityLabel="Cargando premios" style={{ gap: 12 }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.card, { gap: 14 }]}>
          <View style={[styles.photo, { height: 104, backgroundColor: colors.primarySoft }]} />
          <View style={{ flex: 1, gap: 10 }}>
            <View style={{ height: 16, width: '80%', backgroundColor: colors.border }} />
            <View style={{ height: 14, width: '55%', backgroundColor: colors.border }} />
            <View
              style={{ height: 22, width: 70, borderRadius: 10, backgroundColor: colors.border }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 8,
    paddingRight: 12,
    borderRadius: 15,
    backgroundColor: colors.surface,
    boxShadow: '0 3px 12px rgba(22,65,39,0.06)',
  },
  photo: { width: 112, borderRadius: 12, overflow: 'hidden' },
  stockBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    padding: 4,
    backgroundColor: colors.surface,
    borderRadius: 6,
  },
  stockText: { color: colors.textSecondary, fontFamily: fonts.semiBold, fontSize: 12 },
  body: { flex: 1, gap: 6 },
  title: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.text },
  status: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.primaryDark },
  business: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
});
