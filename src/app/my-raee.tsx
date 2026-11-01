import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AccountRequired } from '@/components/auth/AccountRequired';
import { ActionButton } from '@/components/ui/ActionButton';
import { DeliveryBalance } from '@/components/delivery/DeliveryBalance';
import { DeliveryHistory } from '@/components/delivery/DeliveryHistory';
import { PickupHistory } from '@/components/pickup/PickupHistory';
import { PortalNav } from '@/components/portal/PortalUI';
import { CitizenPage } from '@/components/rewards/RewardsUI';
import { useAuth } from '@/providers/AuthProvider';

export default function MyRaeeScreen() {
  const { session } = useAuth();
  const [tab, setTab] = useState('Todos');
  if (!session) return <AccountRequired title="Entregas" back="/profile" />;

  return (
    <CitizenPage title="Entregas" back="/profile">
      <DeliveryBalance />
      <View style={{ gap: 10 }}>
        {tab === 'Retiros' ? (
          <ActionButton title="Solicitar retiro a domicilio" onPress={() => router.push('/pickup/new')} />
        ) : (
          <ActionButton title="Registrar entrega" onPress={() => router.push('/new-delivery')} />
        )}
      </View>
      <PortalNav items={['Todos', 'Entregas', 'Retiros']} selected={tab} onSelect={setTab} />
      {tab === 'Retiros' ? (
        <PickupHistory />
      ) : (
        <DeliveryHistory />
      )}
    </CitizenPage>
  );
}
