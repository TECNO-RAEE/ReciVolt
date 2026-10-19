import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { AccountRequired } from '@/components/auth/AccountRequired';
import { ActionButton } from '@/components/ui/ActionButton';
import {
  PortalPage,
  PortalField,
  PortalLink,
  PortalLoading,
  PortalFeedback,
  portalStyles as s,
} from '@/components/portal/PortalUI';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import { deliveryQuantity } from '@/models/Delivery';
import { canRegisterDelivery, isExamplePointId, type GreenPoint } from '@/models/GreenPoint';
import { useAuth } from '@/providers/AuthProvider';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import {
  deliveryCommand,
  getDeliveryRates,
  pickDeliveryPhoto,
  removeDeliveryPhoto,
} from '@/services/delivery.service';

export default function NewDeliveryScreen() {
  const { session } = useAuth();
  const { pointId: initialPoint } = useLocalSearchParams<{ pointId?: string }>();
  const [pointId, setPointId] = useState(initialPoint ?? '');
  const { points, loading, error, refresh } = useDiscovery();
  const [search, setSearch] = useState('');
  const point = points.find((p) => p.id === pointId);
  const deliveryPoints = points.filter(canRegisterDelivery);
  if (isExamplePointId(pointId) || point?.demo)
    return (
      <PortalPage title="Registrar entrega" back="/green-points">
        <Text style={s.subtitle}>Punto verde de ejemplo</Text>
        <Text style={s.body}>
          Podés explorar este punto, pero no registrar entregas reales. Elegí un punto publicado
          para entregar tus dispositivos.
        </Text>
        <ActionButton title="Ver puntos verdes" onPress={() => router.replace('/green-points')} />
      </PortalPage>
    );
  if (!session) return <AccountRequired title="Registrá tu entrega" />;
  return (
    <PortalPage
      title="Registrar entrega"
      subtitle="Prepará los dispositivos y presentá el código en el punto verde."
      back="/my-raee"
    >
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {!loading &&
        !error &&
        (point ? (
          <DeliveryForm
            key={point.id}
            point={point}
            userId={session.user.id}
            changePoint={() => setPointId('')}
          />
        ) : (
          <>
            <Text style={s.subtitle}>Elegí el punto verde</Text>
            <PortalField
              label="Buscar por punto, dirección o empresa"
              value={search}
              onChangeText={setSearch}
            />
            {deliveryPoints
              .filter((p) =>
                `${p.name} ${p.address} ${p.companyName}`
                  .toLocaleLowerCase('es')
                  .includes(search.toLocaleLowerCase('es'))
              )
              .map((p) => (
                <View style={s.row} key={p.id}>
                  <Text style={s.subtitle}>{p.name}</Text>
                  <Text style={s.body}>
                    {p.companyName} · {p.address}
                  </Text>
                  <PortalLink title="Entregar en este punto" onPress={() => setPointId(p.id)} />
                </View>
              ))}
            {deliveryPoints.length === 0 && (
              <Text style={s.body}>
                Todavía no hay puntos publicados para registrar una entrega.
              </Text>
            )}
            {pointId && !point && (
              <Text style={s.body}>
                El punto seleccionado dejó de estar disponible. Elegí otro punto.
              </Text>
            )}
          </>
        ))}
    </PortalPage>
  );
}
function DeliveryForm({
  point,
  userId,
  changePoint,
}: Readonly<{ point: GreenPoint; userId: string; changePoint: () => void }>) {
  const loader = useCallback(() => getDeliveryRates(point.companyId), [point.companyId]);
  const { data: rates, loading, error, refresh } = usePortalData(loader);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<{ path: string; uri: string } | null>(null);
  const request = useRef<{ id: string; signature: string } | null>(null);
  const action = usePortalAction();
  const selected = point.categories.filter(
    (c) => (quantities[c.id] ?? '').trim() && quantities[c.id] !== '0'
  );
  const estimate = selected.reduce(
    (total, c) => {
      const qty = Number(quantities[c.id]);
      return {
        points: total.points + (Number.isInteger(qty) ? qty : 0) * (rates?.points[c.id] ?? 0),
      };
    },
    { points: 0 }
  );
  return (
    <View style={s.stack}>
      <Text style={s.subtitle}>{point.name}</Text>
      <Text style={s.body}>
        {point.companyName} · {point.address}
      </Text>
      <PortalLink title="Cambiar punto" disabled={action.busy} onPress={changePoint} />
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {rates && (
        <>
          <Text style={s.subtitle}>¿Qué vas a entregar?</Text>
          <Text style={s.hint}>
            Dejá en blanco lo que no entregás. Cantidades enteras de 1 a 999.
          </Text>
          {point.categories.map((c) => (
            <View style={s.row} key={c.id}>
              <PortalField
                label={c.name}
                placeholder="Cantidad"
                value={quantities[c.id] ?? ''}
                keyboardType="number-pad"
                maxLength={3}
                editable={!action.busy}
                onChangeText={(v) => setQuantities((q) => ({ ...q, [c.id]: v }))}
              />
              <Text style={s.hint}>{rates.points[c.id] ?? 0} puntos globales por unidad</Text>
            </View>
          ))}
          <PortalField
            label="Notas (opcional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={2000}
            editable={!action.busy}
          />
          {photo ? (
            <View style={s.stack}>
              <Image
                source={{ uri: photo.uri }}
                accessibilityLabel="Foto seleccionada"
                style={{ height: 220, width: '100%' }}
                resizeMode="contain"
              />
              <PortalLink
                title="Quitar foto"
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await removeDeliveryPhoto(photo.path);
                    setPhoto(null);
                  }, 'Foto retirada.')
                }
              />
            </View>
          ) : (
            <PortalLink
              title="Adjuntar foto (opcional, JPG/PNG hasta 5 MB)"
              disabled={action.busy}
              onPress={() =>
                void action.run(async () => {
                  const chosen = await pickDeliveryPhoto(userId);
                  if (chosen) setPhoto(chosen);
                }, '')
              }
            />
          )}
          <Text style={s.body}>
            Estimado: {estimate.points} puntos globales. El equipo verificará las cantidades antes
            de acreditar.
          </Text>
          <ActionButton
            title="Confirmar y generar QR"
            loading={action.busy}
            disabled={point.categories.length === 0 || loading || !!error}
            onPress={() =>
              void action.run(async () => {
                if (selected.length === 0) throw new Error('Seleccioná al menos un dispositivo.');
                const payload = {
                  pointId: point.id,
                  notes,
                  photoPath: photo?.path ?? null,
                  items: selected.map((c) => ({
                    categoryId: c.id,
                    quantity: deliveryQuantity(quantities[c.id]),
                  })),
                };
                const signature = JSON.stringify(payload);
                if (!request.current || request.current.signature !== signature)
                  request.current = { id: Crypto.randomUUID(), signature };
                const delivery = await deliveryCommand('create', {
                  ...payload,
                  requestId: request.current.id,
                });
                router.replace({ pathname: '/delivery/[id]', params: { id: delivery.id } });
              }, 'Entrega registrada.')
            }
          />
        </>
      )}
      <PortalFeedback error={action.error} notice={action.notice} />
    </View>
  );
}
