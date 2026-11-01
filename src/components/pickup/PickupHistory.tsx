import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { PortalLink, PortalLoading, portalStyles as s } from '@/components/portal/PortalUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { usePortalData } from '@/hooks/usePortalData';
import { formatPickupDate, pickupStatusNames } from '@/models/Pickup';
import { getPickupHistory } from '@/services/pickup.service';

export function PickupHistory({ companyId = null }: Readonly<{ companyId?: string | null }>) {
  const [page, setPage] = useState(0);
  const loader = useCallback(() => getPickupHistory(companyId, page), [companyId, page]);
  const { data, loading, error, refresh } = usePortalData(loader);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return (
    <View style={s.stack}>
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />

      {!loading && data?.length === 0 && (
        <View style={s.stack}>
          <Text style={s.body}>
            {page === 0
              ? 'Todavía no solicitaste retiros a domicilio.'
              : 'No hay más retiros.'}
          </Text>
          {page === 0 && !companyId && (
            <ActionButton
              title="Solicitar un retiro"
              onPress={() => router.push('/pickup/new')}
            />
          )}
        </View>
      )}

      {data?.map((p) => (
        <View style={s.row} key={p.id}>
          <Text style={s.subtitle}>{p.companyName}</Text>
          <Text style={s.body}>
            {p.addressStreet}, {p.addressLocality} · {pickupStatusNames[p.status]}
          </Text>
          <Text style={s.body}>Pedido: {formatPickupDate(p.createdAt)}</Text>
          {p.scheduledDate && (
            <Text style={s.body}>
              Fecha acordada: {formatPickupDate(p.scheduledDate)}
              {p.scheduledTimeSlot ? ` (${p.scheduledTimeSlot})` : ''}
            </Text>
          )}
          <Text style={s.hint}>
            {p.items
              .map((i) => `${i.categoryName} × ${i.confirmedQuantity ?? i.declaredQuantity}`)
              .join(' · ')}
          </Text>
          {p.status === 'COMPLETED' && p.points > 0 && (
            <Text style={s.body}>+{p.points} puntos globales</Text>
          )}
          <PortalLink
            title="Ver seguimiento del retiro"
            onPress={() => router.push({ pathname: '/pickup/[id]', params: { id: p.id } })}
          />
        </View>
      ))}

      <View style={s.actions}>
        {page > 0 && <PortalLink title="Anterior" onPress={() => setPage((p) => p - 1)} />}
        {data?.length === 30 && (
          <PortalLink title="Más retiros" onPress={() => setPage((p) => p + 1)} />
        )}
        <PortalLink title="Actualizar historial" onPress={() => void refresh()} />
      </View>
    </View>
  );
}
