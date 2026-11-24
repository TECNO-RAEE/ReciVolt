import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AccountRequired } from '@/components/auth/AccountRequired';
import { DeliveryBalance } from '@/components/delivery/DeliveryBalance';
import { DeliveryHistory } from '@/components/delivery/DeliveryHistory';
import { PickupHistory } from '@/components/pickup/PickupHistory';
import { PortalNav } from '@/components/portal/PortalUI';
import { CitizenPage, rewardStyles as s } from '@/components/rewards/RewardsUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { useAuth } from '@/providers/AuthProvider';
import { colors } from '@/theme';

const tabs = ['Todos', 'Entregas', 'Retiros'] as const;
type Tab = (typeof tabs)[number];

export default function MyRaeeScreen() {
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>('Todos');
  if (!session) return <AccountRequired title="Entregas" back="/profile" />;

  return (
    <CitizenPage title="Entregas" back="/profile">
      <DeliveryBalance />
      <View style={styles.actions}>
        {(tab === 'Todos' || tab === 'Entregas') && (
          <ActionButton title="Registrar entrega" onPress={() => router.push('/new-delivery')} />
        )}
        {(tab === 'Todos' || tab === 'Retiros') && (
          <ActionButton
            title="Solicitar retiro a domicilio"
            secondary={tab === 'Todos'}
            onPress={() => router.push('/pickup/new')}
          />
        )}
      </View>
      <PortalNav items={tabs} selected={tab} onSelect={(item) => setTab(item as Tab)} />
      {tab === 'Todos' && (
        <>
          <View style={styles.section}>
            <Text accessibilityRole="header" style={s.subtitle}>
              Entregas presenciales
            </Text>
            <DeliveryHistory />
          </View>
          <View style={[styles.section, styles.sectionDivider]}>
            <Text accessibilityRole="header" style={s.subtitle}>
              Retiros a domicilio
            </Text>
            <PickupHistory />
          </View>
        </>
      )}
      {tab === 'Entregas' && <DeliveryHistory />}
      {tab === 'Retiros' && <PickupHistory />}
    </CitizenPage>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 10 },
  section: { gap: 12 },
  sectionDivider: { paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
});
