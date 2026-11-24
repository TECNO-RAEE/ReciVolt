import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  pickupTotalUnits,
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
  const [confirmingZero, setConfirmingZero] = useState(false);
  const hasFocused = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!hasFocused.current) {
        hasFocused.current = true;
        return;
      }
      void refresh();
    }, [refresh])
  );

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
  const adjustedItems = pickup.items.map((item) => ({
    ...item,
    confirmedQuantity: current[item.categoryId] ?? 0,
  }));
  const estimate = pickupEstimate(adjustedItems);
  const totalUnits = pickupTotalUnits(adjustedItems);
  const isZeroUnits = totalUnits === 0;

  function submitComplete() {
    void receive.run(async () => {
      await pickupCommand('complete', {
        id: pickup!.id,
        items: pickup!.items.map((item) => ({
          categoryId: item.categoryId,
          quantity: current[item.categoryId] ?? 0,
        })),
      });
      setConfirmingZero(false);
      setQuantities(null);
      await refresh();
    }, 'Recepción confirmada y puntos acreditados.');
  }

  return (
    <>
      <Text style={s.body}>
        Verificá lo recibido físicamente antes de confirmar. Ajustá las cantidades si difieren de lo
        declarado.
      </Text>
      <PickupCitizenCard pickup={pickup} />
      {pickup.status === 'COORDINATED' && (
        <PortalLink
          title="Reprogramar o cancelar retiro"
          onPress={() =>
            router.push({
              pathname: '/company/pickups/[id]/coordinate',
              params: { id: pickup.id },
            })
          }
        />
      )}
      <PickupMaterialCard
        pickup={pickup}
        quantities={current}
        onChangeQuantity={(categoryId, quantity) => {
          setConfirmingZero(false);
          setQuantities({ ...current, [categoryId]: quantity });
        }}
      />
      <PickupPointsEstimateCard points={estimate.points} />
      <PickupTariffNote />
      {isZeroUnits && (
        <View style={styles.zeroWarningBox}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          <Text style={styles.zeroWarningText}>
            El total recibido es 0 unidades. Si confirmás así, el retiro se cerrará como recibido y
            se acreditarán 0 puntos al ciudadano.
          </Text>
        </View>
      )}
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
      {isZeroUnits && confirmingZero ? (
        <View style={s.actions}>
          <ActionButton
            title="Confirmar recepción en 0 unidades"
            secondary
            loading={receive.busy}
            disabled={transit.busy}
            onPress={submitComplete}
          />
          <PortalLink
            title="Revisar cantidades"
            disabled={receive.busy}
            onPress={() => setConfirmingZero(false)}
          />
        </View>
      ) : (
        <ActionButton
          title="Confirmar recepción"
          loading={receive.busy}
          disabled={transit.busy}
          onPress={() => {
            if (isZeroUnits) {
              setConfirmingZero(true);
              return;
            }
            submitComplete();
          }}
        />
      )}
    </>
  );
}

export default function ReceivePickupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <CompanyPage title="Recepción del retiro" back="/company/pickups">
      {() => <ReceiveContent pickupId={id} />}
    </CompanyPage>
  );
}

const styles = StyleSheet.create({
  zeroWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerBackground,
  },
  zeroWarningText: {
    ...s.body,
    flex: 1,
    color: colors.danger,
  },
});
