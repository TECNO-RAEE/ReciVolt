import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AccountRequired } from '@/components/auth/AccountRequired';
import { ActionButton } from '@/components/ui/ActionButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import { useScrollReset } from '@/hooks/useScrollReset';
import {
  deliveryQr,
  deliveryStatusNames,
  effectiveDeliveryStatus,
} from '@/models/Delivery';
import { getCategoryVisual } from '@/models/DeviceCategory';
import { useAuth } from '@/providers/AuthProvider';
import { deliveryCommand, getDeliveryPhotoUrl } from '@/services/delivery.service';
import { colors, fonts } from '@/theme';

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const loader = useCallback(() => deliveryCommand('get', { id }), [id]);
  const { data, loading, error, refresh } = usePortalData(loader);
  const action = usePortalAction();
  const scroll = useScrollReset();

  const [copied, setCopied] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (session) void refresh();
    }, [session, refresh])
  );

  if (!session) {
    return <AccountRequired title="Tu entrega" />;
  }

  const handleCopyCode = async (code: string) => {
    try {
      let success = false;
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(code);
        success = true;
      } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
        success = true;
      }
      if (success) {
        setCopied(true);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Do not set copied on clipboard error
    }
  };

  const handleConfirmCancel = () => {
    setCancelModalVisible(false);
    void action.run(async () => {
      await deliveryCommand('cancel', { id });
      await refresh();
    }, 'Entrega cancelada.');
  };

  const handleCancelPress = () => {
    if (Platform.OS === 'web') {
      setCancelModalVisible(true);
    } else {
      Alert.alert(
        'Cancelar entrega',
        '¿Estás seguro de que querés cancelar esta entrega? Los puntos no serán acreditados.',
        [
          { text: 'No, conservar', style: 'cancel' },
          { text: 'Sí, cancelar', style: 'destructive', onPress: handleConfirmCancel },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Tu entrega" back="/my-raee" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando información de la entrega…</Text>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Tu entrega" back="/my-raee" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'No pudimos encontrar esta entrega.'}</Text>
          <ActionButton title="Reintentar" onPress={() => void refresh()} />
        </View>
      </View>
    );
  }

  const status = effectiveDeliveryStatus(data);

  // VIEW 1: Confirmed reception
  if (status === 'CONFIRMED') {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Detalle de entrega" back="/my-raee" />
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero de confirmación */}
          <View style={styles.confirmedHero}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={38} color={colors.textOnPrimary} />
            </View>
            <Text style={styles.confirmedTitle}>Entrega confirmada</Text>
            <Text style={styles.confirmedSubtitle}>
              ¡Gracias por ser parte de un mundo más limpio y responsable!
            </Text>
          </View>

          {/* Card: Organización receptora */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="business" size={22} color={colors.primaryDark} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>{data.pointName}</Text>
                <Text style={styles.cardSubtitle}>{data.companyName}</Text>
              </View>
            </View>
          </View>

          {/* Card: Dispositivos recibidos */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Dispositivos recibidos</Text>
            {data.items.map((item, index) => {
              const visual = getCategoryVisual({ name: item.categoryName });
              const count = item.confirmedQuantity ?? item.declaredQuantity;
              return (
                <View key={`${item.categoryId}-${index}`} style={[styles.cardRow, { marginTop: 10 }]}>
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
                      {count} {item.categoryName.toLowerCase()}{' '}
                      {item.confirmedQuantity !== null ? 'recibidas' : 'declaradas'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Card: Puntos acreditados */}
          <View style={[styles.card, styles.pointsAccreditedCard]}>
            <View style={styles.cardRow}>
              <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
                <Ionicons name="gift-outline" size={24} color={colors.primaryDark} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.pointsAccreditedTitle}>
                  {data.points.toLocaleString('es-AR')} puntos acreditados
                </Text>
                <Text style={styles.pointsAccreditedSubtitle}>
                  Tu saldo se puede usar en toda la red de recompensas.
                </Text>
              </View>
            </View>
          </View>

          {/* Botones de acción */}
          <View style={styles.actionButtonsCol}>
            <ActionButton
              title="Ver mis puntos"
              onPress={() => router.push('/my-points')}
            />
            <ActionButton
              title="Volver al inicio"
              secondary
              onPress={() => router.replace('/home')}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // VIEW 2: Pending reception
  if (status === 'PENDING_RECEPTION') {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Tu entrega" back="/my-raee" />
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Banner: Pendiente de recepción */}
          <View style={styles.pendingBanner}>
            <View style={styles.pendingIconCircle}>
              <Ionicons name="time-outline" size={22} color={colors.primaryDark} />
            </View>
            <View style={styles.cardTextCol}>
              <Text style={styles.pendingTitle}>Pendiente de recepción</Text>
              <Text style={styles.pendingSubtitle}>
                Llevá este código al punto de entrega seleccionado.
              </Text>
            </View>
          </View>

          {/* Card: Organización receptora */}
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="business" size={22} color={colors.primaryDark} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>{data.pointName}</Text>
                <Text style={styles.cardSubtitle}>{data.companyName}</Text>
              </View>
            </View>
          </View>

          {/* Card: Código QR y código manual */}
          <View style={[styles.card, styles.qrCard]}>
            <View style={styles.qrWrapper}>
              <QRCode value={deliveryQr(data.code)} size={200} quietZone={12} ecl="M" />
            </View>

            <Text style={styles.manualCodeLabel}>Código manual</Text>
            <View style={styles.manualCodeRow}>
              <Text selectable style={styles.manualCodeText}>
                {data.code}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copiar código manual"
                style={styles.copyBtn}
                onPress={() => void handleCopyCode(data.code)}
              >
                <Ionicons
                  name={copied ? 'checkmark' : 'copy-outline'}
                  size={20}
                  color={copied ? colors.primaryDark : colors.textSecondary}
                />
              </Pressable>
            </View>
            {copied && <Text style={styles.copiedFeedback}>Código copiado al portapapeles</Text>}
          </View>

          {/* Card: Resumen de entrega */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Resumen de entrega</Text>
            {data.items.map((item, index) => {
              const visual = getCategoryVisual({ name: item.categoryName });
              return (
                <View key={`${item.categoryId}-${index}`} style={[styles.cardRow, { marginTop: 10 }]}>
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
                      {item.declaredQuantity} {item.categoryName.toLowerCase()}
                    </Text>
                  </View>
                </View>
              );
            })}
            {data.notes ? (
              <View style={styles.notesBlock}>
                <Text style={styles.notesLabel}>Notas:</Text>
                <Text style={styles.notesText}>{data.notes}</Text>
              </View>
            ) : null}
            {data.photoPath ? (
              <DeliveryPhoto path={data.photoPath} />
            ) : null}
          </View>

          {/* Banner de advertencia: Todavía no suma puntos */}
          <View style={styles.warningBanner}>
            <View style={styles.warningIconCircle}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.cardTextCol}>
              <Text style={styles.warningTitle}>Este código todavía no suma puntos.</Text>
              <Text style={styles.warningSubtitle}>
                Los puntos se acreditan cuando el receptor confirma lo recibido.
              </Text>
            </View>
          </View>

          {action.error ? (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {action.error}
            </Text>
          ) : null}

          {/* Botón: Cancelar entrega */}
          <ActionButton
            title="Cancelar entrega"
            secondary
            loading={action.busy}
            onPress={handleCancelPress}
          />
        </ScrollView>

        {/* Modal de confirmación para cancelar en web */}
        <Modal
          visible={cancelModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCancelModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalAlertCard}>
              <View style={styles.modalAlertIcon}>
                <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
              </View>
              <Text style={styles.modalAlertTitle}>¿Cancelar entrega?</Text>
              <Text style={styles.modalAlertMsg}>
                Si cancelás esta entrega, el código quedará inhabilitado y no se acreditarán puntos.
              </Text>
              <View style={styles.modalAlertActions}>
                <Pressable
                  accessibilityRole="button"
                  style={styles.modalCancelBtn}
                  onPress={() => setCancelModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Volver</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={styles.modalConfirmBtn}
                  onPress={handleConfirmCancel}
                >
                  <Text style={styles.modalConfirmText}>Sí, cancelar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // VIEW 3: CANCELLED
  if (status === 'CANCELLED') {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Tu entrega" back="/my-raee" />
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.dangerBackground },
                ]}
              >
                <Ionicons name="close-circle" size={24} color={colors.danger} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>Entrega cancelada</Text>
                <Text style={styles.cardSubtitle}>
                  Esta entrega fue cancelada y el código quedó inhabilitado. No acredita puntos.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Organización</Text>
            <Text style={styles.cardSubtitle}>
              {data.pointName} · {data.companyName}
            </Text>
          </View>

          <ActionButton
            title="Volver a Mis entregas"
            onPress={() => router.replace('/my-raee')}
          />
        </ScrollView>
      </View>
    );
  }

  // VIEW 4: EXPIRED
  if (status === 'EXPIRED') {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Tu entrega" back="/my-raee" />
        <ScrollView
          ref={scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.surfaceSoft },
                ]}
              >
                <Ionicons name="time-outline" size={24} color={colors.textSecondary} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>Código vencido</Text>
                <Text style={styles.cardSubtitle}>
                  El plazo para presentar este código expiró antes de la recepción.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Organización</Text>
            <Text style={styles.cardSubtitle}>
              {data.pointName} · {data.companyName}
            </Text>
          </View>

          <ActionButton
            title="Iniciar nueva entrega"
            onPress={() => router.replace('/new-delivery')}
          />
        </ScrollView>
      </View>
    );
  }

  // Fallback: any other status
  const statusLabel = deliveryStatusNames[status] ?? status;
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Tu entrega" back="/my-raee" />
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estado de entrega: {statusLabel}</Text>
          <Text style={styles.cardSubtitle}>
            {data.pointName} · {data.companyName}
          </Text>
        </View>
        <ActionButton
          title="Volver a Mis entregas"
          onPress={() => router.replace('/my-raee')}
        />
      </ScrollView>
    </View>
  );
}

function DeliveryPhoto({ path }: Readonly<{ path: string }>) {
  const loader = useCallback(() => getDeliveryPhotoUrl(path), [path]);
  const { data, loading } = usePortalData(loader);

  if (loading) {
    return (
      <View style={{ paddingVertical: 12, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={{ marginTop: 12 }}>
      <Image
        source={{ uri: data }}
        accessibilityLabel="Foto adjunta de los dispositivos"
        style={styles.photoPreview}
        resizeMode="cover"
      />
    </View>
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
    gap: 16,
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: 12,
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
  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    marginBottom: 4,
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  pendingIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.primaryDark,
  },
  pendingSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  qrCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manualCodeLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 18,
  },
  manualCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  manualCodeText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    letterSpacing: 0.5,
  },
  copyBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copiedFeedback: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.primaryDark,
    marginTop: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  warningIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  warningSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  notesBlock: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 4,
  },
  notesLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  notesText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  confirmedHero: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  checkCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    textAlign: 'center',
    marginTop: 4,
  },
  confirmedSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  pointsAccreditedCard: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
  },
  pointsAccreditedTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.primaryDark,
  },
  pointsAccreditedSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  actionButtonsCol: {
    gap: 12,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalAlertCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalAlertIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dangerBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAlertTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  modalAlertMsg: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalAlertActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  modalConfirmBtn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.textOnPrimary,
  },
});
