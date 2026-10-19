import { useCallback } from 'react';
import { Image, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { PortalLoading, portalStyles as s } from '@/components/portal/PortalUI';
import { usePortalData } from '@/hooks/usePortalData';
import {
  deliveryEstimate,
  deliveryQr,
  deliveryStatusNames,
  effectiveDeliveryStatus,
  type Delivery,
} from '@/models/Delivery';
import { getDeliveryPhotoUrl } from '@/services/delivery.service';

export function DeliverySummary({
  delivery,
  showQr = false,
}: Readonly<{ delivery: Delivery; showQr?: boolean }>) {
  const status = effectiveDeliveryStatus(delivery);
  const estimate = deliveryEstimate(delivery.items);
  return (
    <View style={s.stack}>
      <Text style={s.subtitle}>{deliveryStatusNames[status]}</Text>
      <Text style={s.body}>
        {delivery.companyName} · {delivery.pointName}
      </Text>
      <Text style={s.body}>{new Date(delivery.createdAt).toLocaleString('es-AR')}</Text>
      {showQr && status === 'PENDING_RECEPTION' && (
        <View style={{ gap: 16, alignItems: 'center', padding: 16, backgroundColor: '#fff' }}>
          <QRCode value={deliveryQr(delivery.code)} size={220} quietZone={16} ecl="M" />
          <Text selectable style={[s.body, { textAlign: 'center' }]}>
            {delivery.code}
          </Text>
          <Text style={s.hint}>
            Mostrá este QR al equipo del punto verde. Vence el{' '}
            {new Date(delivery.expiresAt).toLocaleString('es-AR')}.
          </Text>
        </View>
      )}
      {delivery.items.map((i) => (
        <View style={s.row} key={i.categoryId}>
          <Text style={s.body}>
            {i.categoryName}:{' '}
            {status === 'CONFIRMED'
              ? `${i.confirmedQuantity} recibidos · ${i.declaredQuantity} declarados`
              : `${i.declaredQuantity} declarados`}
          </Text>
          <Text style={s.hint}>{i.pointsSnapshot} puntos globales por unidad</Text>
        </View>
      ))}
      {status === 'CONFIRMED' ? (
        <View style={s.stack}>
          <Text style={s.subtitle}>+{delivery.points} puntos globales</Text>
          <Text style={s.body}>
            Recepción confirmada el {new Date(delivery.confirmedAt!).toLocaleString('es-AR')}. El
            código ya fue utilizado.
          </Text>
        </View>
      ) : status === 'PENDING_RECEPTION' ? (
        <Text style={s.body}>
          Estimado: {estimate.points} puntos globales. Se acreditan después de verificar la
          recepción física.
        </Text>
      ) : (
        <Text style={s.body}>
          Esta entrega no acredita puntos. Podés registrar una nueva entrega desde Mis RAEE.
        </Text>
      )}
      {!!delivery.notes && <Text style={s.body}>Notas: {delivery.notes}</Text>}
      {delivery.photoPath && <DeliveryPhoto path={delivery.photoPath} />}
    </View>
  );
}
function DeliveryPhoto({ path }: Readonly<{ path: string }>) {
  const loader = useCallback(() => getDeliveryPhotoUrl(path), [path]);
  const { data, loading, error, refresh } = usePortalData(loader);
  return (
    <View style={s.stack}>
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {data && (
        <Image
          source={{ uri: data }}
          accessibilityLabel="Foto adjunta de los dispositivos"
          style={{ width: '100%', height: 260 }}
          resizeMode="contain"
        />
      )}
    </View>
  );
}
