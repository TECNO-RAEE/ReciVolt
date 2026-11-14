import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useColors, useThemedStyles, type ThemeColors } from '@/theme';

type ProfileImpactCardProps = {
  recycledCount: number;
  recoveredWeight: string;
};

export function ProfileImpactCard({
  recycledCount,
  recoveredWeight,
}: Readonly<ProfileImpactCardProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Mi impacto</Text>

      <View style={styles.content}>
        <View style={styles.stat}>
          <Ionicons name="phone-portrait-outline" size={42} color={colors.primary} />

          <View>
            <Text style={styles.count}>{recycledCount}</Text>

            <Text style={styles.label}>RAEE reciclados</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.stat}>
          <MaterialCommunityIcons name="sprout" size={48} color={colors.primary} />

          <View>
            <Text style={styles.weight}>{recoveredWeight}</Text>

            <Text style={styles.label}>recuperados</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    height: 144,
    marginTop: 25,
    paddingHorizontal: 15,
    paddingTop: 4,
    backgroundColor: colors.impactBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },

  title: {
    marginLeft: 40,
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },

  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  count: {
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: '600',
    color: colors.impactValue,
  },

  weight: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '600',
    color: colors.impactWeight,
  },

  label: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  separator: {
    width: 1,
    height: 71,
    marginHorizontal: 10,
    backgroundColor: colors.text,
  },
});
