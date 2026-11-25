import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpringPressable } from '@/components/ui/SpringPressable';
import {
  distanceKm,
  formatDistance,
  openingStatus,
  type Coordinates,
  type GreenPoint,
} from '@/models/GreenPoint';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';

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
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const status = point ? openingStatus(point, now) : 'unknown';
  const isOpen = status === 'open';
  const distance = point && location ? formatDistance(distanceKm(location, point)) : null;
  return (
    <View style={styles.card}>
      <SpringPressable
        accessibilityRole="button"
        accessibilityLabel="Ver todos los puntos verdes en lista"
        onPress={onViewAll}
        pressScale={motion.scale.row}
        style={styles.summaryRow}
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
      </SpringPressable>
      {point && (
        <SpringPressable
          accessibilityRole="button"
          accessibilityLabel={`Ver detalle de ${point.name}`}
          onPress={onOpenPoint}
          pressScale={motion.scale.row}
          style={styles.preview}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[styles.iconTile, isOpen && styles.iconTileOpen]}
          >
            <Ionicons name={isOpen ? 'leaf' : 'location'} size={18} color={colors.primaryDark} />
          </View>
          <View style={styles.previewText}>
            <View style={styles.previewHeader}>
              <Text style={styles.name} numberOfLines={1}>
                {point.name}
              </Text>
              {distance ? (
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceText}>{distance}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.address} numberOfLines={1}>
              {point.address}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.statusPill, isOpen && styles.statusPillOpen]}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isOpen ? colors.primary : colors.textSecondary },
                  ]}
                />
                <Text style={[styles.statusText, isOpen && styles.statusTextOpen]}>
                  {isOpen ? 'Abierto ahora' : status === 'closed' ? 'Cerrado ahora' : 'Sin horario'}
                </Text>
              </View>
              {point.pickupEnabled ? (
                <View style={styles.pickupPill}>
                  <Ionicons name="car-outline" size={11} color={colors.info} />
                  <Text style={styles.pickupText}>Retiro</Text>
                </View>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </SpringPressable>
      )}
    </View>
  );
}
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      width: '100%',
      maxWidth: 960,
      alignSelf: 'center',
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      boxShadow: '0 7px 20px rgba(22,65,39,0.10)',
    },
    summaryRow: {
      minHeight: 48,
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
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconTile: {
      width: 40,
      height: 40,
      borderRadius: 11,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    iconTileOpen: {
      borderColor: colors.borderPrimary,
    },
    previewText: { flex: 1, minWidth: 0, gap: 4 },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    name: {
      flex: 1,
      minWidth: 0,
      fontFamily: fonts.bold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.text,
    },
    distanceBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      flexShrink: 0,
    },
    distanceText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      color: colors.primaryDark,
      fontVariant: ['tabular-nums'],
    },
    address: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusPillOpen: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.borderPrimary,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      color: colors.textSecondary,
    },
    statusTextOpen: {
      color: colors.primaryDark,
    },
    pickupPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.infoSoft,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickupText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      color: colors.info,
    },
  });
