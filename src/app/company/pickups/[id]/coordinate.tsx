import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CompanyPage } from '@/components/portal/CompanyPage';
import {
  PortalFeedback,
  PortalField,
  PortalLink,
  PortalLoading,
  PortalSelect,
  usePortalStyles,
} from '@/components/portal/PortalUI';
import {
  PickupCitizenCard,
  PickupMaterialCard,
  PickupReadOnlySummary,
  usePickupCardStyle,
} from '@/components/pickup/PickupOps';
import { ActionButton } from '@/components/ui/ActionButton';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import { useColors, useThemedStyles, type ThemeColors } from '@/theme';
import {
  canEditPickupSchedule,
  canReceivePickup,
  formatPickupDate,
  pickupScheduleDays,
  pickupTimeSlots,
} from '@/models/Pickup';
import { pickupCommand } from '@/services/pickup.service';

function CoordinateContent({ pickupId }: Readonly<{ pickupId: string }>) {
  const colors = useColors();
  const s = usePortalStyles();
  const styles = useThemedStyles(makeStyles);
  const pickupCard = usePickupCardStyle();
  const loader = useCallback(() => pickupCommand('get', { id: pickupId }), [pickupId]);
  const { data: pickup, loading, error, refresh } = usePortalData(loader);
  const action = usePortalAction();
  const days = useMemo(() => pickupScheduleDays(new Date(), 14), []);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [editedDriver, setEditedDriver] = useState<string | null>(null);
  const [confirmingReject, setConfirmingReject] = useState(false);

  const scheduledDate = pickup?.scheduledDate;
  const date = selectedDate ?? scheduledDate ?? days[0].value;
  const scheduledSlot = pickup?.scheduledTimeSlot?.trim() || null;
  const slot = selectedSlot ?? scheduledSlot ?? pickupTimeSlots[0];
  const driver = editedDriver ?? pickup?.driverName ?? '';

  const dayOptions = useMemo(() => {
    const base = days.map((d) => ({ value: d.value, label: d.label }));
    if (scheduledDate && !base.some((d) => d.value === scheduledDate)) {
      base.unshift({
        value: scheduledDate,
        label: formatPickupDate(scheduledDate) ?? scheduledDate,
      });
    }
    return base;
  }, [days, scheduledDate]);

  const slotOptions = useMemo(() => {
    const base: { value: string; label: string }[] = pickupTimeSlots.map((t) => ({
      value: t,
      label: t,
    }));
    if (scheduledSlot && !base.some((o) => o.value === scheduledSlot)) {
      base.unshift({ value: scheduledSlot, label: scheduledSlot });
    }
    return base;
  }, [scheduledSlot]);

  async function reject() {
    await action.run(async () => {
      await pickupCommand('cancel', { id: pickup!.id });
      if (router.canGoBack()) router.back();
      else router.replace('/company/pickups');
    });
  }

  if (loading || error || !pickup) {
    return <PortalLoading loading={loading} error={error} retry={() => void refresh()} />;
  }

  if (!canEditPickupSchedule(pickup.status)) {
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

  const isRescheduling = pickup.status === 'COORDINATED';

  return (
    <>
      <Text style={s.body}>
        {isRescheduling
          ? 'Actualizá la fecha, el horario o el responsable del retiro. El ciudadano verá los cambios en su seguimiento.'
          : 'Confirmá la fecha y el responsable del retiro. El ciudadano verá la coordinación en su seguimiento.'}
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
          options={dayOptions}
          onChange={setSelectedDate}
          disabled={action.busy}
        />
        <PortalSelect
          label="Horario de retiro"
          value={slot}
          options={slotOptions}
          onChange={setSelectedSlot}
          disabled={action.busy}
        />
        <PortalField
          label="Responsable del retiro (opcional)"
          labelStyle={s.label}
          value={driver}
          onChangeText={setEditedDriver}
          placeholder="Nombre de quien retira"
          autoCapitalize="words"
          maxLength={120}
          editable={!action.busy}
        />
        <PortalFeedback error={action.error} notice={action.notice} />
        {!confirmingReject && (
          <ActionButton
            title={isRescheduling ? 'Guardar reprogramación' : 'Confirmar coordinación'}
            icon={<Ionicons name="checkmark" size={22} color={colors.textOnPrimary} />}
            loading={action.busy}
            onPress={() =>
              void action.run(
                async () => {
                  await pickupCommand('coordinate', {
                    id: pickup!.id,
                    scheduledDate: date,
                    scheduledTimeSlot: slot,
                    driverName: driver,
                  });
                  await refresh();
                },
                isRescheduling ? 'Reprogramación guardada.' : 'Coordinación confirmada.'
              )
            }
          />
        )}
        {confirmingReject ? (
          <View style={styles.dangerBox}>
            <View style={styles.dangerRow}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
              <Text style={[s.body, styles.dangerText]}>
                Si cancelás este retiro, la solicitud pasará a estado Cancelado y no podrá volver a
                coordinarse ni recibirse.
              </Text>
            </View>
            <View style={s.actions}>
              <ActionButton
                title="Confirmar cancelación"
                destructive
                loading={action.busy}
                onPress={() => void reject()}
              />
              <PortalLink title="Volver" onPress={() => setConfirmingReject(false)} />
            </View>
          </View>
        ) : (
          <ActionButton
            title={isRescheduling ? 'Cancelar retiro' : 'No podemos realizar este retiro'}
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
    <CompanyPage title="Coordinar retiro" back="/company/pickups">
      {() => <CoordinateContent pickupId={id} />}
    </CompanyPage>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    dangerBox: {
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.dangerBackground,
    },
    dangerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    dangerText: {
      flex: 1,
      color: colors.danger,
    },
  });
