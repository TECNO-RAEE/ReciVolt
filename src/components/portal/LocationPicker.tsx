import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { LocationPickerProps } from './LocationPicker.types';
import { useColors } from '@/theme';

export function LocationPicker({ value, onChange, disabled = false }: LocationPickerProps) {
  const colors = useColors();
  const map = useRef<MapView>(null);
  useEffect(() => {
    if (value)
      map.current?.animateToRegion({ ...value, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 200);
  }, [value]);
  return (
    <View style={{ height: 300, borderRadius: 8, overflow: 'hidden' }}>
      <MapView
        ref={map}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: value?.latitude ?? -34.6037,
          longitude: value?.longitude ?? -58.3816,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }}
        onPress={(event) => {
          if (!disabled) onChange(event.nativeEvent.coordinate);
        }}
        onMapReady={() => {
          if (value)
            map.current?.animateToRegion(
              { ...value, latitudeDelta: 0.01, longitudeDelta: 0.01 },
              0
            );
        }}
        scrollEnabled={!disabled}
        zoomEnabled={!disabled}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {value && (
          <Marker
            coordinate={value}
            title="Ubicación del punto verde"
            pinColor={colors.primary}
            draggable={!disabled}
            onDragEnd={(event) => onChange(event.nativeEvent.coordinate)}
          />
        )}
      </MapView>
    </View>
  );
}
