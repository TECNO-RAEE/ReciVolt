import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { NumericStepper } from '@/components/ui/NumericStepper';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import { useScrollReset } from '@/hooks/useScrollReset';
import {
  deliveryQuantity,
  deliveryStatusNames,
  effectiveDeliveryStatus,
  parseOperationCode,
  type Delivery,
} from '@/models/Delivery';
import { getCategoryVisual } from '@/models/DeviceCategory';
import type { Redemption } from '@/models/Reward';
import { useAuth } from '@/providers/AuthProvider';
import { deliveryCommand, getDeliveryPhotoUrl } from '@/services/delivery.service';
import { rewardCommand } from '@/services/reward.service';
import { colors, fonts } from '@/theme';

export default function ScannerScreen() {
  const { company } = useAuth();
  const { code: initialCode } = useLocalSearchParams<{ code?: string }>();

  if (!company) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Validar código" back="/company" />
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="business-outline" size={36} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>Seleccioná una empresa activa</Text>
          <Text style={styles.emptySubtitle}>
            Para escanear y validar entregas o premios debés tener una empresa activa asignada.
          </Text>
          <ActionButton
            title="Ir al panel de empresa"
            onPress={() => router.replace('/company')}
          />
        </View>
      </View>
    );
  }

  return (
    <Scanner
      key={company.companyId}
      companyId={company.companyId}
      companyName={company.companyName}
      initialCode={initialCode}
    />
  );
}

function Scanner({
  companyId,
  companyName,
  initialCode,
}: Readonly<{ companyId: string; companyName: string; initialCode?: string }>) {
  const [permission, requestPermission] = useCameraPermissions();
  const [camera, setCamera] = useState(false);
  const scanLock = useRef(false);
  const [code, setCode] = useState(initialCode ?? '');
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [redemption, setRedemption] = useState<Redemption | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  const scroll = useScrollReset();
  const action = usePortalAction();

  useFocusEffect(
    useCallback(
      () => () => {
        setCamera(false);
      },
      []
    )
  );

  async function lookup(raw: string) {
    setDelivery(null);
    setRedemption(null);
    const parsed = parseOperationCode(raw);
    if (parsed.type === 'REWARD') {
      const found = await rewardCommand('lookup', { companyId, code: parsed.code });
      setCode(parsed.code);
      setRedemption(found);
      return;
    }
    if (parsed.type !== 'DELIVERY') {
      throw new Error(
        parsed.type === 'PICKUP'
          ? 'Este código es de retiro. Ese flujo todavía no está habilitado.'
          : 'Este código no corresponde a una entrega ni a una recompensa.'
      );
    }
    const found = await deliveryCommand('lookup', { companyId, code: parsed.code });
    setCode(parsed.code);
    setDelivery(found);
    setQuantities(
      Object.fromEntries(
        found.items.map((i) => [i.categoryId, i.confirmedQuantity ?? i.declaredQuantity])
      )
    );
  }

  const handleToggleCamera = () => {
    void action.run(async () => {
      if (camera) {
        setCamera(false);
        return;
      }
      const granted = permission?.granted || (await requestPermission()).granted;
      if (!granted) {
        throw new Error(
          'Podés habilitar la cámara desde los ajustes o ingresar el código manualmente.'
        );
      }
      scanLock.current = false;
      setCamera(true);
    }, '');
  };

  const handleConfirmDelivery = () => {
    if (!delivery) return;
    void action.run(async () => {
      const received = await deliveryCommand('confirm', {
        companyId,
        code: delivery.code,
        items: delivery.items.map((i) => ({
          categoryId: i.categoryId,
          quantity: deliveryQuantity(
            String(quantities[i.categoryId] ?? (i.confirmedQuantity ?? i.declaredQuantity)),
            true
          ),
        })),
      });
      setDelivery(received);
      if (received.status !== 'CONFIRMED') {
        throw new Error('El código venció antes de la recepción. No se acreditaron puntos.');
      }
    }, 'Recepción confirmada. Puntos acreditados con éxito.');
  };

  const handleConfirmRedemption = () => {
    if (!redemption) return;
    void action.run(async () => {
      const received = await rewardCommand('confirm', {
        companyId,
        code: redemption.code,
      });
      setRedemption(received);
    }, 'Premio entregado. El código ya no puede volver a usarse.');
  };

  const handleReset = () => {
    setDelivery(null);
    setRedemption(null);
    setCode('');
    setCamera(false);
  };

  // Live calculation of points to accredit based on physical adjustment
  const totalAccreditedPoints = useMemo(() => {
    if (!delivery) return 0;
    return delivery.items.reduce((sum, item) => {
      const qty = quantities[item.categoryId] ?? (item.confirmedQuantity ?? item.declaredQuantity);
      return sum + qty * item.pointsSnapshot;
    }, 0);
  }, [delivery, quantities]);

  // Screen header help action button
  const headerAction = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ayuda sobre cómo validar códigos"
      style={styles.headerHelpBtn}
      onPress={() => setHelpModalVisible(true)}
    >
      <Ionicons name="help-circle-outline" size={24} color={colors.primaryDark} />
    </Pressable>
  );

  // ----------------------------------------------------
  // VIEW 1: Scanner / Code Lookup Form
  // ----------------------------------------------------
  if (!delivery && !redemption) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Validar código" back="/company" action={headerAction} />
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Cámara con marco y esquinas de visor de escáner */}
          <View style={styles.viewfinderCard}>
            <View style={styles.cameraBox}>
              {camera && permission?.granted ? (
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128'] }}
                  onMountError={() => {
                    setCamera(false);
                    void action.run(async () => {
                      throw new Error(
                        'No pudimos abrir la cámara. Ingresá el código manualmente.'
                      );
                    });
                  }}
                  onBarcodeScanned={({ data }) => {
                    if (scanLock.current) return;
                    scanLock.current = true;
                    setCamera(false);
                    void action.run(() => lookup(data), 'Código identificado.');
                  }}
                />
              ) : (
                <View style={styles.cameraPlaceholder}>
                  <View style={styles.qrArtworkCircle}>
                    <Ionicons name="qr-code-outline" size={64} color={colors.primaryDark} />
                  </View>
                  <Text style={styles.cameraInstructions}>
                    Escaneá el código de entrega o canje
                  </Text>
                  <Text style={styles.cameraHint}>
                    Apuntá la cámara al código presentado por el ciudadano.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Abrir cámara del dispositivo"
                    style={styles.cameraToggleBtn}
                    onPress={handleToggleCamera}
                  >
                    <Ionicons name="camera-outline" size={20} color={colors.textOnPrimary} />
                    <Text style={styles.cameraToggleBtnText}>Abrir cámara</Text>
                  </Pressable>
                </View>
              )}

              {/* Esquinas verdes del visor de escáner */}
              <View style={styles.cornerTopLeft} pointerEvents="none" />
              <View style={styles.cornerTopRight} pointerEvents="none" />
              <View style={styles.cornerBottomLeft} pointerEvents="none" />
              <View style={styles.cornerBottomRight} pointerEvents="none" />
            </View>

            {camera && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar cámara"
                style={styles.closeCameraBtn}
                onPress={() => setCamera(false)}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
                <Text style={styles.closeCameraText}>Cerrar visor de cámara</Text>
              </Pressable>
            )}
          </View>

          {/* Separador con "o" */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>o</Text>
            <View style={styles.orLine} />
          </View>

          {/* Ingreso manual de código */}
          <View style={styles.manualEntryCard}>
            <Text style={styles.fieldLabel}>Ingresar código manual</Text>
            <View style={styles.inputBox}>
              <Ionicons name="barcode-outline" size={22} color={colors.textSecondary} />
              <TextInput
                style={styles.manualInput}
                placeholder="TR-… o código manual"
                placeholderTextColor={colors.textSecondary}
                value={code}
                onChangeText={(val) => setCode(val.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!action.busy}
              />
              {code.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Borrar código ingresado"
                  style={styles.clearBtn}
                  onPress={() => setCode('')}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>

            <ActionButton
              title="Buscar"
              loading={action.busy}
              disabled={!code.trim()}
              onPress={() => {
                setCamera(false);
                void action.run(() => lookup(code), 'Código identificado.');
              }}
            />
          </View>

          {action.error ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {action.error}
            </Text>
          ) : null}

          {action.notice ? <Text style={styles.noticeText}>{action.notice}</Text> : null}
        </ScrollView>

        <HelpModal visible={helpModalVisible} onClose={() => setHelpModalVisible(false)} />
      </View>
    );
  }

  // ----------------------------------------------------
  // VIEW 2: Confirmar Entrega de Residuos
  // ----------------------------------------------------
  if (delivery) {
    const status = effectiveDeliveryStatus(delivery);
    const isPending = status === 'PENDING_RECEPTION';

    return (
      <View style={styles.screen}>
        <ScreenHeader
          title={isPending ? 'Confirmar entrega' : 'Detalle de entrega'}
          back="/company"
          action={headerAction}
        />
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
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
                          onChange={(val) =>
                            setQuantities((prev) => ({ ...prev, [item.categoryId]: val }))
                          }
                          disabled={action.busy}
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
              {delivery.photoPath ? <DeliveryPhoto path={delivery.photoPath} /> : null}

              {/* Notas opcionales */}
              {delivery.notes ? (
                <View style={styles.card}>
                  <Text style={styles.notesLabel}>Notas del ciudadano:</Text>
                  <Text style={styles.notesContent}>{delivery.notes}</Text>
                </View>
              ) : null}

              {action.error ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {action.error}
                </Text>
              ) : null}

              {/* Botones de acción */}
              <View style={styles.actionCol}>
                <ActionButton
                  title="Confirmar recepción"
                  loading={action.busy}
                  onPress={handleConfirmDelivery}
                />
                <ActionButton
                  title="Cancelar y volver"
                  secondary
                  disabled={action.busy}
                  onPress={handleReset}
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

              <ActionButton title="Escanear otro código" onPress={handleReset} />
            </>
          )}
        </ScrollView>

        <HelpModal visible={helpModalVisible} onClose={() => setHelpModalVisible(false)} />
      </View>
    );
  }

  // ----------------------------------------------------
  // VIEW 3: Confirmar Canje de Premio
  // ----------------------------------------------------
  if (!redemption) return null;
  const isRedemptionReserved = redemption.status === 'RESERVED';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Validar canje" back="/company" action={headerAction} />
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Card: Comercio asociado */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="storefront-outline" size={22} color={colors.primaryDark} />
            </View>
            <View style={styles.cardTextCol}>
              <Text style={styles.cardSubtitle}>Comercio emisor</Text>
              <Text style={styles.cardTitle}>
                {redemption.reward.businessName || companyName}
              </Text>
            </View>
          </View>
        </View>

        {/* Card: Premio y estado */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="gift-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.cardTextCol}>
              <Text style={styles.cardTitle}>{redemption.reward.title}</Text>
              {redemption.reward.description ? (
                <Text style={styles.cardSubtitle}>{redemption.reward.description}</Text>
              ) : null}
            </View>
            <View
              style={[
                styles.statusBadge,
                !isRedemptionReserved && { backgroundColor: colors.surfaceSoft },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  !isRedemptionReserved && { color: colors.textSecondary },
                ]}
              >
                {isRedemptionReserved ? 'Reservado' : 'Entregado'}
              </Text>
            </View>
          </View>
        </View>

        {/* Card: Datos del ciudadano */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.surfaceSoft }]}>
              <Ionicons name="person" size={22} color={colors.primary} />
            </View>
            <View style={styles.cardTextCol}>
              <Text style={styles.cardSubtitle}>Beneficiario</Text>
              <Text style={styles.cardTitle}>{redemption.citizenName}</Text>
            </View>
            <View style={styles.codePill}>
              <Text style={styles.codePillText}>{redemption.code}</Text>
            </View>
          </View>
        </View>

        {/* Callout explicativo de puntos */}
        <View style={styles.rewardCallout}>
          <Ionicons name="checkmark-circle-outline" size={22} color={colors.primaryDark} />
          <View style={styles.cardTextCol}>
            <Text style={styles.rewardCalloutTitle}>
              {redemption.pointsCost.toLocaleString('es-AR')} puntos ya descontados
            </Text>
            <Text style={styles.rewardCalloutSubtitle}>
              Los puntos se descontaron al momento de la reserva. Esta validación confirma la
              entrega física del premio sin volver a descontar saldo.
            </Text>
          </View>
        </View>

        {/* Aviso de exclusividad para personal autorizado */}
        <View style={styles.operatorNoticeCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.operatorNoticeText}>
            Solo personal autorizado del comercio debe confirmar la entrega física del beneficio.
          </Text>
        </View>

        {action.error ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {action.error}
          </Text>
        ) : null}

        {/* Acciones */}
        <View style={styles.actionCol}>
          {isRedemptionReserved ? (
            <ActionButton
              title="Confirmar entrega del premio"
              loading={action.busy}
              onPress={handleConfirmRedemption}
            />
          ) : null}
          <ActionButton
            title="Escanear otro código"
            secondary={isRedemptionReserved}
            disabled={action.busy}
            onPress={handleReset}
          />
        </View>
      </ScrollView>

      <HelpModal visible={helpModalVisible} onClose={() => setHelpModalVisible(false)} />
    </View>
  );
}

function DeliveryPhoto({ path }: Readonly<{ path: string }>) {
  const loader = useCallback(() => getDeliveryPhotoUrl(path), [path]);
  const { data, loading } = usePortalData(loader);

  if (loading) {
    return (
      <View style={styles.photoLoadingBox}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.notesLabel}>Foto adjunta por el ciudadano:</Text>
      <Image
        source={{ uri: data }}
        accessibilityLabel="Foto de los residuos adjunta por el ciudadano"
        style={styles.photoPreview}
        resizeMode="cover"
      />
    </View>
  );
}

function HelpModal({
  visible,
  onClose,
}: Readonly<{ visible: boolean; onClose: () => void }>) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.helpModalCard} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.helpModalTitle}>¿Cómo validar códigos?</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar ayuda"
              style={styles.modalCloseBtn}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.helpModalScroll}>
            <View style={styles.helpItem}>
              <View style={styles.helpStepBadge}>
                <Text style={styles.helpStepBadgeText}>1</Text>
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.helpItemTitle}>Escanear código QR</Text>
                <Text style={styles.helpItemBody}>
                  Apuntá la cámara al código presentado por el ciudadano en su pantalla o comprobante impreso.
                </Text>
              </View>
            </View>

            <View style={styles.helpItem}>
              <View style={styles.helpStepBadge}>
                <Text style={styles.helpStepBadgeText}>2</Text>
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.helpItemTitle}>Ingreso manual de respaldo</Text>
                <Text style={styles.helpItemBody}>
                  Si la cámara no está disponible o el código no se lee, podés tipear el código alfanumérico que empieza con TR-…
                </Text>
              </View>
            </View>

            <View style={styles.helpItem}>
              <View style={styles.helpStepBadge}>
                <Text style={styles.helpStepBadgeText}>3</Text>
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.helpItemTitle}>Verificación física y ajuste</Text>
                <Text style={styles.helpItemBody}>
                  Contá las unidades reales recibidas. Podés aumentar o reducir las cantidades con los botones + y −. Si alguna categoría no llegó, ajustala a 0.
                </Text>
              </View>
            </View>

            <View style={styles.helpItem}>
              <View style={styles.helpStepBadge}>
                <Text style={styles.helpStepBadgeText}>4</Text>
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.helpItemTitle}>Acreditación y premios</Text>
                <Text style={styles.helpItemBody}>
                  Los puntos de entrega se acreditan de inmediato al confirmar. En los canjes de beneficios, los puntos ya fueron descontados previamente.
                </Text>
              </View>
            </View>
          </ScrollView>

          <ActionButton title="Entendido" onPress={onClose} />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 10,
  },
  headerHelpBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  cameraBox: {
    width: '100%',
    height: 280,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  qrArtworkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cameraInstructions: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  cameraHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  cameraToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    minHeight: 44,
    borderRadius: 12,
    marginTop: 8,
  },
  cameraToggleBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.textOnPrimary,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 32,
    height: 32,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: colors.accent,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: colors.accent,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 32,
    height: 32,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: colors.accent,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 32,
    height: 32,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: colors.accent,
    borderBottomRightRadius: 8,
  },
  closeCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  closeCameraText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  manualEntryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingLeft: 12,
    minHeight: 48,
    gap: 10,
  },
  manualInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 10,
  },
  clearBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  photoLoadingBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 6,
  },
  statusBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  rewardCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  rewardCalloutTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.primaryDark,
  },
  rewardCalloutSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  operatorNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  operatorNoticeText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
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
  noticeText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.primaryDark,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  helpModalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.brandDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpModalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpModalScroll: {
    maxHeight: 340,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  helpStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  helpStepBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.primaryDark,
  },
  helpItemTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    marginBottom: 2,
  },
  helpItemBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
