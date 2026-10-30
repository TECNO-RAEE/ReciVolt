import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { PointsMap } from '@/components/discovery/PointsMap';
import type { GreenPoint } from '@/models/GreenPoint';
import type { Reward } from '@/models/Reward';
import { colors } from '@/theme';
import { rewardStyles as s } from './RewardsUI';
export function RewardLocation({
  reward,
  showMap = false,
}: Readonly<{ reward: Reward; showMap?: boolean }>) {
  const [error, setError] = useState<string | null>(null);
  const points = useMemo<GreenPoint[]>(
    () =>
      reward.latitude != null && reward.longitude != null
        ? [
            {
              id: reward.id,
              companyId: reward.companyId,
              companyName: reward.businessName,
              name: reward.businessName,
              address: reward.address,
              latitude: reward.latitude,
              longitude: reward.longitude,
              phone: null,
              description: null,
              timeZone: 'America/Argentina/Buenos_Aires',
              pickupEnabled: false,
              categories: [],
              intakeConfirmed: false,
              intakePolicies: [],
              schedules: [],
            },
          ]
        : [],
    [reward]
  );
  const openMap = useCallback(() => {
    const query =
      reward.latitude != null && reward.longitude != null
        ? `${reward.latitude},${reward.longitude}`
        : reward.address;
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    ).catch(() => setError('No pudimos abrir el mapa. Intentá nuevamente.'));
  }, [reward]);
  if (!reward.address) return null;
  return (
    <View style={s.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Abrir en mapa: ${reward.address}`}
        onPress={openMap}
        style={[s.row, { minHeight: 48 }]}
      >
        <Ionicons name="location" size={27} color={colors.primaryDark} />
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Dirección</Text>
          <Text style={s.body}>{reward.address}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.text} />
      </Pressable>
      {showMap && points.length > 0 && <PointsMap points={points} preview onSelect={openMap} />}
      {!!reward.hours && (
        <View style={s.row}>
          <Ionicons name="time-outline" size={27} color={colors.primaryDark} />
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Horarios</Text>
            <Text style={s.body}>{reward.hours}</Text>
          </View>
        </View>
      )}
      {error && (
        <Text accessibilityRole="alert" style={s.body}>
          {error}
        </Text>
      )}
    </View>
  );
}
