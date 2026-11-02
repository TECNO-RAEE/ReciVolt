import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useWallet } from '@/providers/WalletProvider';
import { colors, fonts } from '@/theme';

export function CitizenBalanceCard({ onPress }: Readonly<{ onPress?: () => void }>) {
  const wallet = useWallet();
  const { refresh } = wallet;
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const press = wallet.error ? () => void refresh() : onPress;
  return (
    <Pressable
      accessibilityRole={press ? 'button' : undefined}
      accessibilityLabel="Saldo disponible"
      disabled={!press}
      onPress={press}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.coin}>
        <Ionicons name="flash" size={34} color={colors.textOnPrimary} />
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>Saldo disponible</Text>
        <Text style={styles.points}>
          {wallet.loading
            ? 'Cargando…'
            : wallet.error || wallet.data == null
              ? '—'
              : `${wallet.data.points.toLocaleString('es-AR')} ${wallet.data.points === 1 ? 'punto' : 'puntos'}`}
        </Text>
        <Text style={styles.hint}>
          {wallet.error
            ? 'No pudimos cargar tu saldo. Tocá para reintentar.'
            : 'Un solo saldo para canjear en toda la red.'}
        </Text>
      </View>
      {press && <Ionicons name="chevron-forward" size={20} color={colors.primaryDark} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 112,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
  },
  pressed: { opacity: 0.78 },
  coin: {
    width: 72,
    height: 72,
    flexShrink: 0,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: '#C7E4CC',
    backgroundColor: colors.primary,
  },
  content: { flex: 1, gap: 3 },
  label: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 20, color: colors.text },
  points: { fontFamily: fonts.bold, fontSize: 23, lineHeight: 30, color: colors.text },
  hint: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
});
