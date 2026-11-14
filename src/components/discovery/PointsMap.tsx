import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { dominantGroupKey } from '@/models/DeviceCategory';
import { cellDegreesForRegion, clusterPoints, regionForCluster } from '@/models/PointCluster';
import { useColors, useTheme } from '@/theme';
import { ClusterPin, PointPin } from './PointPin';
import { darkMapStyle } from './mapDarkStyle';
import type { PointsMapProps } from './PointsMap.types';

/** Zoom al que se acerca el mapa al centrarse en la ubicación del usuario (~5 km de ancho). */
const LOCATION_DELTA = 0.05;
const INITIAL_DELTA = 0.12;

export function PointsMap({
  points,
  location,
  preview = false,
  fill = false,
  selectedId = null,
  onSelect,
}: PointsMapProps) {
  const colors = useColors();
  const { scheme } = useTheme();
  const { width } = useWindowDimensions();
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [longitudeDelta, setLongitudeDelta] = useState(INITIAL_DELTA);

  // Encuadra los puntos visibles cuando cambian (filtros, recarga).
  useEffect(() => {
    if (!ready) return;
    const coordinates = [...points, ...(location ? [location] : [])];
    if (coordinates.length)
      map.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: false,
      });
    // La ubicación se maneja en el efecto de abajo; no debe re-encuadrar todo al llegar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, ready]);

  // Al obtener (o actualizar) la ubicación, centra el mapa en la persona.
  const lat = location?.latitude;
  const lng = location?.longitude;
  useEffect(() => {
    if (!ready || preview || lat === undefined || lng === undefined) return;
    map.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: LOCATION_DELTA, longitudeDelta: LOCATION_DELTA },
      600
    );
  }, [lat, lng, ready, preview]);

  const items = useMemo(
    () => clusterPoints(points, preview ? 0 : cellDegreesForRegion(longitudeDelta, width)),
    [points, longitudeDelta, width, preview]
  );

  const handleRegion = useCallback((region: Region) => {
    setLongitudeDelta((current) =>
      Math.abs(current - region.longitudeDelta) / current > 0.08 ? region.longitudeDelta : current
    );
  }, []);

  return (
    <View
      style={
        fill
          ? { flex: 1, overflow: 'hidden' }
          : { height: preview ? 230 : 380, overflow: 'hidden', borderRadius: 8 }
      }
    >
      <MapView
        ref={map}
        style={{ flex: 1 }}
        onMapReady={() => setReady(true)}
        onRegionChangeComplete={handleRegion}
        userInterfaceStyle={scheme}
        customMapStyle={scheme === 'dark' ? darkMapStyle : undefined}
        initialRegion={{
          latitude: location?.latitude ?? -34.6037,
          longitude: location?.longitude ?? -58.3816,
          latitudeDelta: INITIAL_DELTA,
          longitudeDelta: INITIAL_DELTA,
        }}
        scrollEnabled={!preview}
        zoomEnabled={!preview}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {items.map((entry) =>
          entry.kind === 'cluster' ? (
            <ClusterPin
              key={entry.id}
              coordinate={entry}
              count={entry.count}
              onPress={() => map.current?.animateToRegion(regionForCluster(entry.items), 350)}
            />
          ) : (
            <PointPin
              key={entry.item.id}
              coordinate={entry.item}
              kind={dominantGroupKey(entry.item.categories ?? [])}
              selected={entry.item.id === selectedId}
              label={`Ver ${entry.item.name}${entry.item.demo ? ', punto verde de ejemplo' : ''}`}
              onPress={() => onSelect(entry.item)}
            />
          )
        )}
        {location && (
          <Marker coordinate={location} title="Tu ubicación" pinColor={colors.brandDark} />
        )}
      </MapView>
    </View>
  );
}
