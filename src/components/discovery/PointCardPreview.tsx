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

/**
 * Tarjeta flotante sobre el mapa de Puntos verdes: resume cuántos puntos hay en el
 * resultado actual ("Ver todos" pasa a la vista de lista) y adelanta el punto seleccionado.
 */
export function PointCardPreview({
  count,
  demo,
  point,
  location,
  now,
  onViewAll,
  onOpenPoint,
}: Readonly<{
  count: number;
  demo: boolean;
  point: GreenPoint | null;
  location: Coordinates | null;
  now: Date;
  onViewAll: () => void;
  onOpenPoint: () => void;
}>) {
  const status = point ? openingStatus(point, now) : 'unknown';
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver todos los puntos verdes en lista"
        onPress={onViewAll}
        style={({ pressed }) => [styles.summaryRow, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.summary}>
          {count}{' '}
          {demo
            ? count === 1
              ? 'punto de ejemplo'
              : 'puntos de ejemplo'
            : count === 1
              ? 'punto verde'
              : 'puntos verdes'}
        </Text>
        <View style={styles.link}>
          <Text style={styles.linkText}>Ver todos</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </View>
      </Pressable>
      {point && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver detalle de ${point.name}`}
          onPress={onOpenPoint}
          style={({ pressed }) => [styles.preview, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.previewText}>
            <Text style={styles.name} numberOfLines={1}>
              {point.name}
            </Text>
            <Text style={styles.address} numberOfLines={1}>
              {point.address}
            </Text>
            <Text style={[styles.status, status === 'open' && { color: colors.primary }]}>
              {status === 'open'
                ? 'Abierto ahora'
                : status === 'closed'
                  ? 'Cerrado ahora'
                  : 'Horario sin informar'}
              {location ? ` · A ${formatDistance(distanceKm(location, point))}` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0 7px 20px rgba(22,65,39,0.10)',
  },
  summaryRow: {
    minHeight: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summary: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.primary },
  preview: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewText: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  address: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  status: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.textSecondary },
});
