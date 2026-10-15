import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  distanceKm,
  formatDistance,
  openingStatus,
  type Coordinates,
  type GreenPoint,
} from '@/models/GreenPoint';
import { colors, fonts } from '@/theme';
export function PointRow({
  point,
  location,
  now,
  onPress,
}: Readonly<{ point: GreenPoint; location: Coordinates | null; now: Date; onPress: () => void }>) {
  const status = openingStatus(point, now);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver ${point.name}${point.demo ? ', punto verde de ejemplo' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.65 }]}
    >
      <View style={styles.content}>
        {point.demo && <Text style={styles.text}>Punto verde de ejemplo</Text>}
        <View style={styles.heading}>
          <Text style={styles.name}>{point.name}</Text>
          {location && (
            <Text style={styles.distance}>{formatDistance(distanceKm(location, point))}</Text>
          )}
        </View>
        {!point.demo && <Text style={styles.text}>{point.companyName}</Text>}
        <Text style={styles.address}>{point.address}</Text>
        <Text style={[styles.text, status === 'open' && { color: colors.primary }]}>
          {point.demo ? 'Horario de ejemplo · ' : ''}
          {status === 'open'
            ? 'Abierto ahora'
            : status === 'closed'
              ? 'Cerrado ahora'
              : 'Horario sin informar'}
          {point.pickupEnabled ? ' · Ofrece retiros' : ''}
        </Text>
        <Text style={styles.address} numberOfLines={2}>
          {point.categories.length
            ? point.categories.map((c) => c.name).join(' · ')
            : 'Categorías sin informar'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.primary} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  content: { flex: 1, gap: 6 },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  name: { fontFamily: fonts.semiBold, fontSize: 18, color: colors.text, flexShrink: 1 },
  distance: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary },
  text: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  address: { fontFamily: fonts.regular, fontSize: 14, color: colors.brandDark, lineHeight: 20 },
});
