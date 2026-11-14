import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles, type ThemeColors } from '@/theme';

type PlaceholderScreenProps = {
  title: string;
};

export function PlaceholderScreen({ title }: Readonly<PlaceholderScreenProps>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  title: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '600',
    color: colors.primary,
  },
});
