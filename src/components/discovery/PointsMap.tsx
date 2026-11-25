import { useEffect, useRef, useState } from 'react';
import MapView, { Marker } from 'react-native-maps';
import { Platform, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { PointsMapProps } from './PointsMap.types';
import { OsmPointsMap } from './OsmPointsMap';
import { useColorSchemeName, useColors } from '@/theme';

// Sin clave de Google Maps, MapView aborta la app en Android (fuera de Expo Go).
const googleMapsAvailable =
  Platform.OS !== 'android' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  Constants.expoConfig?.extra?.hasGoogleMapsKey === true;

export function PointsMap(props: PointsMapProps) {
  return googleMapsAvailable ? <NativePointsMap {...props} /> : <OsmPointsMap {...props} />;
}

function NativePointsMap({
  points,
  location,
  preview = false,
  previewHeight = 230,
  fill = false,
  selectedId = null,
  onSelect,
}: PointsMapProps) {
  const colors = useColors();
  const scheme = useColorSchemeName();
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const coordinates = [...points, ...(location ? [location] : [])];
    if (coordinates.length)
      map.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: false,
      });
  }, [points, location, ready]);
  return (
    <View
      style={
        fill
          ? { flex: 1, overflow: 'hidden', backgroundColor: colors.surfaceSoft }
          : {
              height: preview ? previewHeight : 380,
              overflow: 'hidden',
              borderRadius: 12,
              backgroundColor: colors.surfaceSoft,
            }
      }
    >
      <MapView
        ref={map}
        style={{ flex: 1 }}
        userInterfaceStyle={scheme}
        onMapReady={() => setReady(true)}
        initialRegion={{
          latitude: location?.latitude ?? -34.6037,
          longitude: location?.longitude ?? -58.3816,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }}
        scrollEnabled={!preview}
        zoomEnabled={!preview}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {points.map((point) => (
          <Marker
            key={point.id}
            coordinate={point}
            title={point.name}
            description={point.demo ? 'Punto verde de ejemplo' : point.companyName}
            accessibilityLabel={`Ver ${point.name}${point.demo ? ', punto verde de ejemplo' : ''}`}
            pinColor={point.id === selectedId ? colors.primaryDark : colors.primary}
            onPress={() => onSelect(point)}
          />
        ))}
        {location && (
          <Marker coordinate={location} title="Tu ubicación" pinColor={colors.brandDark} />
        )}
      </MapView>
    </View>
  );
}
