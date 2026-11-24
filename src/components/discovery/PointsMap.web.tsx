import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import './leaflet.web.css';
import type { PointsMapProps } from './PointsMap.types';
import { fonts, useColorSchemeName, useColors } from '@/theme';

// Keep map pins legible over bright OpenStreetMap tiles in both light and dark appearances.
const MAP_PIN_COLORS = {
  normal: '#256D46',
  selected: '#14452B',
  me: '#10282C',
} as const;

// Leaflet touches window on import; load it only after mounting (Expo static rendering).
export function PointsMap({
  points,
  location,
  preview = false,
  fill = false,
  selectedId = null,
  onSelect,
}: PointsMapProps) {
  const colors = useColors();
  const dark = useColorSchemeName() === 'dark';
  const darkRef = useRef(dark);
  const element = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  // onSelect se llama desde un listener de Leaflet creado una sola vez; una ref evita
  // que una nueva identidad de función (inline en el padre) dispare el efecto pesado de abajo.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
    darkRef.current = dark;
  });
  // markers + iconos por id, para que el efecto de selección solo cambie el ícono
  // (marker.setIcon) en vez de reconstruir todo el mapa en cada tap.
  const markersRef = useRef<Map<string, import('leaflet').Marker>>(new Map());
  const iconsRef = useRef<{
    normal: import('leaflet').DivIcon;
    selected: import('leaflet').DivIcon;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void import('leaflet')
      .then((L) => {
        if (cancelled || !element.current) return;
        setError(false);
        const map = L.map(element.current, {
          zoomControl: !preview,
          dragging: !preview,
          scrollWheelZoom: false,
          doubleClickZoom: !preview,
          touchZoom: !preview,
          boxZoom: !preview,
        });
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        const tilePane = map.getPane('tilePane');
        if (tilePane) {
          tilePane.style.filter = darkRef.current ? 'brightness(0.86) contrast(1.06)' : '';
        }
        tiles.on('tileerror', () => {
          if (!cancelled) setError(true);
        });
        const makeIcon = (color: string) =>
          L.divIcon({
            className: '',
            html: `<svg width="26" height="34" viewBox="0 0 26 34" aria-hidden="true"><path fill="${color}" stroke="white" stroke-width="2" d="M13 33S1 20 1 13a12 12 0 0 1 24 0c0 7-12 20-12 20Z"/><circle cx="13" cy="13" r="4" fill="white"/></svg>`,
            iconSize: [26, 34],
            iconAnchor: [13, 34],
          });
        const icon = makeIcon(MAP_PIN_COLORS.normal);
        const selectedIcon = makeIcon(MAP_PIN_COLORS.selected);
        iconsRef.current = { normal: icon, selected: selectedIcon };
        markersRef.current = new Map();
        const bounds: [number, number][] = [];
        points.forEach((point) => {
          const coordinate: [number, number] = [point.latitude, point.longitude];
          bounds.push(coordinate);
          const title = `${point.name}${point.demo ? ' · Punto verde de ejemplo' : ''}`;
          const label = document.createElement('span');
          label.textContent = point.demo ? title : `${title} · ${point.companyName}`;
          const marker = L.marker(coordinate, {
            icon: point.id === selectedId ? selectedIcon : icon,
            title,
            alt: title,
          }).bindTooltip(label);
          marker.on('add', () => {
            marker.getElement()?.setAttribute('aria-label', `Ver ${title}`);
          });
          marker.on('click', () => onSelectRef.current(point));
          marker.addTo(map);
          markersRef.current.set(point.id, marker);
        });
        if (location) {
          const coordinate: [number, number] = [location.latitude, location.longitude];
          bounds.push(coordinate);
          L.circleMarker(coordinate, {
            radius: 6,
            color: '#FFFFFF',
            weight: 2,
            fillColor: MAP_PIN_COLORS.me,
            fillOpacity: 1,
          })
            .addTo(map)
            .bindTooltip('Tu ubicación');
        }
        if (bounds.length) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
        else map.setView([-34.6037, -58.3816], 11);
        const observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(element.current);
        dispose = () => {
          observer.disconnect();
          map.remove();
          markersRef.current = new Map();
          iconsRef.current = null;
        };
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
    // selectedId deliberadamente afuera: lo maneja el efecto de abajo, que solo
    // cambia el ícono del marker correspondiente en vez de recrear el mapa entero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, location, preview]);
  // Dim bright OSM street tiles slightly in Dark Mode without inverting labels or pins.
  useEffect(() => {
    const tilePane = element.current?.querySelector('.leaflet-tile-pane');
    if (tilePane instanceof HTMLElement) {
      tilePane.style.filter = dark ? 'brightness(0.86) contrast(1.06)' : '';
    }
  }, [dark]);
  // Resalta el punto seleccionado sin reconstruir el mapa (evita el parpadeo/reset
  // de zoom y centro que ocurría cuando selectedId estaba en el efecto de arriba).
  useEffect(() => {
    const icons = iconsRef.current;
    if (!icons) return;
    markersRef.current.forEach((marker, id) => {
      marker.setIcon(id === selectedId ? icons.selected : icons.normal);
    });
  }, [selectedId]);
  return (
    <View style={fill ? { flex: 1, gap: 8 } : { gap: 8 }}>
      <div
        ref={element}
        aria-label="Mapa de puntos verdes"
        style={{
          height: fill ? '100%' : preview ? 230 : 380,
          width: '100%',
          borderRadius: fill ? 0 : 14,
          overflow: 'hidden',
          zIndex: 0,
          backgroundColor: colors.surfaceSoft,
        }}
      />
      {error && (
        <Text style={{ color: colors.text, fontFamily: fonts.regular }}>
          El mapa no está disponible. Podés consultar los puntos en la lista.
        </Text>
      )}
    </View>
  );
}
