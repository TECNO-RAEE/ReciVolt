import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { CompanyPage } from '@/components/portal/CompanyPage';
import {
  PortalFeedback,
  PortalField,
  PortalLink,
  PortalLoading,
  PortalSelect,
  portalStyles as s,
} from '@/components/portal/PortalUI';
import {
  PickupCitizenCard,
  PickupMaterialCard,
  PickupReadOnlySummary,
  pickupCard,
} from '@/components/pickup/PickupOps';
import { ActionButton } from '@/components/ui/ActionButton';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import { colors } from '@/theme';
import {
  canCoordinatePickup,
  canReceivePickup,
  pickupScheduleDays,
  pickupTimeSlots,
} from '@/models/Pickup';
import { pickupCommand } from '@/services/pickup.service';

function CoordinateContent({ pickupId }: Readonly<{ pickupId: string }>) {
  const loader = useCallback(() => pickupCommand('get', { id: pickupId }), [pickupId]);
  const { data: pickup, loading, error, refresh } = usePortalData(loader);
  const action = usePortalAction();
  const days = useMemo(() => pickupScheduleDays(new Date(), 14), []);
  const [date, setDate] = useState<string>(days[0].value);
  const [slot, setSlot] = useState<string>(pickupTimeSlots[0]);
  const [driver, setDriver] = useState('');
  const [confirmingReject, setConfirmingReject] = useState(false);

  async function reject() {
    await action.run(async () => {
      await pickupCommand('cancel', { id: pickup!.id });
      router.back();
    });
  }

  if (loading || error || !pickup) {
    return <PortalLoading loading={loading} error={error} retry={() => void refresh()} />;
  }

  if (!canCoordinatePickup(pickup.status)) {
    return (
      <>
        <PortalFeedback error={action.error} notice={action.notice} />
        {canReceivePickup(pickup.status) && (
          <PortalLink
            title="Ir a recepción del retiro"
            onPress={() =>
              router.push({ pathname: '/company/pickups/[id]/receive', params: { id: pickup.id } })
            }
          />
        )}
        <PickupReadOnlySummary pickup={pickup} />
      </>
    );
  }

  return (
    <>
      <Text style={s.body}>
        Confirmá la fecha y el responsable del retiro. El ciudadano verá la coordinación en su
        seguimiento.
      </Text>
      <PickupCitizenCard pickup={pickup} />
      <PickupMaterialCard pickup={pickup} />
      <View style={pickupCard}>
        <Text accessibilityRole="header" style={s.heading}>
          Coordinación
        </Text>
        <PortalSelect
          label="Fecha de retiro"
          value={date}
          options={days.map((d) => ({ value: d.value, label: d.label }))}
          onChange={setDate}
          disabled={action.busy}
        />
        <PortalSelect
          label="Horario de retiro"
          value={slot}
          options={pickupTimeSlots.map((t) => ({ value: t, label: t }))}
          onChange={setSlot}
          disabled={action.busy}
        />
        <PortalField
          label="Responsable del retiro"
          labelStyle={s.label}
          value={driver}
          onChangeText={setDriver}
          placeholder="Nombre de quien retira"
          autoCapitalize="words"
          maxLength={120}
          editable={!action.busy}
        />
        <PortalFeedback error={action.error} notice={action.notice} />
        <ActionButton
          title="Confirmar coordinación"
          icon={<Ionicons name="checkmark" size={22} color={colors.textOnPrimary} />}
          loading={action.busy}
          onPress={() =>
            void action.run(async () => {
              await pickupCommand('coordinate', {
                id: pickup!.id,
                scheduledDate: date,
                scheduledTimeSlot: slot,
                driverName: driver,
              });
              await refresh();
            }, 'Coordinación confirmada.')
          }
        />
        {confirmingReject ? (
          <View style={s.actions}>
            <ActionButton
              title="Confirmar cancelación"
              loading={action.busy}
              onPress={() => void reject()}
            />
            <PortalLink title="Volver" onPress={() => setConfirmingReject(false)} />
          </View>
        ) : (
          <ActionButton
            title="No podemos realizar este retiro"
            secondary
            disabled={action.busy}
            onPress={() => setConfirmingReject(true)}
          />
        )}
      </View>
    </>
  );
}

export default function CoordinatePickupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <CompanyPage title="Coordinar retiro">{() => <CoordinateContent pickupId={id} />}</CompanyPage>
  );
}
