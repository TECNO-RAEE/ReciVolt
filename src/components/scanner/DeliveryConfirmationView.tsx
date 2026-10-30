import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DeliveryPhotoPreview } from './DeliveryPhotoPreview';
import { ActionButton } from '@/components/ui/ActionButton';
import { CodePill, InfoCard } from '@/components/ui/InfoCard';
import { NumericStepper } from '@/components/ui/NumericStepper';
import {
  deliveryEstimate,
  deliveryStatusNames,
  deliveryTotalUnits,
  effectiveDeliveryStatus,
  type Delivery,
} from '@/models/Delivery';
import { getCategoryVisual } from '@/models/DeviceCategory';
import { colors, fonts } from '@/theme';

type DeliveryConfirmationViewProps = {
  readonly delivery: Delivery;
  readonly companyName: string;
  readonly quantities: Record<string, number>;
  readonly onQuantityChange: (categoryId: string, quantity: number) => void;
  readonly busy: boolean;
  readonly error?: string | null;
  readonly notice?: string | null;
  readonly onConfirmDelivery: () => void;
  readonly onRefresh: () => void;
  readonly onReset: () => void;
};

export function DeliveryConfirmationView({
  delivery,
  companyName,
  quantities,
  onQuantityChange,
  busy,
  error,
  notice,
  onConfirmDelivery,
  onRefresh,
  onReset,
}: DeliveryConfirmationViewProps) {
  const status = effectiveDeliveryStatus(delivery);
  const isPending = status === 'PENDING_RECEPTION';

  const totalAccreditedPoints = deliveryEstimate(delivery.items, quantities).points;
  const totalPhysicalUnits = deliveryTotalUnits(delivery.items, quantities);

  return (
    <>
      {/* Card: Organización y Punto */}
      <InfoCard
        icon={{ name: 'business', color: colors.primaryDark }}
        title={delivery.pointName}
        subtitle={delivery.companyName || companyName}
      />

      {/* Card: Datos del Ciudadano */}
      <InfoCard
        icon={{ name: 'person', color: colors.primary, backgroundColor: colors.surfaceSoft }}
        subtitleFirst
        subtitle="Ciudadano que entrega"
        title={delivery.citizenName}
        right={<CodePill code={delivery.code} />}
      />

      {/* Vistas según estado */}
      {isPending ? (
        <>
          {/* Tarjetas de residuos con Stepper para ajuste físico */}
          <View style={styles.fieldSection}>
            <Text style={styles.sectionHeader}>Materiales declarados</Text>
            <Text style={styles.sectionHint}>
              Ajustá la cantidad efectivamente recibida en el local.
            </Text>

            {delivery.items.map((item) => {
              const visual = getCategoryVisual({ name: item.categoryName });
              const currentQty =
                quantities[item.categoryId] ??
                (item.confirmedQuantity ?? item.declaredQuantity);

              return (
                <InfoCard
                  key={item.categoryId}
                  icon={{
                    name: visual.icon,
                    type: 'material',
                    color: colors.primaryDark,
                  }}
                  title={item.categoryName}
                  subtitle={`Declarado: ${item.declaredQuantity} u. · ${item.pointsSnapshot} pts c/u`}
                >
                  <View style={styles.cardDivider} />

                  <View style={styles.stepperSectionRow}>
                    <Text style={styles.stepperLabel}>Recibido físicamente:</Text>
                    <NumericStepper
                      value={currentQty}
                      min={0}
                      max={999}
                      onChange={(val) => onQuantityChange(item.categoryId, val)}
                      disabled={busy}
                      accessibilityLabel={`Cantidad recibida de ${item.categoryName}`}
                    />
                  </View>

                  <Text style={styles.itemSubtotalText}>
                    Subtotal: {(currentQty * item.pointsSnapshot).toLocaleString('es-AR')} pts
                  </Text>
                </InfoCard>
              );
            })}
          </View>

          {/* Tarjeta destacada: Puntos a acreditar */}
          <InfoCard
            variant="highlight"
            icon={{ name: 'sparkles', color: colors.primaryDark, backgroundColor: colors.surface }}
            title={`+${totalAccreditedPoints.toLocaleString('es-AR')} puntos a acreditar`}
            subtitle={`Se acreditarán en la cuenta de ${delivery.citizenName} al confirmar.`}
          />

          {/* Advertencia preventiva */}
          <View style={styles.warningAlertCard}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.primaryDark} />
            <Text style={styles.warningAlertText}>
              Confirmá solo lo que recibiste físicamente. Si no llegó alguna categoría, ajustá
              su valor en 0.
            </Text>
          </View>

          {/* Validación si todo quedó en 0 */}
          {totalPhysicalUnits === 0 && (
            <View style={styles.zeroUnitsAlertCard}>
              <Ionicons name="information-circle-outline" size={22} color={colors.danger} />
              <Text style={styles.zeroUnitsAlertText}>
                No se puede confirmar la recepción con 0 unidades. Si el ciudadano no entregó ningún
                dispositivo, utilizá &quot;Cancelar y volver&quot;.
              </Text>
            </View>
          )}

          {/* Foto adjunta opcional */}
          {delivery.photoPath ? <DeliveryPhotoPreview path={delivery.photoPath} /> : null}

          {/* Notas opcionales */}
          {delivery.notes ? (
            <View style={styles.notesCard}>
              <Text style={styles.notesLabel}>Notas del ciudadano:</Text>
              <Text style={styles.notesContent}>{delivery.notes}</Text>
            </View>
          ) : null}

          {/* Botones de acción */}
          <View style={styles.actionCol}>
            <ActionButton
              title="Confirmar recepción"
              loading={busy}
              disabled={busy || totalPhysicalUnits === 0}
              onPress={onConfirmDelivery}
            />
            <ActionButton
              title="Cancelar y volver"
              secondary
              disabled={busy}
              onPress={onReset}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Consultar de nuevo el estado original del código"
              style={styles.refreshLinkBtn}
              disabled={busy}
              onPress={onRefresh}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.refreshLinkText}>Consultar estado original del código</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          {/* Entrega ya confirmada, cancelada o vencida */}
          <InfoCard
            icon={{
              name:
                status === 'CONFIRMED'
                  ? 'checkmark-circle'
                  : status === 'CANCELLED'
                    ? 'close-circle'
                    : 'time',
              color: status === 'CONFIRMED' ? colors.primary : colors.danger,
              backgroundColor:
                status === 'CONFIRMED' ? colors.primarySoft : colors.dangerBackground,
            }}
            title={deliveryStatusNames[status]}
            subtitle={
              status === 'CONFIRMED'
                ? `Acreditados ${delivery.points.toLocaleString('es-AR')} puntos globales.`
                : status === 'CANCELLED'
                  ? 'Esta entrega fue cancelada por el usuario.'
                  : 'El código venció antes de ser recibido.'
            }
          />

          <View style={styles.actionCol}>
            <ActionButton title="Escanear otro código" onPress={onReset} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Consultar de nuevo el estado original del código"
              style={styles.refreshLinkBtn}
              disabled={busy}
              onPress={onRefresh}
            >
              <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.refreshLinkText}>Consultar estado original del código</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* Notificaciones y errores globales siempre visibles */}
      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  fieldSection: {
    gap: 10,
  },
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.text,
    marginLeft: 2,
  },
  sectionHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 2,
    marginBottom: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  stepperSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepperLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  itemSubtotalText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'right',
  },
  warningAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  warningAlertText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  zeroUnitsAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 14,
    padding: 14,
  },
  zeroUnitsAlertText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.danger,
  },
  notesCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  notesLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  notesContent: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  actionCol: {
    gap: 12,
    marginTop: 8,
  },
  refreshLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  refreshLinkText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  noticeText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.primaryDark,
    textAlign: 'center',
  },
});
