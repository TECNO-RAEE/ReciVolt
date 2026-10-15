import { useEffect, useRef, useState } from 'react';
import MapView, { Marker } from 'react-native-maps';
import { View } from 'react-native';
import type { PointsMapProps } from './PointsMap.types';
import { colors } from '@/theme';

export function PointsMap({ points, location, preview = false, onSelect }: PointsMapProps) {
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
    <View style={{ height: preview ? 230 : 380, overflow: 'hidden', borderRadius: 8 }}>
      <MapView
        ref={map}
        style={{ flex: 1 }}
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
            pinColor={colors.primary}
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
