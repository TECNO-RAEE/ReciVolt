import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { getCategoryVisual } from '@/models/DeviceCategory';
import {
  distanceKm,
  formatDistance,
  getAcceptedCategories,
  openingStatus,
  type Coordinates,
  type GreenPoint,
} from '@/models/GreenPoint';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';

const MAX_VISIBLE_CATEGORIES = 3;

export type PointRowVariant = 'card' | 'inset';

/**
 * Compact, iOS-aligned Green Point card displaying status, distance, pickup option,
 * and accepted device chips with clear hierarchy in both light and dark modes.
 */
export function PointRow({
  point,
  location,
  now,
  onPress,
  variant = 'card',
}: Readonly<{
  point: GreenPoint;
  location: Coordinates | null;
  now: Date;
  onPress: () => void;
  variant?: PointRowVariant;
}>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const status = openingStatus(point, now);
  const isOpen = status === 'open';
  const isInset = variant === 'inset';
  const distance = location ? formatDistance(distanceKm(location, point)) : null;
  const accepted = getAcceptedCategories(point);
  const visibleCategories = accepted.slice(0, MAX_VISIBLE_CATEGORIES);
  const overflowCount = accepted.length - visibleCategories.length;

  const trimmedName = point.name.trim();
  const trimmedCompany = point.companyName.trim();
  const showCompany =
    !point.demo &&
    trimmedCompany.length > 0 &&
    trimmedCompany.toLocaleLowerCase('es') !== trimmedName.toLocaleLowerCase('es');

  const statusLabel = isOpen
    ? 'Abierto ahora'
    : status === 'closed'
      ? 'Cerrado ahora'
      : 'Sin horario';

  return (
    <SpringPressable
      accessibilityRole="button"
      accessibilityLabel={`Ver ${point.name}${point.demo ? ', punto verde de ejemplo' : ''}`}
      onPress={onPress}
      pressScale={motion.scale.row}
      style={[styles.card, isInset && styles.cardInset]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.iconTile, isOpen && styles.iconTileOpen]}
      >
        <Ionicons name={isOpen ? 'leaf' : 'location'} size={20} color={colors.primaryDark} />
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={2}>
            {point.name}
          </Text>
          {distance ? (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{distance}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.locationBlock}>
          {showCompany ? (
            <Text style={styles.company} numberOfLines={1}>
              {trimmedCompany}
            </Text>
          ) : null}
          <Text style={styles.address} numberOfLines={2}>
            {point.address}
          </Text>
        </View>

        <View style={styles.badgesRow}>
          <View
            style={[
              styles.pill,
              isOpen ? styles.pillOpen : isInset ? styles.pillNeutralInset : styles.pillNeutralCard,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOpen ? colors.primary : colors.textSecondary },
              ]}
            />
            <Text style={[styles.pillText, isOpen ? styles.pillTextOpen : styles.pillTextMuted]}>
              {statusLabel}
            </Text>
          </View>

          {point.pickupEnabled ? (
            <View style={[styles.pill, styles.pillInfo]}>
              <Ionicons name="car-outline" size={12} color={colors.info} />
              <Text style={[styles.pillText, styles.pillTextInfo]}>Retiro</Text>
            </View>
          ) : null}

          {point.demo ? (
            <View style={[styles.pill, styles.pillWarning]}>
              <Text style={[styles.pillText, styles.pillTextWarning]}>Ejemplo</Text>
            </View>
          ) : !point.intakeConfirmed ? (
            <View style={[styles.pill, isInset ? styles.pillNeutralInset : styles.pillNeutralCard]}>
              <Text style={[styles.pillText, styles.pillTextMuted]}>Recepción por confirmar</Text>
            </View>
          ) : null}
        </View>

        {visibleCategories.length > 0 ? (
          <View style={styles.categoriesRow}>
            {visibleCategories.map((category) => {
              const visual = getCategoryVisual(category);
              return (
                <View
                  key={category.id}
                  style={[styles.categoryChip, isInset && styles.categoryChipInset]}
                >
                  <View accessibilityElementsHidden importantForAccessibility="no">
                    <MaterialCommunityIcons
                      name={visual.icon}
                      size={13}
                      color={colors.primaryDark}
                    />
                  </View>
                  <Text style={styles.categoryChipText} numberOfLines={1}>
                    {category.name}
                  </Text>
                </View>
              );
            })}
            {overflowCount > 0 ? (
              <View style={[styles.categoryChip, isInset && styles.categoryChipInset]}>
                <Text style={styles.categoryOverflowText}>+{overflowCount}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </SpringPressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: '0 3px 12px rgba(22,65,39,0.05)',
      minHeight: 76,
    },
    cardInset: {
      backgroundColor: colors.surfaceSoft,
      borderRadius: 15,
      boxShadow: 'none',
    },
    iconTile: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      marginTop: 2,
      flexShrink: 0,
    },
    iconTileOpen: {
      borderColor: colors.borderPrimary,
    },
    body: {
      flex: 1,
      minWidth: 0,
      gap: 6,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
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
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.borderPrimary,
      flexShrink: 0,
    },
    distanceText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      lineHeight: 16,
      color: colors.primaryDark,
      fontVariant: ['tabular-nums'],
    },
    locationBlock: {
      gap: 2,
    },
    company: {
      fontFamily: fonts.semiBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    address: {
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    badgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: 1,
    },
    pillOpen: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.borderPrimary,
    },
    pillNeutralCard: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    pillNeutralInset: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    pillInfo: {
      backgroundColor: colors.infoSoft,
      borderColor: colors.border,
    },
    pillWarning: {
      backgroundColor: colors.warningSoft,
      borderColor: colors.border,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    pillText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      lineHeight: 16,
    },
    pillTextOpen: {
      color: colors.primaryDark,
    },
    pillTextMuted: {
      color: colors.textSecondary,
    },
    pillTextInfo: {
      color: colors.info,
    },
    pillTextWarning: {
      color: colors.warning,
    },
    categoriesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: colors.surfaceSoft,
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: '100%',
    },
    categoryChipInset: {
      backgroundColor: colors.surface,
    },
    categoryChipText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      lineHeight: 16,
      color: colors.text,
      flexShrink: 1,
    },
    categoryOverflowText: {
      fontFamily: fonts.semiBold,
      fontSize: 12,
      lineHeight: 16,
      color: colors.primaryDark,
    },
  });
