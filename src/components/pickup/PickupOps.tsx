import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { portalStyles as s } from '@/components/portal/PortalUI';
import { InfoNote } from '@/components/rewards/RewardsUI';
import { InfoCard, CodePill } from '@/components/ui/InfoCard';
import { NumericStepper } from '@/components/ui/NumericStepper';
import type { Pickup, PickupItem, PickupStatus } from '@/models/Pickup';
import { getPickupTimeline, pickupStatusNames } from '@/models/Pickup';
import { colors, fonts } from '@/theme';
import { PickupTimeline } from './PickupTimeline';

export const pickupCard = {
  gap: 12,
  padding: 16,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  backgroundColor: colors.surface,
} as const;

const badgePalette: Record<PickupStatus, { backgroundColor: string; color: string }> = {
  REQUESTED: { backgroundColor: colors.surfaceSoft, color: colors.text },
  COORDINATED: { backgroundColor: colors.primarySoft, color: colors.primaryDark },
  IN_TRANSIT: { backgroundColor: colors.primarySoft, color: colors.primaryDark },
  COMPLETED: { backgroundColor: colors.primary, color: colors.textOnPrimary },
  CANCELLED: { backgroundColor: colors.dangerBackground, color: colors.danger },
};

export function PickupStatusBadge({ status }: Readonly<{ status: PickupStatus }>) {
  const palette = badgePalette[status];
  return (
    <View
      accessibilityLabel={`Estado: ${pickupStatusNames[status]}`}
      style={[styles.badge, { backgroundColor: palette.backgroundColor }]}
    >
      <Text style={[styles.badgeText, { color: palette.color }]}>{pickupStatusNames[status]}</Text>
    </View>
  );
}

// Citizen, contact and pickup address. Shared by the coordination and reception screens.
export function PickupCitizenCard({ pickup }: Readonly<{ pickup: Pickup }>) {
  return (
    <InfoCard
      icon={{ name: 'person-outline' }}
      title={pickup.citizenName}
      subtitle={
        pickup.citizenPhone ? `Teléfono: ${pickup.citizenPhone}` : 'Sin teléfono de contacto'
      }
      right={<CodePill code={pickup.code} />}
    >
      <View style={{ gap: 4 }}>
        <View style={styles.dataRow}>
          <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
          <Text style={s.body}>
            {pickup.addressStreet}, {pickup.addressLocality}
          </Text>
        </View>
        {!!pickup.addressReference && (
          <Text style={s.hint}>Referencia: {pickup.addressReference}</Text>
        )}
        {!!pickup.notes && <Text style={s.hint}>Notas del ciudadano: {pickup.notes}</Text>}
      </View>
    </InfoCard>
  );
}

// Material declared for the pickup. Editable mode drives the reception steppers.
export function PickupMaterialCard({
  pickup,
  quantities,
  onChangeQuantity,
}: Readonly<{
  pickup: Pickup;
  quantities?: Record<string, number>;
  onChangeQuantity?: (categoryId: string, quantity: number) => void;
}>) {
  const editable = quantities != null && onChangeQuantity != null;
  return (
    <View style={pickupCard}>
      <Text accessibilityRole="header" style={s.heading}>
        Material a retirar
      </Text>
      {pickup.items.map((item: PickupItem) => (
        <View key={item.categoryId} style={styles.materialRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.body}>{item.categoryName}</Text>
            <Text style={s.hint}>
              Declarado: {item.declaredQuantity}
              {item.pointsSnapshot > 0 ? ` · ${item.pointsSnapshot} puntos por unidad` : ''}
            </Text>
          </View>
          {editable ? (
            <NumericStepper
              value={quantities[item.categoryId] ?? item.declaredQuantity}
              min={0}
              max={999}
              onChange={(value) => onChangeQuantity(item.categoryId, value)}
              accessibilityLabel={`Cantidad recibida de ${item.categoryName}`}
            />
          ) : (
            <Text style={styles.quantity}>×{item.confirmedQuantity ?? item.declaredQuantity}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

export function PickupPointsEstimateCard({ points }: Readonly<{ points: number }>) {
  return (
    <InfoCard
      variant="highlight"
      icon={{ name: 'leaf-outline' }}
      title={`${points} puntos a acreditar`}
      subtitle="Se suman al saldo global del ciudadano al confirmar la recepción."
    />
  );
}

// Read-only closing view for pickups that no longer accept operations.
export function PickupReadOnlySummary({ pickup }: Readonly<{ pickup: Pickup }>) {
  return (
    <>
      <View style={styles.statusRow}>
        <PickupStatusBadge status={pickup.status} />
      </View>
      <PickupCitizenCard pickup={pickup} />
      <PickupMaterialCard pickup={pickup} />
      {pickup.status === 'COMPLETED' && pickup.points > 0 && (
        <InfoCard
          variant="highlight"
          icon={{ name: 'leaf-outline' }}
          title={`${pickup.points} puntos acreditados`}
          subtitle="El saldo ya está disponible para el ciudadano en toda la red."
        />
      )}
      <PickupTimeline steps={getPickupTimeline(pickup)} />
    </>
  );
}

export function PickupTariffNote() {
  return (
    <InfoNote>
      Los puntos se calculan con la tarifa vigente de tu empresa al momento de la solicitud.
    </InfoNote>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 16,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  quantity: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
