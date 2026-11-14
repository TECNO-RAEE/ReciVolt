import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { Map, Marker } from 'leaflet';
import type { LocationPickerProps } from './LocationPicker.types';
import { useColors, useThemedStyles } from '@/theme';
import { makePortalStyles } from './PortalUI';
import '../discovery/leaflet.web.css';

export function LocationPicker({ value, onChange, disabled = false }: LocationPickerProps) {
  const colors = useColors();
  const s = useThemedStyles(makePortalStyles);
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const marker = useRef<Marker | null>(null);
  const current = useRef({ value, onChange, disabled });
  useEffect(() => {
    current.current = { value, onChange, disabled };
  }, [value, onChange, disabled]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void import('leaflet')
      .then((L) => {
        if (cancelled || !element.current) return;
        const start = current.current.value;
        const instance = L.map(element.current, { scrollWheelZoom: false }).setView(
          start ? [start.latitude, start.longitude] : [-34.6037, -58.3816],
          start ? 16 : 11
        );
        map.current = instance;
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        })
          .addTo(instance)
          .on('tileerror', () => {
            if (!cancelled) setError(true);
          });
        instance.on('click', (event) => {
          if (!current.current.disabled)
            current.current.onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
        });
        const observer = new ResizeObserver(() => instance.invalidateSize());
        observer.observe(element.current);
        setReady(true);
        dispose = () => {
          observer.disconnect();
          instance.remove();
          map.current = null;
          marker.current = null;
        };
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    if (!ready || !map.current) return;
    if (!value) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    void import('leaflet').then((L) => {
      if (cancelled || !map.current) return;
      const latlng: [number, number] = [value.latitude, value.longitude];
      if (marker.current) marker.current.setLatLng(latlng);
      else {
        const icon = L.divIcon({
          className: '',
          html: `<svg width="28" height="36" viewBox="0 0 28 36" aria-hidden="true"><path fill="${colors.primary}" stroke="white" stroke-width="2" d="M14 35S1 22 1 14a13 13 0 0 1 26 0c0 8-13 21-13 21Z"/><circle cx="14" cy="14" r="4" fill="white"/></svg>`,
          iconSize: [28, 36],
          iconAnchor: [14, 36],
        });
        marker.current = L.marker(latlng, {
          icon,
          title: 'Ubicación del punto verde',
          draggable: !disabled,
        }).addTo(map.current);
        marker.current.on('dragend', () => {
          const position = marker.current?.getLatLng();
          if (position && !current.current.disabled)
            current.current.onChange({ latitude: position.lat, longitude: position.lng });
        });
      }
      if (disabled) marker.current.dragging?.disable();
      else marker.current.dragging?.enable();
      map.current.setView(latlng, Math.max(15, map.current.getZoom()));
    });
    return () => {
      cancelled = true;
    };
  }, [ready, value, disabled, colors.primary]);
  return (
    <View style={{ gap: 8 }}>
      <div
        ref={element}
        aria-label="Elegir ubicación del punto verde"
        style={{
          height: 300,
          width: '100%',
          borderRadius: 8,
          overflow: 'hidden',
          zIndex: 0,
          opacity: disabled ? 0.65 : 1,
        }}
      />
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          No pudimos cargar el mapa. Podés ingresar las coordenadas manualmente.
        </Text>
      )}
    </View>
  );
}
