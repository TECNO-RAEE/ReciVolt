import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import './leaflet.web.css';
import type { CategoryGroupKey } from '@/models/DeviceCategory';
import { dominantGroupKey } from '@/models/DeviceCategory';
import { cellDegreesForZoom, clusterPoints } from '@/models/PointCluster';
import { fonts, useColors, useTheme, type ThemeColors } from '@/theme';
import type { PointsMapProps } from './PointsMap.types';

type Leaflet = typeof import('leaflet');
type LeafletMap = import('leaflet').Map;

const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816];
const LOCATION_ZOOM = 14;

/** Glifos 24x24 (Material Design Icons) para cada grupo de categorías. */
const GLYPHS: Record<CategoryGroupKey, string> = {
  especiales:
    'M16.67 4H15V2H9v2H7.33C6.6 4 6 4.6 6 5.33v15.33C6 21.4 6.6 22 7.33 22h9.34c.73 0 1.33-.6 1.33-1.33V5.33C18 4.6 17.4 4 16.67 4z',
  informatica:
    'M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z',
  electrodomesticos:
    'M5 2h14a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm7 6.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM7 4.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  insumos: 'M16 7V3h-2v4h-4V3H8v4H6v7l3 3v4h6v-4l3-3V7h-2z',
  herramientas:
    'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z',
  juguetes:
    'M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  otros:
    'M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z',
};

function pinHtml(kind: CategoryGroupKey, selected: boolean, colors: ThemeColors) {
  const size = selected ? 46 : 38;
  const bg = selected ? colors.primaryDark : colors.primary;
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:${selected ? 3 : 2.5}px solid ${colors.surface};box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;box-sizing:border-box"><svg width="${selected ? 24 : 20}" height="${selected ? 24 : 20}" viewBox="0 0 24 24" aria-hidden="true"><path fill="${colors.textOnPrimary}" fill-rule="evenodd" d="${GLYPHS[kind]}"/></svg></div>`;
}

function clusterHtml(count: number, colors: ThemeColors) {
  return `<div style="width:54px;height:54px;border-radius:50%;background:${colors.primarySoft};display:flex;align-items:center;justify-content:center;opacity:.95"><div style="width:42px;height:42px;border-radius:50%;background:${colors.primary};border:2.5px solid ${colors.surface};display:flex;align-items:center;justify-content:center;box-sizing:border-box;color:${colors.textOnPrimary};font:700 15px ${fonts.bold},Roboto,sans-serif">${count > 99 ? '99+' : count}</div></div>`;
}

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
  const { scheme } = useTheme();
  const element = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [view, setView] = useState<{ L: Leaflet; map: LeafletMap } | null>(null);
  const [zoom, setZoom] = useState(11);
  // onSelect se llama desde listeners de Leaflet; una ref evita reconstruir el mapa
  // cuando el padre pasa una nueva identidad de función.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // 1) El mapa se crea una sola vez: filtros, zoom y selección no lo reinician.
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void import('leaflet')
      .then((module) => {
        if (cancelled || !element.current) return;
        const L = ((module as { default?: Leaflet }).default ?? module) as Leaflet;
        setError(false);
        const map = L.map(element.current, {
          zoomControl: !preview,
          dragging: !preview,
          scrollWheelZoom: false,
          doubleClickZoom: !preview,
          touchZoom: !preview,
          boxZoom: !preview,
        });
        map.setView(DEFAULT_CENTER, 11);
        const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        tiles.on('tileerror', () => {
          if (!cancelled) setError(true);
        });
        map.on('zoomend', () => setZoom(map.getZoom()));
        const observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(element.current);
        setView({ L, map });
        dispose = () => {
          observer.disconnect();
          map.remove();
          setView(null);
        };
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [preview]);

  const items = useMemo(
    () => clusterPoints(points, preview ? 0 : cellDegreesForZoom(zoom)),
    [points, zoom, preview]
  );

  // 2) Pines y clusters: se redibujan al cambiar puntos, zoom, selección o tema.
  useEffect(() => {
    if (!view) return;
    const { L, map } = view;
    const layer = L.layerGroup().addTo(map);
    items.forEach((entry) => {
      if (entry.kind === 'cluster') {
        const marker = L.marker([entry.latitude, entry.longitude], {
          icon: L.divIcon({
            className: '',
            html: clusterHtml(entry.count, colors),
            iconSize: [54, 54],
            iconAnchor: [27, 27],
          }),
          title: `${entry.count} puntos verdes agrupados`,
          alt: `${entry.count} puntos verdes agrupados. Tocá para acercar`,
        });
        marker.on('click', () => {
          const bounds = L.latLngBounds(entry.items.map((p) => [p.latitude, p.longitude]));
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
        });
        marker.addTo(layer);
        return;
      }
      const point = entry.item;
      const selected = point.id === selectedId;
      const size = selected ? 46 : 38;
      const title = `${point.name}${point.demo ? ' · Punto verde de ejemplo' : ''}`;
      const label = document.createElement('span');
      label.textContent = point.demo ? title : `${title} · ${point.companyName}`;
      const marker = L.marker([point.latitude, point.longitude], {
        icon: L.divIcon({
          className: '',
          html: pinHtml(dominantGroupKey(point.categories ?? []), selected, colors),
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        }),
        title,
        alt: title,
        zIndexOffset: selected ? 1000 : 0,
      }).bindTooltip(label);
      marker.on('add', () => marker.getElement()?.setAttribute('aria-label', `Ver ${title}`));
      marker.on('click', () => onSelectRef.current(point));
      marker.addTo(layer);
    });
    if (location) {
      L.circleMarker([location.latitude, location.longitude], {
        radius: 7,
        color: colors.surface,
        weight: 2,
        fillColor: colors.accent,
        fillOpacity: 1,
      })
        .addTo(layer)
        .bindTooltip('Tu ubicación');
    }
    return () => {
      layer.remove();
    };
  }, [view, items, selectedId, location, colors]);

  // 3) Encuadre: al cambiar los puntos se muestran todos...
  useEffect(() => {
    if (!view) return;
    const bounds = points.map((p): [number, number] => [p.latitude, p.longitude]);
    if (bounds.length) view.map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
    // La ubicación se maneja en el efecto siguiente.
  }, [view, points]);

  // ...y al conocer la ubicación del usuario se centra el mapa en ella.
  const lat = location?.latitude;
  const lng = location?.longitude;
  useEffect(() => {
    if (!view || preview || lat === undefined || lng === undefined) return;
    view.map.setView([lat, lng], LOCATION_ZOOM, { animate: true });
  }, [view, lat, lng, preview]);

  return (
    <View style={fill ? { flex: 1, gap: 8 } : { gap: 8 }}>
      <div
        ref={element}
        className={scheme === 'dark' ? 'rv-map-dark' : undefined}
        aria-label="Mapa de puntos verdes"
        style={{
          height: fill ? '100%' : preview ? 230 : 380,
          width: '100%',
          borderRadius: fill ? 0 : 14,
          overflow: 'hidden',
          zIndex: 0,
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
