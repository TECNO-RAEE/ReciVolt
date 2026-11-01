import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { PickupTimeline } from '@/components/pickup/PickupTimeline';
import { ActionButton } from '@/components/ui/ActionButton';
import { InfoCard } from '@/components/ui/InfoCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import { useScrollReset } from '@/hooks/useScrollReset';
import { getCategoryVisual } from '@/models/DeviceCategory';
import {
  formatPickupDate,
  getPickupTimeline,
  pickupQr,
  pickupStatusNames,
} from '@/models/Pickup';
import { useAuth } from '@/providers/AuthProvider';
import { getPickupPhotoUrl, pickupCommand } from '@/services/pickup.service';
import { colors, fonts } from '@/theme';

export default function PickupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const loader = useCallback(() => pickupCommand('get', { id }), [id]);
  const { data: pickup, loading, error, refresh } = usePortalData(loader);
  const action = usePortalAction();
  const scroll = useScrollReset();

  const [copied, setCopied] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (pickup?.photoPath) {
      void getPickupPhotoUrl(pickup.photoPath).then(setPhotoUrl).catch(() => {});
    }
  }, [pickup?.photoPath]);

  useFocusEffect(
    useCallback(() => {
      if (session) void refresh();
    }, [session, refresh])
  );

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
      // ignore
    }
  };

  const handleConfirmCancel = () => {
    setCancelModalVisible(false);
    void action.run(async () => {
      await pickupCommand('cancel', { id });
      await refresh();
    }, 'Solicitud de retiro cancelada.');
  };

  const handleCancelPress = () => {
    if (Platform.OS === 'web') {
      setCancelModalVisible(true);
    } else {
      Alert.alert(
        'Cancelar solicitud de retiro',
        '¿Estás seguro de que querés cancelar esta solicitud? La empresa será notificada.',
        [
          { text: 'No, conservar', style: 'cancel' },
          { text: 'Sí, cancelar', style: 'destructive', onPress: handleConfirmCancel },
        ]
      );
    }
  };

  const timelineSteps = useMemo(() => {
    if (!pickup) return [];
    return getPickupTimeline(pickup);
  }, [pickup]);

  if (!session) {
    return <AccountRequired title="Tu retiro" />;
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Tu retiro" back="/my-raee" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando información del retiro…</Text>
        </View>
      </View>
    );
  }

  if (error || !pickup) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Tu retiro" back="/my-raee" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'No pudimos encontrar este retiro.'}</Text>
          <ActionButton title="Reintentar" onPress={() => void refresh()} />
        </View>
      </View>
    );
  }

  const status = pickup.status;
  const isRequested = status === 'REQUESTED';
  const isCoordinated = status === 'COORDINATED';
  const isInTransit = status === 'IN_TRANSIT';
  const isCompleted = status === 'COMPLETED';
  const isCancelled = status === 'CANCELLED';

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Tu retiro" back="/my-raee" />
      <ScrollView ref={scroll} contentContainerStyle={styles.container}>
        {action.notice && (
          <View style={styles.noticeBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            <Text style={styles.noticeBannerText}>{action.notice}</Text>
          </View>
        )}

        {action.error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.errorBannerText}>{action.error}</Text>
          </View>
        )}

        {/* 1. Status Banner */}
        {isRequested && (
          <View style={styles.yellowBanner}>
            <View style={styles.bannerIconCircleYellow}>
              <Ionicons name="time-outline" size={24} color="#8D6B00" />
            </View>
            <View style={styles.bannerTextCol}>
              <Text style={styles.yellowBannerTitle}>Por coordinar</Text>
              <Text style={styles.yellowBannerSubtitle}>
                A coordinar con la entidad. Te contactarán para acordar el horario.
              </Text>
            </View>
          </View>
        )}

        {isCoordinated && (
          <View style={styles.greenBanner}>
            <View style={styles.bannerIconCircleGreen}>
              <Ionicons name="calendar-outline" size={24} color={colors.primaryDark} />
            </View>
            <View style={styles.bannerTextCol}>
              <Text style={styles.greenBannerTitle}>Retiro coordinado</Text>
              <Text style={styles.greenBannerSubtitle}>
                {pickup.scheduledDate
                  ? `Fecha pactada: ${formatPickupDate(pickup.scheduledDate)}${pickup.scheduledTimeSlot ? ` · ${pickup.scheduledTimeSlot}` : ''}`
                  : 'Fecha y horario acordados con la organización.'}
              </Text>
            </View>
          </View>
        )}

        {isInTransit && (
          <View style={styles.blueBanner}>
            <View style={styles.bannerIconCircleBlue}>
              <Ionicons name="car-outline" size={24} color="#0B4B75" />
            </View>
            <View style={styles.bannerTextCol}>
              <Text style={styles.blueBannerTitle}>Vehículo en camino</Text>
              <Text style={styles.blueBannerSubtitle}>
                El equipo de logística se dirige hacia tu domicilio.
              </Text>
            </View>
          </View>
        )}

        {isCompleted && (
          <View style={styles.successBanner}>
            <View style={styles.bannerIconCircleGreen}>
              <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
            </View>
            <View style={styles.bannerTextCol}>
              <Text style={styles.successBannerTitle}>Retiro recibido</Text>
              <Text style={styles.successBannerSubtitle}>
                {pickup.points > 0
                  ? `Se acreditaron ${pickup.points} puntos a tu cuenta.`
                  : 'El material fue retirado y verificado físicamente.'}
              </Text>
            </View>
          </View>
        )}

        {isCancelled && (
          <View style={styles.cancelledBanner}>
            <View style={styles.bannerIconCircleGrey}>
              <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
            </View>
            <View style={styles.bannerTextCol}>
              <Text style={styles.cancelledBannerTitle}>Solicitud cancelada</Text>
              <Text style={styles.cancelledBannerSubtitle}>
                Este retiro fue cancelado y no se realizará.
              </Text>
            </View>
          </View>
        )}

        {/* 2. Progress Timeline / Stepper */}
        <PickupTimeline steps={timelineSteps} />

        {/* 3. Organización receptora */}
        <InfoCard
          title={pickup.companyName}
          subtitle={pickup.pointName ? `${pickup.pointName}` : 'Organización autorizada'}
          icon={{
            name: 'business',
            type: 'ionicons',
            color: colors.primaryDark,
            backgroundColor: colors.primarySoft,
          }}
        />

        {/* 4. Dirección de retiro */}
        <InfoCard
          title={`${pickup.addressStreet}, ${pickup.addressLocality}`}
          subtitle={
            pickup.addressReference
              ? `Ref: ${pickup.addressReference}`
              : 'Domicilio de retiro declarado'
          }
          icon={{
            name: 'location-outline',
            type: 'ionicons',
            color: colors.primaryDark,
            backgroundColor: colors.primarySoft,
          }}
        />

        {/* 5. Material a retirar */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Material a retirar</Text>
          {pickup.items.map((it) => {
            const visual = getCategoryVisual({ name: it.categoryName, slug: it.categoryName.toLowerCase() });
            return (
              <View key={it.categoryId} style={styles.itemRow}>
                <View style={styles.itemIconCircle}>
                  <MaterialCommunityIcons name={visual.icon} size={20} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{it.categoryName}</Text>
                  {it.pointsSnapshot > 0 && (
                    <Text style={styles.itemRate}>
                      {it.pointsSnapshot} puntos unitarios estimados
                    </Text>
                  )}
                </View>
                <View style={styles.quantityBadge}>
                  <Text style={styles.quantityText}>
                    {it.confirmedQuantity ?? it.declaredQuantity} {it.declaredQuantity === 1 ? 'unidad' : 'unidades'}
                  </Text>
                </View>
              </View>
            );
          })}

          {pickup.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notas del domicilio:</Text>
              <Text style={styles.notesText}>{pickup.notes}</Text>
            </View>
          ) : null}

          {photoUrl ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUrl }} style={styles.photoPreview} resizeMode="cover" />
              <Text style={styles.photoCaption}>Foto del material adjuntada</Text>
            </View>
          ) : null}
        </View>

        {/* 6. Aviso de acreditación */}
        <View style={styles.creditNoticeBox}>
          <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
          <Text style={styles.creditNoticeText}>
            Los puntos finales se calculan y acreditan en tu saldo de red una vez que la empresa verifique físicamente los residuos retirados.
          </Text>
        </View>

        {/* 7. Acciones principales */}
        <View style={styles.actionsContainer}>
          <ActionButton
            title="Ver detalle de la solicitud"
            secondary
            onPress={() => setDetailsModalVisible(true)}
          />

          {(isRequested || isCoordinated) && (
            <ActionButton
              title="Cancelar solicitud"
              secondary
              loading={action.busy}
              onPress={handleCancelPress}
            />
          )}

          {isCompleted && (
            <ActionButton
              title="Ver mis puntos"
              onPress={() => router.push('/my-points')}
            />
          )}
        </View>
      </ScrollView>

      {/* Modal: Detalle de la solicitud (QR y código legible) */}
      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle del retiro</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar modal"
                onPress={() => setDetailsModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.qrContainer}>
                <QRCode
                  value={pickupQr(pickup.code)}
                  size={190}
                  color={colors.text}
                  backgroundColor={colors.surface}
                />
              </View>

              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>Código de retiro:</Text>
                <View style={styles.codeRow}>
                  <Text selectable style={styles.codeText}>
                    {pickup.code}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Copiar código"
                    style={styles.copyBtn}
                    onPress={() => handleCopyCode(pickup.code)}
                  >
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={18}
                      color={copied ? colors.primary : colors.textSecondary}
                    />
                  </Pressable>
                </View>
                {copied && <Text style={styles.copiedNotice}>¡Copiado al portapapeles!</Text>}
              </View>

              <View style={styles.metadataList}>
                <View style={styles.metadataRow}>
                  <Text style={styles.metadataLabel}>Estado:</Text>
                  <Text style={styles.metadataValue}>{pickupStatusNames[pickup.status]}</Text>
                </View>
                <View style={styles.metadataRow}>
                  <Text style={styles.metadataLabel}>Fecha de pedido:</Text>
                  <Text style={styles.metadataValue}>{formatPickupDate(pickup.createdAt)}</Text>
                </View>
                {pickup.scheduledDate && (
                  <View style={styles.metadataRow}>
                    <Text style={styles.metadataLabel}>Fecha coordinada:</Text>
                    <Text style={styles.metadataValue}>{formatPickupDate(pickup.scheduledDate)}</Text>
                  </View>
                )}
                {pickup.scheduledTimeSlot && (
                  <View style={styles.metadataRow}>
                    <Text style={styles.metadataLabel}>Franja horaria:</Text>
                    <Text style={styles.metadataValue}>{pickup.scheduledTimeSlot}</Text>
                  </View>
                )}
                {pickup.driverName && (
                  <View style={styles.metadataRow}>
                    <Text style={styles.metadataLabel}>Responsable:</Text>
                    <Text style={styles.metadataValue}>{pickup.driverName}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Confirmación de cancelación (Web) */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalBox}>
            <Ionicons name="alert-circle" size={36} color={colors.danger} />
            <Text style={styles.confirmModalTitle}>¿Cancelar solicitud?</Text>
            <Text style={styles.confirmModalText}>
              ¿Estás seguro de que querés cancelar esta solicitud de retiro? La organización receptora será notificada.
            </Text>
            <View style={styles.confirmModalActions}>
              <ActionButton
                title="Conservar solicitud"
                secondary
                onPress={() => setCancelModalVisible(false)}
              />
              <ActionButton
                title="Sí, cancelar retiro"
                loading={action.busy}
                onPress={handleConfirmCancel}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textSecondary,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.danger,
    textAlign: 'center',
  },
  yellowBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  bannerIconCircleYellow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF0B2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yellowBannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#6D4C00',
  },
  yellowBannerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#8D6B00',
    lineHeight: 18,
    marginTop: 2,
  },
  greenBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#C3E4CD',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  bannerIconCircleGreen: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1EBD9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenBannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.primaryDark,
  },
  greenBannerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.primaryDark,
    lineHeight: 18,
    marginTop: 2,
  },
  blueBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E8F3FA',
    borderWidth: 1,
    borderColor: '#BFE0F2',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  bannerIconCircleBlue: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CEE8F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueBannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#0B4B75',
  },
  blueBannerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#155B8A',
    lineHeight: 18,
    marginTop: 2,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#B9DFC4',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  successBannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.primaryDark,
  },
  successBannerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.primaryDark,
    lineHeight: 18,
    marginTop: 2,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  bannerIconCircleGrey: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelledBannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.textSecondary,
  },
  cancelledBannerSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  bannerTextCol: {
    flex: 1,
    gap: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cardHeaderTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  itemIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  itemRate: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  quantityBadge: {
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  notesBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    gap: 4,
    marginTop: 6,
  },
  notesLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  notesText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  photoContainer: {
    marginTop: 6,
    gap: 6,
  },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 10,
  },
  photoCaption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  creditNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSoft,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  creditNoticeText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionsContainer: {
    gap: 10,
    marginTop: 4,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  noticeBannerText: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBackground,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  modalBody: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 24,
  },
  qrContainer: {
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeContainer: {
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  codeLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.primaryDark,
    letterSpacing: 0.5,
  },
  copyBtn: {
    padding: 4,
  },
  copiedNotice: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.primary,
  },
  metadataList: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataLabel: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  metadataValue: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  confirmModalBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    margin: 24,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    alignSelf: 'center',
    maxWidth: 400,
    width: '90%',
  },
  confirmModalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  confirmModalText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmModalActions: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
});
