import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors, useThemedStyles, type ThemeColors } from '@/theme';

type IconName =
  'person-outline' | 'location-outline' | 'notifications-outline' | 'settings-outline';

type ProfileMenuItemProps = {
  title: string;
  subtitle: string;
  icon: IconName;
  onPress?: () => void;
};

export function ProfileMenuItem({
  title,
  subtitle,
  icon,
  onPress,
}: Readonly<ProfileMenuItemProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={30} color={colors.text} />

      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>

        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={22} color={colors.text} />
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    minHeight: 63,
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 12,

    backgroundColor: colors.background,

    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
  },

  textContainer: {
    flex: 1,
    marginLeft: 14,
  },

  title: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '500',
    color: colors.text,
  },

  subtitle: {
    marginTop: 2,

    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '400',
    color: colors.text,
  },

  pressed: {
    opacity: 0.65,
  },
});
