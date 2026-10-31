import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AccountRequired } from '@/components/auth/AccountRequired';
import { ActionButton } from '@/components/ui/ActionButton';
import { PortalLoading } from '@/components/portal/PortalUI';
import {
  CitizenPage,
  CopyableCode,
  DetailList,
  InfoNote,
  RewardPhoto,
  StatusBanner,
  rewardStyles as s,
} from '@/components/rewards/RewardsUI';
import { usePortalData } from '@/hooks/usePortalData';
import { pointsLabel, rewardQr, type Redemption } from '@/models/Reward';
import { useAuth } from '@/providers/AuthProvider';
import { rewardCommand } from '@/services/reward.service';
import { colors } from '@/theme';

export default function RedemptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  return session ? (
    <RedemptionDetail key={`${id}:${session.user.id}`} id={id} />
  ) : (
    <AccountRequired title="Tu canje" />
  );
}
function RedemptionDetail({ id }: Readonly<{ id: string }>) {
  const loader = useCallback(() => rewardCommand('get', { id }), [id]);
  const { data, loading, error, refresh } = usePortalData(loader);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );
  const reserved = data?.status === 'RESERVED';
  return (
    <CitizenPage title={data && !reserved ? 'Detalle del canje' : 'Tu canje'} back="/rewards">
      {!data && <PortalLoading loading={loading} error={error} retry={() => void refresh()} />}
      {data && (reserved ? <Reserved data={data} /> : <Delivered data={data} />)}
    </CitizenPage>
  );
}
function Reserved({ data }: Readonly<{ data: Redemption }>) {
  return (
    <>
      <StatusBanner
        tone="pending"
        title="Reservado"
        message="Mostrá este código en el local para validar tu canje."
      />
      <View style={[s.card, { alignItems: 'center' }]}>
        <View accessibilityLabel="Código QR del canje">
          <QRCode value={rewardQr(data.code)} size={180} quietZone={12} ecl="M" />
        </View>
        <CopyableCode code={data.code} />
      </View>
      <DetailList
        rows={[
          { icon: 'gift-outline', label: 'Premio', value: data.reward.title },
          { icon: 'storefront-outline', label: 'Comercio', value: data.reward.businessName },
          ...locationRow(data),
          { icon: 'leaf-outline', label: 'Puntos utilizados', value: pointsLabel(data.pointsCost) },
          {
            icon: 'time-outline',
            label: 'Estado',
            value: 'A la espera de validación del comercio',
          },
        ]}
      />
      <InfoNote>
        Mostrá este código en el local. Los puntos ya se descontaron y el código es válido por única
        vez.
      </InfoNote>
    </>
  );
}
function Delivered({ data }: Readonly<{ data: Redemption }>) {
  return (
    <>
      <StatusBanner tone="success" title="Premio entregado" message="¡Disfrutá tu beneficio!" />
      <View style={{ borderRadius: 18, overflow: 'hidden' }}>
        <RewardPhoto reward={data.reward} height={200} />
      </View>
      <View style={{ gap: 4 }}>
        <Text style={s.subtitle}>{data.reward.title}</Text>
        <Text style={[s.body, { fontSize: 16 }]}>{data.reward.businessName}</Text>
      </View>
      <DetailList
        rows={[
          { icon: 'storefront-outline', label: 'Comercio', value: data.reward.businessName },
          ...locationRow(data),
          {
            icon: 'calendar-outline',
            label: 'Fecha de entrega',
            value: data.redeemedAt
              ? new Date(data.redeemedAt).toLocaleString('es-AR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Sin fecha registrada',
          },
          { icon: 'leaf-outline', label: 'Puntos utilizados', value: pointsLabel(data.pointsCost) },
        ]}
      />
      <View style={[s.card, s.row, { borderWidth: 1, borderColor: colors.border }]}>
        <Ionicons name="checkmark-circle" size={30} color={colors.primary} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.label}>Canje validado por el comercio</Text>
          <Text style={s.body}>El beneficio fue entregado correctamente.</Text>
        </View>
      </View>
      <ActionButton
        title="Ver mis canjes"
        secondary
        onPress={() => router.replace('/rewards?tab=canjes')}
      />
    </>
  );
}
function locationRow(data: Redemption) {
  return data.reward.address
    ? [{ icon: 'location-outline' as const, label: 'Ubicación', value: data.reward.address }]
    : [];
}
