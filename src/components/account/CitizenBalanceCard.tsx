import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { PointsCard } from '@/components/rewards/RewardsUI';
import { useWallet } from '@/providers/WalletProvider';

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
    <PointsCard
      points={wallet.data?.points ?? null}
      loading={wallet.loading}
      error={wallet.error}
      label="Tus puntos"
      hint="Un solo saldo para canjear en toda la red."
      showPointsUnit
      onPress={press}
    />
  );
}
