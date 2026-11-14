import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { CATEGORY_GROUP_ICONS, type CategoryGroupKey } from '@/models/DeviceCategory';
import type { Coordinates } from '@/models/GreenPoint';
import { fonts, useColors, useThemedStyles, type ThemeColors } from '@/theme';

/**
 * Marker con contenido propio. `tracksViewChanges` queda activo sólo un instante tras cada
 * cambio visual: mantenerlo siempre encendido penaliza el rendimiento del mapa en Android.
 */
function CustomMarker({
  coordinate,
  visualKey,
  label,
  onPress,
  children,
}: Readonly<{
  coordinate: Coordinates;
  visualKey: string;
  label: string;
  onPress: () => void;
  children: ReactNode;
}>) {
  // Mientras `settledKey` no coincide con el aspecto actual, el marker sigue "dibujándose".
  const [settledKey, setSettledKey] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSettledKey(visualKey), 450);
    return () => clearTimeout(timer);
  }, [visualKey]);
  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={settledKey !== visualKey}
      accessibilityLabel={label}
      onPress={onPress}
    >
      {children}
    </Marker>
  );
}

export function PointPin({
  coordinate,
  kind,
  selected,
  label,
  onPress,
}: Readonly<{
  coordinate: Coordinates;
  kind: CategoryGroupKey;
  selected: boolean;
  label: string;
  onPress: () => void;
}>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <CustomMarker
      coordinate={coordinate}
      visualKey={`${kind}:${selected}:${colors.primary}`}
      label={label}
      onPress={onPress}
    >
      <View style={[styles.pin, selected && styles.pinSelected]}>
        <MaterialCommunityIcons
          name={CATEGORY_GROUP_ICONS[kind]}
          size={selected ? 24 : 20}
          color={colors.textOnPrimary}
        />
      </View>
    </CustomMarker>
  );
}

export function ClusterPin({
  coordinate,
  count,
  onPress,
}: Readonly<{ coordinate: Coordinates; count: number; onPress: () => void }>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  return (
    <CustomMarker
      coordinate={coordinate}
      visualKey={`cluster:${count}:${colors.primary}`}
      label={`${count} puntos verdes agrupados. Tocá para acercar`}
      onPress={onPress}
    >
      <View style={styles.clusterHalo}>
        <View style={styles.cluster}>
          <Text style={styles.clusterText}>{count > 99 ? '99+' : count}</Text>
        </View>
      </View>
    </CustomMarker>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    pin: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primary,
      borderWidth: 2.5,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinSelected: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.primaryDark,
      borderWidth: 3,
    },
    clusterHalo: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.95,
    },
    cluster: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primary,
      borderWidth: 2.5,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clusterText: { fontFamily: fonts.bold, fontSize: 15, color: colors.textOnPrimary },
  });
