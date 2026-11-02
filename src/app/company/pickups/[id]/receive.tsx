import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text } from 'react-native';
import { CompanyPage } from '@/components/portal/CompanyPage';
import {
  PortalFeedback,
  PortalLink,
  PortalLoading,
  portalStyles as s,
} from '@/components/portal/PortalUI';
import {
  PickupCitizenCard,
  PickupMaterialCard,
  PickupPointsEstimateCard,
  PickupReadOnlySummary,
  PickupTariffNote,
} from '@/components/pickup/PickupOps';
import { ActionButton } from '@/components/ui/ActionButton';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import { colors } from '@/theme';
import {
  canCoordinatePickup,
  canMarkPickupInTransit,
  canReceivePickup,
  pickupEstimate,
  type PickupItem,
} from '@/models/Pickup';
import { pickupCommand } from '@/services/pickup.service';

function initialQuantities(items: PickupItem[]): Record<string, number> {
  return Object.fromEntries(
    items.map((item) => [item.categoryId, item.confirmedQuantity ?? item.declaredQuantity])
  );
}

function ReceiveContent({ pickupId }: Readonly<{ pickupId: string }>) {
  const loader = useCallback(() => pickupCommand('get', { id: pickupId }), [pickupId]);
  const { data: pickup, loading, error, refresh } = usePortalData(loader);
  const transit = usePortalAction();
  const receive = usePortalAction();
  const [quantities, setQuantities] = useState<Record<string, number> | null>(null);

  if (loading || error || !pickup) {
    return <PortalLoading loading={loading} error={error} retry={() => void refresh()} />;
  }

  if (!canReceivePickup(pickup.status)) {
    return (
      <>
        <PortalFeedback error={receive.error} notice={receive.notice ?? transit.notice} />
        {canCoordinatePickup(pickup.status) && (
          <PortalLink
            title="Coordinar este retiro"
            onPress={() =>
              router.push({
                pathname: '/company/pickups/[id]/coordinate',
                params: { id: pickup.id },
              })
            }
          />
        )}
        <PickupReadOnlySummary pickup={pickup} />
      </>
    );
  }

  const current = quantities ?? initialQuantities(pickup.items);
  const estimate = pickupEstimate(
    pickup.items.map((item) => ({ ...item, confirmedQuantity: current[item.categoryId] ?? 0 }))
  );

  return (
    <>
      <Text style={s.body}>
        Verificá lo recibido físicamente antes de confirmar. Ajustá las cantidades si difieren de lo
        declarado.
      </Text>
      <PickupCitizenCard pickup={pickup} />
      <PickupMaterialCard
        pickup={pickup}
        quantities={current}
        onChangeQuantity={(categoryId, quantity) =>
          setQuantities({ ...current, [categoryId]: quantity })
        }
      />
      <PickupPointsEstimateCard points={estimate.points} />
      <PickupTariffNote />
      {canMarkPickupInTransit(pickup.status) && (
        <ActionButton
          title="Marcar en camino"
          secondary
          icon={<Ionicons name="navigate-outline" size={22} color={colors.primary} />}
          loading={transit.busy}
          disabled={receive.busy}
          onPress={() =>
            void transit.run(async () => {
              await pickupCommand('in_transit', { id: pickup.id });
              await refresh();
            }, 'El retiro está en camino.')
          }
        />
      )}
      <PortalFeedback
        error={transit.error ?? receive.error}
        notice={transit.notice ?? receive.notice}
      />
      <ActionButton
        title="Confirmar recepción"
        loading={receive.busy}
        disabled={transit.busy}
        onPress={() =>
          void receive.run(async () => {
            await pickupCommand('complete', {
              id: pickup.id,
              items: pickup.items.map((item) => ({
                categoryId: item.categoryId,
                quantity: current[item.categoryId] ?? 0,
              })),
            });
            setQuantities(null);
            await refresh();
          }, 'Recepción confirmada y puntos acreditados.')
        }
      />
    </>
  );
}

export default function ReceivePickupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <CompanyPage title="Recepción del retiro">{() => <ReceiveContent pickupId={id} />}</CompanyPage>
  );
}
