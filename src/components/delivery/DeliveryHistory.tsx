import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { PortalLink, PortalLoading, portalStyles as s } from '@/components/portal/PortalUI';
import { usePortalData } from '@/hooks/usePortalData';
import { deliveryStatusNames, effectiveDeliveryStatus } from '@/models/Delivery';
import { getDeliveryHistory } from '@/services/delivery.service';

export function DeliveryHistory({ companyId = null }: Readonly<{ companyId?: string | null }>) {
  const [page, setPage] = useState(0);
  const loader = useCallback(() => getDeliveryHistory(companyId, page), [companyId, page]);
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
        <Text style={s.body}>
          {page === 0 ? 'Todavía no hay entregas registradas.' : 'No hay más entregas.'}
        </Text>
      )}
      {data?.map((d) => (
        <View style={s.row} key={d.id}>
          <Text style={s.subtitle}>{d.pointName}</Text>
          <Text style={s.body}>
            {companyId ? d.citizenName : d.companyName} ·{' '}
            {deliveryStatusNames[effectiveDeliveryStatus(d)]}
          </Text>
          <Text style={s.body}>{new Date(d.createdAt).toLocaleString('es-AR')}</Text>
          <Text style={s.hint}>
            {d.items
              .map((i) => `${i.categoryName} × ${i.confirmedQuantity ?? i.declaredQuantity}`)
              .join(' · ')}
          </Text>
          {d.status === 'CONFIRMED' && <Text style={s.body}>+{d.points} puntos globales</Text>}
          <PortalLink
            title={companyId ? 'Ver recepción' : 'Ver entrega / QR'}
            onPress={() =>
              companyId
                ? router.push({ pathname: '/company/scanner', params: { code: d.code } })
                : router.push({ pathname: '/delivery/[id]', params: { id: d.id } })
            }
          />
        </View>
      ))}
      <View style={s.actions}>
        {page > 0 && <PortalLink title="Anterior" onPress={() => setPage((p) => p - 1)} />}
        {data?.length === 30 && (
          <PortalLink title="Más entregas" onPress={() => setPage((p) => p + 1)} />
        )}
        <PortalLink title="Actualizar historial" onPress={() => void refresh()} />
      </View>
    </View>
  );
}
