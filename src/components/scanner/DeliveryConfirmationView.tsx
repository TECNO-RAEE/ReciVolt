import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { DeliveryPhotoPreview } from './DeliveryPhotoPreview';
import { ActionButton } from '@/components/ui/ActionButton';
import { NumericStepper } from '@/components/ui/NumericStepper';
import {
  deliveryStatusNames,
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
  readonly totalAccreditedPoints: number;
  readonly busy: boolean;
  readonly error?: string | null;
  readonly onConfirmDelivery: () => void;
  readonly onReset: () => void;
};

export function DeliveryConfirmationView({
  delivery,
  companyName,
  quantities,
  onQuantityChange,
  totalAccreditedPoints,
  busy,
  error,
  onConfirmDelivery,
  onReset,
}: DeliveryConfirmationViewProps) {
  const status = effectiveDeliveryStatus(delivery);
  const isPending = status === 'PENDING_RECEPTION';

  return (
    <>
      {/* Card: Organización y Punto */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="business" size={22} color={colors.primaryDark} />
          </View>
          <View style={styles.cardTextCol}>
            <Text style={styles.cardTitle}>{delivery.pointName}</Text>
            <Text style={styles.cardSubtitle}>{delivery.companyName || companyName}</Text>
          </View>
        </View>
      </View>

      {/* Card: Datos del Ciudadano */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, { backgroundColor: colors.surfaceSoft }]}>
            <Ionicons name="person" size={22} color={colors.primary} />
          </View>
          <View style={styles.cardTextCol}>
            <Text style={styles.cardSubtitle}>Ciudadano que entrega</Text>
            <Text style={styles.cardTitle}>{delivery.citizenName}</Text>
          </View>
          <View style={styles.codePill}>
            <Text style={styles.codePillText}>{delivery.code}</Text>
          </View>
        </View>
      </View>

      {/* Vistas según estado */}
      {isPending ? (
        <>
          {/* Tarjetas de residuos con Stepper para ajuste físico */}
          <View style={styles.fieldSection}>
            <Text style={styles.sectionHeader}>Materiales declarados</Text>
            <Text style={styles.sectionHint}>
              Ajustá la cantidad efectivamente recibida en el local.
            </Text>

            {delivery.items.map((item, index) => {
              const visual = getCategoryVisual({ name: item.categoryName });
              const currentQty =
                quantities[item.categoryId] ??
                (item.confirmedQuantity ?? item.declaredQuantity);

              return (
                <View key={`${item.categoryId}-${index}`} style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons
                        name={visual.icon}
                        size={22}
                        color={colors.primaryDark}
                      />
                    </View>
                    <View style={styles.cardTextCol}>
                      <Text style={styles.cardTitle}>{item.categoryName}</Text>
                      <Text style={styles.cardSubtitle}>
                        Declarado: {item.declaredQuantity} u. · {item.pointsSnapshot} pts c/u
                      </Text>
                    </View>
                  </View>

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
                </View>
              );
            })}
          </View>

          {/* Tarjeta destacada: Puntos a acreditar */}
          <View style={styles.pointsAccreditedCard}>
            <View style={styles.cardRow}>
              <View style={styles.pointsIconCircle}>
                <Ionicons name="sparkles" size={24} color={colors.primaryDark} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.pointsAccreditedValue}>
                  +{totalAccreditedPoints.toLocaleString('es-AR')} puntos a acreditar
                </Text>
                <Text style={styles.pointsAccreditedHint}>
                  Se acreditarán en la cuenta de {delivery.citizenName} al confirmar.
                </Text>
              </View>
            </View>
          </View>

          {/* Advertencia preventiva */}
          <View style={styles.warningAlertCard}>
            <Ionicons name="alert-circle-outline" size={22} color={colors.primaryDark} />
            <Text style={styles.warningAlertText}>
              Confirmá solo lo que recibiste físicamente. Si no llegó alguna categoría, ajustá
              su valor en 0.
            </Text>
          </View>

          {/* Foto adjunta opcional */}
          {delivery.photoPath ? <DeliveryPhotoPreview path={delivery.photoPath} /> : null}

          {/* Notas opcionales */}
          {delivery.notes ? (
            <View style={styles.card}>
              <Text style={styles.notesLabel}>Notas del ciudadano:</Text>
              <Text style={styles.notesContent}>{delivery.notes}</Text>
            </View>
          ) : null}

          {error ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {error}
            </Text>
          ) : null}

          {/* Botones de acción */}
          <View style={styles.actionCol}>
            <ActionButton
              title="Confirmar recepción"
              loading={busy}
              onPress={onConfirmDelivery}
            />
            <ActionButton
              title="Cancelar y volver"
              secondary
              disabled={busy}
              onPress={onReset}
            />
          </View>
        </>
      ) : (
        <>
          {/* Entrega ya confirmada, cancelada o vencida */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor:
                      status === 'CONFIRMED'
                        ? colors.primarySoft
                        : colors.dangerBackground,
                  },
                ]}
              >
                <Ionicons
                  name={
                    status === 'CONFIRMED'
                      ? 'checkmark-circle'
                      : status === 'CANCELLED'
                        ? 'close-circle'
                        : 'time'
                  }
                  size={24}
                  color={status === 'CONFIRMED' ? colors.primary : colors.danger}
                />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>{deliveryStatusNames[status]}</Text>
                <Text style={styles.cardSubtitle}>
                  {status === 'CONFIRMED'
                    ? `Acreditados ${delivery.points.toLocaleString('es-AR')} puntos globales.`
                    : status === 'CANCELLED'
                      ? 'Esta entrega fue cancelada por el usuario.'
                      : 'El código venció antes de ser recibido.'}
                </Text>
              </View>
            </View>
          </View>

          <ActionButton title="Escanear otro código" onPress={onReset} />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  cardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  codePill: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codePillText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.text,
    letterSpacing: 0.5,
  },
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
  pointsAccreditedCard: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  pointsIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsAccreditedValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.primaryDark,
  },
  pointsAccreditedHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
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
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
});
