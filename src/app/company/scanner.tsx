import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  DeliveryConfirmationView,
  RedemptionConfirmationView,
  ScannerHelpModal,
  ScannerLookupView,
} from '@/components/scanner';
import { ActionButton } from '@/components/ui/ActionButton';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { usePortalAction } from '@/hooks/usePortalData';
import { useScrollReset } from '@/hooks/useScrollReset';
import {
  deliveryQuantity,
  effectiveDeliveryStatus,
  parseOperationCode,
  type Delivery,
} from '@/models/Delivery';
import type { Redemption } from '@/models/Reward';
import { useAuth } from '@/providers/AuthProvider';
import { deliveryCommand } from '@/services/delivery.service';
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
          : 'Este código es de recompensa. Ese flujo todavía no está habilitado.'
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
    <View style={styles.screen}>
      <ScreenHeader title={title} back="/company" action={headerAction} />
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!delivery && !redemption && (
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
      </ScrollView>

      <ScannerHelpModal
        visible={helpModalVisible}
        onClose={() => setHelpModalVisible(false)}
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
});
