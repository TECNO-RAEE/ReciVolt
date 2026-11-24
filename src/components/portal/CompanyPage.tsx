import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import type { CompanyPortalData } from '@/models/Portal';
import { useCompanyPortal } from '@/providers/CompanyPortalProvider';
import {
  PortalFeedback,
  PortalLink,
  PortalLoading,
  PortalPage,
  usePortalStyles,
} from './PortalUI';

// Inner company screen: shared header, load/error states and the owner-only guard.
export function CompanyPage({
  title,
  back = '/company',
  ownerOnly = false,
  action,
  children,
}: Readonly<{
  title: string;
  back?: Href;
  ownerOnly?: boolean;
  action?: ReactNode;
  children: (data: CompanyPortalData) => ReactNode;
}>) {
  const s = usePortalStyles();
  const portal = useCompanyPortal();
  const { data, loading, error, refresh, owner } = portal;
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const refreshing =
    ('refreshing' in portal && typeof portal.refreshing === 'boolean'
      ? portal.refreshing
      : false) || pullRefreshing;
  const handleRefresh = () => {
    if (refreshing) return;
    setPullRefreshing(true);
    void refresh().finally(() => setPullRefreshing(false));
  };
  return (
    <PortalPage
      title={title}
      back={back}
      action={action}
      refreshing={refreshing}
      onRefresh={handleRefresh}
    >
      {!data && <PortalLoading loading={loading} error={error} retry={() => void refresh()} />}
      {data && error && (
        <View style={{ gap: 8 }}>
          <PortalFeedback error={error} />
          <PortalLink title="Reintentar" onPress={() => void refresh()} />
        </View>
      )}
      {data && ownerOnly && !owner && (
        <View style={s.stack}>
          <Text style={s.body}>
            Esta sección corresponde al responsable de la organización. Tu acceso permite recibir
            entregas, gestionar retiros a domicilio y validar premios.
          </Text>
          <ActionButton title="Volver a Mi empresa" onPress={() => router.replace('/company')} />
        </View>
      )}
      {data && (!ownerOnly || owner) && (
        <View key={data.company.id} style={s.stack}>
          {children(data)}
        </View>
      )}
    </PortalPage>
  );
}
