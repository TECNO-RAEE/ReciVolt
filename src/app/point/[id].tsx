import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActionButton } from '@/components/ui/ActionButton';
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
import { useAuth } from '@/providers/AuthProvider';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import { colors, fonts } from '@/theme';
import { useScrollReset } from '@/hooks/useScrollReset';

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
  return (
    <View style={styles.container}>
      <ScreenHeader title="Detalle del punto" back="/green-points" />
      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
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
            <Text style={styles.sectionTitle}>Qué recibe este punto</Text>
            {point.categories.length ? (
              point.categories.map((c) => (
                <Text style={styles.text} key={c.id}>
                  {c.name}
                </Text>
              ))
            ) : (
              <Text style={styles.text}>
                El punto todavía no informó sus categorías. Consultá antes de acercarte.
              </Text>
            )}
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
                {point.pickupEnabled
                  ? 'Esta organización ofrece retiros desde este punto.'
                  : 'Este punto recibe entregas presenciales.'}
              </Text>
            )}
            {!canRegisterDelivery(point) ? (
              <ActionButton
                title="Ver otros puntos verdes"
                secondary
                onPress={() => router.replace('/green-points')}
              />
            ) : guest ? (
              <ActionButton title="Registrar una entrega" onPress={() => setNeedsAccount(true)} />
            ) : (
              <ActionButton
                title="Registrar una entrega"
                onPress={() =>
                  router.push({ pathname: '/new-delivery', params: { pointId: point.id } })
                }
              />
            )}
          </>
        )}
      </ScrollView>
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
  heading: { gap: 8 },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.primary },
  company: { fontFamily: fonts.semiBold, fontSize: 18, color: colors.text },
  text: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.text },
  status: { fontFamily: fonts.semiBold, color: colors.primary, fontSize: 16 },
  sectionTitle: { fontFamily: fonts.semiBold, fontSize: 20, color: colors.text, marginTop: 8 },
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
});
