import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, fonts } from '@/theme';

export type InfoCardIcon = {
  name: string;
  type?: 'ionicons' | 'material';
  color?: string;
  backgroundColor?: string;
};

export type InfoCardProps = {
  readonly title: React.ReactNode;
  readonly subtitle?: React.ReactNode;
  readonly subtitleFirst?: boolean;
  readonly icon?: InfoCardIcon | React.ReactNode;
  readonly right?: React.ReactNode;
  readonly children?: React.ReactNode;
  readonly variant?: 'default' | 'soft' | 'highlight' | 'warning';
  readonly style?: StyleProp<ViewStyle>;
};

export function InfoCard({
  title,
  subtitle,
  subtitleFirst = false,
  icon,
  right,
  children,
  variant = 'default',
  style,
}: InfoCardProps) {
  const variantStyle = variantStyles[variant];

  return (
    <View style={[styles.card, variantStyle.card, style]}>
      {(icon != null || title != null || subtitle != null || right != null) && (
        <View style={styles.headerRow}>
          {renderIcon(icon, variantStyle.iconBg, variantStyle.iconColor)}

          <View style={styles.textCol}>
            {subtitleFirst ? (
              <>
                {subtitle && <Text style={[styles.subtitle, variantStyle.subtitle]}>{subtitle}</Text>}
                {typeof title === 'string' ? (
                  <Text style={[styles.title, variantStyle.title]}>{title}</Text>
                ) : (
                  title
                )}
              </>
            ) : (
              <>
                {typeof title === 'string' ? (
                  <Text style={[styles.title, variantStyle.title]}>{title}</Text>
                ) : (
                  title
                )}
                {subtitle && <Text style={[styles.subtitle, variantStyle.subtitle]}>{subtitle}</Text>}
              </>
            )}
          </View>

          {right}
        </View>
      )}

      {children}
    </View>
  );
}

export function CodePill({ code }: Readonly<{ code: string }>) {
  return (
    <View style={styles.codePill}>
      <Text style={styles.codePillText}>{code}</Text>
    </View>
  );
}

function renderIcon(
  icon: InfoCardIcon | React.ReactNode,
  fallbackBg: string,
  fallbackColor: string
) {
  if (!icon) return null;

  if (React.isValidElement(icon)) {
    return icon;
  }

  const iconConfig = icon as InfoCardIcon;
  const bg = iconConfig.backgroundColor ?? fallbackBg;
  const color = iconConfig.color ?? fallbackColor;

  return (
    <View style={[styles.iconCircle, { backgroundColor: bg }]}>
      {iconConfig.type === 'material' ? (
        <MaterialCommunityIcons
          name={iconConfig.name as keyof typeof MaterialCommunityIcons.glyphMap}
          size={22}
          color={color}
        />
      ) : (
        <Ionicons
          name={iconConfig.name as keyof typeof Ionicons.glyphMap}
          size={22}
          color={color}
        />
      )}
    </View>
  );
}

const variantStyles = {
  default: {
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    iconBg: colors.primarySoft,
    iconColor: colors.primaryDark,
    title: { color: colors.text },
    subtitle: { color: colors.textSecondary },
  },
  soft: {
    card: {
      backgroundColor: colors.surfaceSoft,
      borderColor: colors.border,
    },
    iconBg: colors.surface,
    iconColor: colors.textSecondary,
    title: { color: colors.text },
    subtitle: { color: colors.textSecondary },
  },
  highlight: {
    card: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.border,
    },
    iconBg: colors.surface,
    iconColor: colors.primaryDark,
    title: { color: colors.primaryDark },
    subtitle: { color: colors.textSecondary },
  },
  warning: {
    card: {
      backgroundColor: colors.surfaceSoft,
      borderColor: colors.border,
    },
    iconBg: colors.surface,
    iconColor: colors.primaryDark,
    title: { color: colors.text },
    subtitle: { color: colors.textSecondary },
  },
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  codePill: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codePillText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.text,
    letterSpacing: 0.5,
  },
});
