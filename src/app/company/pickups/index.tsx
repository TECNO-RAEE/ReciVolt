import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { CompanyPage } from '@/components/portal/CompanyPage';
import {
  PortalLink,
  PortalLoading,
  PortalNav,
  portalStyles as s,
} from '@/components/portal/PortalUI';
import { PickupStatusBadge } from '@/components/pickup/PickupOps';
import { InfoCard } from '@/components/ui/InfoCard';
import { usePortalData } from '@/hooks/usePortalData';
import {
  canReceivePickup,
  formatPickupDate,
  isPickupActive,
  pickupMaterialSummary,
  type PickupStatus,
} from '@/models/Pickup';
import { getPickupHistory, getPickupStatusCounts } from '@/services/pickup.service';
import type { CompanyPortalData } from '@/models/Portal';

const tabs = [
  { key: 'REQUESTED', label: 'Solicitados' },
  { key: 'COORDINATED', label: 'Coordinados' },
  { key: 'IN_TRANSIT', label: 'En camino' },
  { key: 'COMPLETED', label: 'Recibidos' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

function PickupInbox({ companyId }: Readonly<{ companyId: string }>) {
  const [tab, setTab] = useState<TabKey>('REQUESTED');
  const [page, setPage] = useState(0);
  const loader = useCallback(() => getPickupHistory(companyId, page, tab), [companyId, page, tab]);
  const { data, loading, error, refresh } = usePortalData(loader);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );
  const counts = usePortalData(useCallback(() => getPickupStatusCounts(companyId), [companyId]));
  const activeCount = counts.data
    ? Object.entries(counts.data).reduce(
        (total, [status, count]) => total + (isPickupActive(status as PickupStatus) ? count : 0),
        0
      )
    : null;

  function openPickup(id: string, status: PickupStatus) {
    if (canReceivePickup(status) || status === 'COMPLETED' || status === 'CANCELLED') {
      router.push({ pathname: '/company/pickups/[id]/receive', params: { id } });
    } else {
      router.push({ pathname: '/company/pickups/[id]/coordinate', params: { id } });
    }
  }

  return (
    <View style={s.stack}>
      <PortalNav
        items={tabs.map((t) => t.label)}
        selected={tabs.find((t) => t.key === tab)!.label}
        onSelect={(label) => {
          setTab(tabs.find((t) => t.label === label)!.key);
          setPage(0);
        }}
      />
      {activeCount != null && (
        <Text style={s.hint}>
          {activeCount > 0
            ? `${activeCount} solicitudes activas en total.`
            : 'No hay solicitudes activas.'}
        </Text>
      )}
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {!loading && data?.length === 0 && <Text style={s.body}>No hay retiros en este estado.</Text>}
      {data?.map((pickup) => (
        <InfoCard
          key={pickup.id}
          icon={{ name: 'archive-outline' }}
          title={pickupMaterialSummary(pickup.items) || 'Retiro a domicilio'}
          subtitle={`${pickup.citizenName} · ${pickup.addressLocality}`}
          right={<PickupStatusBadge status={pickup.status} />}
        >
          <View style={{ gap: 4 }}>
            <Text style={s.hint}>
              {pickup.addressStreet} · Pedido: {formatPickupDate(pickup.createdAt)}
            </Text>
            {pickup.scheduledDate && (
              <Text style={s.hint}>
                Acordado: {formatPickupDate(pickup.scheduledDate)}
                {pickup.scheduledTimeSlot ? ` (${pickup.scheduledTimeSlot})` : ''}
                {pickup.driverName ? ` · ${pickup.driverName}` : ''}
              </Text>
            )}
            <PortalLink
              title="Ver solicitud"
              onPress={() => openPickup(pickup.id, pickup.status)}
            />
          </View>
        </InfoCard>
      ))}
      <View style={s.actions}>
        {page > 0 && <PortalLink title="Anterior" onPress={() => setPage((p) => p - 1)} />}
        {data?.length === 30 && (
          <PortalLink title="Más retiros" onPress={() => setPage((p) => p + 1)} />
        )}
      </View>
    </View>
  );
}

export default function CompanyPickupsScreen() {
  return (
    <CompanyPage title="Retiros">
      {(data: CompanyPortalData) => (
        <>
          <Text style={s.body}>Coordiná y confirmá los retiros a domicilio.</Text>
          <PickupInbox companyId={data.company.id} />
        </>
      )}
    </CompanyPage>
  );
}
