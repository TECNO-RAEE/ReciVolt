import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { PortalPage } from '@/components/portal/PortalUI';
import {
  DeliveryConfirmationView,
  RedemptionConfirmationView,
  ScannerHelpModal,
  ScannerLookupView,
} from '@/components/scanner';
import { ActionButton } from '@/components/ui/ActionButton';
import { usePortalAction } from '@/hooks/usePortalData';
import {
  deliveryQuantity,
  effectiveDeliveryStatus,
  parseOperationCode,
  type Delivery,
} from '@/models/Delivery';
import type { Redemption } from '@/models/Reward';
import { useAuth } from '@/providers/AuthProvider';
import { deliveryCommand } from '@/services/delivery.service';
import { getPickupByCode } from '@/services/pickup.service';
import { rewardCommand } from '@/services/reward.service';
import { fonts, useColors, useThemedStyles, type ThemeColors } from '@/theme';

export default function ScannerScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { company } = useAuth();
  const { code: rawInitialCode } = useLocalSearchParams<{ code?: string | string[] }>();
  const initialCode = Array.isArray(rawInitialCode) ? rawInitialCode[0] : rawInitialCode;

  if (!company) {
    return (
      <PortalPage title="Validar código" back="/company">
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="business-outline" size={36} color={colors.textSecondary} />
          </View>
          <Text style={styles.emptyTitle}>Seleccioná una empresa activa</Text>
          <Text style={styles.emptySubtitle}>
            Para escanear y validar entregas, retiros o premios debés tener una empresa activa
            asignada.
          </Text>
          <ActionButton
            title="Ir al panel de empresa"
            onPress={() => router.replace('/company')}
          />
        </View>
      </PortalPage>
    );
  }

  return (
    <Scanner
      key={`${company.companyId}:${initialCode?.trim().toUpperCase() ?? ''}`}
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
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [permission, requestPermission] = useCameraPermissions();
  const [camera, setCamera] = useState(false);
  const scanLock = useRef(false);
  const autoLookupCode = useRef<string | null>(null);
  const [resolvingInitial, setResolvingInitial] = useState(() => Boolean(initialCode?.trim()));
  const [code, setCode] = useState(() => initialCode?.trim().toUpperCase() ?? '');
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [redemption, setRedemption] = useState<Redemption | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  const action = usePortalAction();

  useFocusEffect(
    useCallback(
      () => () => {
        setCamera(false);
      },
      []
    )
  );

  async function openPickupByCode(pickupCode: string) {
    const found = await getPickupByCode(companyId, pickupCode);
    if (!found) {
      throw new Error('Código no encontrado para esta empresa.');
    }
    setCode(pickupCode);
    router.push({ pathname: '/company/pickups/[id]/receive', params: { id: found.id } });
  }

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
    if (parsed.type === 'PICKUP') {
      await openPickupByCode(parsed.code);
      return;
    }
    try {
      const found = await deliveryCommand('lookup', { companyId, code: parsed.code });
      setCode(parsed.code);
      setDelivery(found);
      setQuantities(
        Object.fromEntries(
          found.items.map((i) => [i.categoryId, i.confirmedQuantity ?? i.declaredQuantity])
        )
      );
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : '';
      // Manual TR- codes default to DELIVERY in parseOperationCode; fall back to pickups if not found.
      if (message.includes('Código no encontrado')) {
        const pickup = await getPickupByCode(companyId, parsed.code);
        if (pickup) {
          setCode(parsed.code);
          router.push({ pathname: '/company/pickups/[id]/receive', params: { id: pickup.id } });
          return;
        }
      }
      throw err;
    }
  }

  useEffect(() => {
    const trimmed = initialCode?.trim().toUpperCase();
    if (!trimmed || autoLookupCode.current === trimmed) return;
    autoLookupCode.current = trimmed;
    void action.run(() => lookup(trimmed), '').finally(() => setResolvingInitial(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Auto-run lookup once per initialCode/companyId.
  }, [companyId, initialCode]);

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

  let title = 'Validar código';
  if (delivery) {
    const status = effectiveDeliveryStatus(delivery);
    title = status === 'PENDING_RECEPTION' ? 'Confirmar entrega' : 'Detalle de entrega';
  } else if (redemption) {
    title = 'Validar canje';
  }

  return (
    <>
      <PortalPage title={title} back="/company" action={headerAction}>
        {resolvingInitial && !delivery && !redemption && (
          <View style={styles.resolvingBox}>
            <ActivityIndicator color={colors.primary} accessibilityLabel="Buscando código" />
            <Text style={styles.emptySubtitle}>Consultando código…</Text>
          </View>
        )}

        {!resolvingInitial && !delivery && !redemption && (
          <ScannerLookupView
            camera={camera}
            permissionGranted={Boolean(permission?.granted)}
            onMountError={() => {
              setCamera(false);
              void action.run(async () => {
                throw new Error(
                  'No pudimos abrir la cámara. Ingresá el código manualmente.'
                );
              });
            }}
            onBarcodeScanned={(data) => {
              if (scanLock.current) return;
              scanLock.current = true;
              setCamera(false);
              void action.run(() => lookup(data), 'Código identificado.');
            }}
            onToggleCamera={handleToggleCamera}
            onCloseCamera={() => setCamera(false)}
            code={code}
            onChangeCode={(val) => setCode(val.toUpperCase())}
            onClearCode={() => setCode('')}
            onSearch={() => {
              setCamera(false);
              void action.run(() => lookup(code), 'Código identificado.');
            }}
            busy={action.busy}
            error={action.error}
            notice={action.notice}
          />
        )}

        {delivery && (
          <DeliveryConfirmationView
            delivery={delivery}
            companyName={companyName}
            quantities={quantities}
            onQuantityChange={(categoryId, quantity) =>
              setQuantities((prev) => ({ ...prev, [categoryId]: quantity }))
            }
            busy={action.busy}
            error={action.error}
            notice={action.notice}
            onConfirmDelivery={handleConfirmDelivery}
            onRefresh={() => void action.run(() => lookup(delivery.code), '')}
            onReset={handleReset}
          />
        )}

        {redemption && (
          <RedemptionConfirmationView
            redemption={redemption}
            companyName={companyName}
            busy={action.busy}
            error={action.error}
            notice={action.notice}
            onConfirmRedemption={handleConfirmRedemption}
            onRefresh={() => void action.run(() => lookup(redemption.code), '')}
            onReset={handleReset}
          />
        )}
      </PortalPage>

      <ScannerHelpModal
        visible={helpModalVisible}
        onClose={() => setHelpModalVisible(false)}
      />
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    resolvingBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      gap: 12,
    },
  });
