import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActionButton } from '@/components/ui/ActionButton';
import { InfoCard } from '@/components/ui/InfoCard';
import { DevicePreparationArtwork } from '@/components/ui/EcoArtwork';
import { AccountRequired } from '@/components/auth/AccountRequired';
import { DiscoveryState } from '@/components/discovery/DiscoveryState';
import { PointsMap } from '@/components/discovery/PointsMap';
import { InfoNote } from '@/components/rewards/RewardsUI';
import {
  distanceKm,
  canRegisterDelivery,
  formatDistance,
  formatScheduleMinute,
  openingStatus,
  weekdayNames,
} from '@/models/GreenPoint';
import { canRequestPickup } from '@/models/Pickup';
import { useAuth } from '@/providers/AuthProvider';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import { colors, fonts } from '@/theme';
import { useScrollReset } from '@/hooks/useScrollReset';

const PREVIEW_CATEGORY_LIMIT = 4;

export default function PointDetailScreen() {
  const scroll = useScrollReset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { guest } = useAuth();
  const { points, loading, error, refresh, location, now } = useDiscovery();
  const [needsAccount, setNeedsAccount] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const point = points.find((p) => p.id === id);
  const mapPoints = useMemo(() => (point ? [point] : []), [point]);
  const noSelect = useCallback(() => {}, []);
  const openLink = async (url: string) => {
    setLinkError(null);
    try {
      await Linking.openURL(url);
    } catch {
      setLinkError(
        'No pudimos abrir el enlace. Podés copiar la dirección o el teléfono de esta pantalla.'
      );
    }
  };
  if (needsAccount)
    return (
      <View style={styles.container}>
        <AccountRequired title="Registrar entrega" onBack={() => setNeedsAccount(false)} />
        <View style={{ padding: 24 }}>
          <ActionButton title="Volver al punto" secondary onPress={() => setNeedsAccount(false)} />
        </View>
      </View>
    );
  const acceptedPolicies = point
    ? point.intakePolicies.filter((policy) => policy.category && policy.mode !== 'not_accepted')
    : [];
  const rejectedPolicies = point
    ? point.intakePolicies.filter((policy) => policy.category && policy.mode === 'not_accepted')
    : [];
  return (
    <View style={styles.container}>
      <ScreenHeader title="Detalle del punto" back="/green-points" />
      <ScrollView
        ref={scroll}
        contentContainerStyle={[
          styles.content,
          point && !loading && !error && styles.contentWithFooter,
        ]}
      >
        {loading || error ? (
          <DiscoveryState loading={loading} error={error} retry={refresh} />
        ) : !point ? (
          <>
            <Text style={styles.title}>Punto no disponible</Text>
            <Text style={styles.text}>El punto no existe o ya no está publicado.</Text>
            <ActionButton
              title="Explorar otros puntos"
              onPress={() => router.replace('/green-points')}
            />
          </>
        ) : (
          <>
            <View
              style={styles.photoHeader}
              accessibilityElementsHidden
              importantForAccessibility="no"
            >
              <DevicePreparationArtwork />
            </View>
            <Text style={styles.photoCaption}>Foto del punto pendiente de publicar</Text>
            <View style={styles.heading}>
              <Text style={styles.title}>{point.name}</Text>
              {!point.demo && <Text style={styles.company}>{point.companyName}</Text>}
            </View>
            {point.demo && <InfoNote>{point.description}</InfoNote>}
            <Text selectable style={styles.text}>
              {point.address}
            </Text>
            {location && (
              <Text style={styles.text}>
                A {formatDistance(distanceKm(location, point))} en línea recta
              </Text>
            )}
            <Text style={styles.status}>
              {point.demo ? 'Horario de ejemplo · ' : ''}
              {openingStatus(point, now) === 'open'
                ? 'Abierto ahora'
                : openingStatus(point, now) === 'closed'
                  ? 'Cerrado ahora'
                  : 'Horario sin informar'}
            </Text>
            <PointsMap points={mapPoints} preview onSelect={noSelect} />
            <ActionButton
              title="Cómo llegar"
              onPress={() =>
                void openLink(
                  `https://www.google.com/maps/dir/?api=1&destination=${point.latitude},${point.longitude}`
                )
              }
            />
            {point.description && !point.demo && (
              <Text style={styles.text}>{point.description}</Text>
            )}
            {!point.intakeConfirmed && (
              <InfoNote>
                La política de recepción de este punto todavía está pendiente de confirmar.
              </InfoNote>
            )}
            <InfoCard
              variant="highlight"
              icon={{ name: 'checkmark-circle', color: colors.primaryDark }}
              title="Qué recibimos"
              subtitle={
                acceptedPolicies.length
                  ? undefined
                  : point.intakePolicies.length
                    ? 'Este punto no recibe dispositivos para entrega presencial.'
                    : 'El punto todavía no informó qué dispositivos recibe. Consultá antes de acercarte.'
              }
            >
              {acceptedPolicies.length > 0 && (
                <View style={styles.policyList}>
                  {acceptedPolicies.slice(0, PREVIEW_CATEGORY_LIMIT).map((policy) => (
                    <View style={styles.policyRow} key={policy.categoryId}>
                      <Ionicons name="checkmark" size={18} color={colors.primaryDark} />
                      <Text style={styles.categoryText}>
                        {policy.category!.name}
                        {policy.mode === 'pickup' ? ' (coordinar retiro)' : ''}
                      </Text>
                    </View>
                  ))}
                  <ActionButton
                    title="Ver listado completo"
                    secondary
                    onPress={() =>
                      router.push({ pathname: '/device-categories', params: { pointId: point.id } })
                    }
                  />
                </View>
              )}
            </InfoCard>
            {point.intakePolicies.some((policy) => policy.mode === 'pickup') && (
              <Text style={styles.caption}>
                Contactá al punto para consultar cómo coordinar el retiro.
              </Text>
            )}
            <InfoCard
              icon={{
                name: 'close-circle',
                color: colors.danger,
                backgroundColor: colors.dangerBackground,
              }}
              title="Qué no recibimos"
              subtitle={
                rejectedPolicies.length
                  ? undefined
                  : 'Este punto no registró dispositivos excluidos.'
              }
            >
              {rejectedPolicies.length > 0 && (
                <View style={styles.policyList}>
                  {rejectedPolicies.slice(0, PREVIEW_CATEGORY_LIMIT).map((policy) => (
                    <View style={styles.policyRow} key={policy.categoryId}>
                      <Ionicons name="close" size={18} color={colors.danger} />
                      <Text style={styles.categoryText}>{policy.category!.name}</Text>
                    </View>
                  ))}
                  <ActionButton
                    title="Ver qué no recibe"
                    secondary
                    onPress={() =>
                      router.push({ pathname: '/device-unaccepted', params: { pointId: point.id } })
                    }
                  />
                </View>
              )}
            </InfoCard>
            <Text style={styles.sectionTitle}>Horarios</Text>
            <Text style={styles.caption}>Hora local del punto · {point.timeZone}</Text>
            {point.schedules.length ? (
              weekdayNames.map((day, index) => {
                const intervals = point.schedules.filter((s) => s.weekday === index + 1);
                return (
                  <View key={day} style={styles.schedule}>
                    <Text style={styles.day}>{day}</Text>
                    <Text style={styles.hours}>
                      {intervals.length
                        ? intervals
                            .map(
                              (s) =>
                                `${formatScheduleMinute(s.opensMinute)} – ${formatScheduleMinute(s.closesMinute)}`
                            )
                            .join('\n')
                        : 'Cerrado'}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.text}>Horarios sin informar. Consultá antes de acercarte.</Text>
            )}
            {point.phone && (
              <>
                <Text style={styles.sectionTitle}>Contacto</Text>
                <Text selectable style={styles.text}>
                  {point.phone}
                </Text>
                <ActionButton
                  title="Llamar al punto"
                  secondary
                  onPress={() => void openLink(`tel:${point.phone!.replace(/[^+\d]/g, '')}`)}
                />
              </>
            )}
            {linkError && (
              <Text accessibilityRole="alert" style={styles.text}>
                {linkError}
              </Text>
            )}
            {!point.demo && (
              <Text style={styles.text}>
                {point.intakePolicies.some((policy) => policy.mode === 'pickup')
                  ? 'Algunos dispositivos requieren coordinar el retiro con este punto.'
                  : point.pickupEnabled
                    ? 'Este punto ofrece retiros. Consultá qué dispositivos incluye.'
                    : 'Este punto recibe entregas presenciales.'}
              </Text>
            )}
            {canRegisterDelivery(point) && canRequestPickup(point) && (
              <ActionButton
                title="Solicitar retiro a domicilio"
                secondary
                onPress={() =>
                  guest
                    ? setNeedsAccount(true)
                    : router.push({ pathname: '/pickup/new', params: { pointId: point.id } })
                }
              />
            )}
          </>
        )}
      </ScrollView>
      {point && !loading && !error && (
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.footerOuter}>
          <View style={styles.footer}>
            {!canRegisterDelivery(point) ? (
              <ActionButton
                title="Ver otros puntos verdes"
                secondary
                onPress={() => router.replace('/green-points')}
              />
            ) : (
              <ActionButton
                title="Registrar entrega"
                onPress={() =>
                  guest
                    ? setNeedsAccount(true)
                    : router.push({ pathname: '/new-delivery', params: { pointId: point.id } })
                }
              />
            )}
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: 24,
    gap: 16,
    paddingBottom: 40,
  },
  contentWithFooter: { paddingBottom: 24 },
  photoHeader: {
    height: 180,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoCaption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  heading: { gap: 8 },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.primary },
  company: { fontFamily: fonts.semiBold, fontSize: 18, color: colors.text },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.text },
  status: { fontFamily: fonts.semiBold, color: colors.primary, fontSize: 16 },
  sectionTitle: { fontFamily: fonts.semiBold, fontSize: 20, color: colors.text, marginTop: 8 },
  policyList: { marginTop: 12, gap: 10 },
  policyRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  caption: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.brandDark },
  schedule: {
    flexDirection: 'row',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  day: { width: 100, fontFamily: fonts.semiBold, fontSize: 15, color: colors.text },
  hours: { flex: 1, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.text },
  footerOuter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  footer: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16 },
});
