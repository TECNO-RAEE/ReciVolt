import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { LEAFLET_CSS, LEAFLET_JS } from './leafletSource';
import type { PointsMapProps } from './PointsMap.types';
import { fonts, useColorSchemeName, useColors } from '@/theme';

const DEFAULT_CENTER: [number, number] = [-34.6037, -58.3816];

// Keep map pins legible over bright OpenStreetMap tiles in both light and dark appearances.
const MAP_PIN_COLORS = {
  normal: '#256D46',
  selected: '#14452B',
  me: '#10282C',
} as const;

// JSON embebido en un <script>: se escapa "<" para que ningún nombre cierre la etiqueta.
const toScriptJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

function buildHtml({
  points,
  location,
  preview,
  selectedId,
  background,
  dark,
}: Pick<PointsMapProps, 'points' | 'location' | 'preview' | 'selectedId'> & {
  background: string;
  dark: boolean;
}) {
  const data = toScriptJson({
    points: points.map((point) => ({
      id: point.id,
      latitude: point.latitude,
      longitude: point.longitude,
      title: `${point.name}${point.demo ? ' · Punto verde de ejemplo' : ''}`,
    })),
    location: location ? [location.latitude, location.longitude] : null,
    preview: Boolean(preview),
    selectedId: selectedId ?? null,
    center: DEFAULT_CENTER,
    colors: MAP_PIN_COLORS,
  });
  const darkTileCss = dark ? '.leaflet-tile-pane{filter:brightness(0.86) contrast(1.06);}' : '';
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>${LEAFLET_CSS}</style>
<style>html,body,#map{height:100%;margin:0;background:${background}}${darkTileCss}</style>
</head><body><div id="map"></div>
<script>${LEAFLET_JS}</script>
<script>
(function () {
  var data = ${data};
  var post = function (message) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  };
  if (!window.L) { post({ type: 'error' }); return; }
  var map = L.map('map', {
    zoomControl: !data.preview,
    dragging: !data.preview,
    doubleClickZoom: !data.preview,
    touchZoom: !data.preview,
    boxZoom: !data.preview,
    attributionControl: true
  });
  var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  tiles.on('tileerror', function () { post({ type: 'error' }); });
  var icon = function (color) {
    return L.divIcon({
      className: '',
      html: '<svg width="26" height="34" viewBox="0 0 26 34"><path fill="' + color + '" stroke="white" stroke-width="2" d="M13 33S1 20 1 13a12 12 0 0 1 24 0c0 7-12 20-12 20Z"/><circle cx="13" cy="13" r="4" fill="white"/></svg>',
      iconSize: [26, 34],
      iconAnchor: [13, 34]
    });
  };
  var normal = icon(data.colors.normal);
  var selected = icon(data.colors.selected);
  var markers = {};
  var bounds = [];
  data.points.forEach(function (point) {
    var coordinate = [point.latitude, point.longitude];
    bounds.push(coordinate);
    var marker = L.marker(coordinate, {
      icon: point.id === data.selectedId ? selected : normal,
      title: point.title,
      alt: point.title
    }).addTo(map);
    marker.on('click', function () { post({ type: 'select', id: point.id }); });
    markers[point.id] = marker;
  });
  if (data.location) {
    bounds.push(data.location);
    L.circleMarker(data.location, {
      radius: 6,
      color: '#ffffff',
      weight: 2,
      fillColor: data.colors.me,
      fillOpacity: 1
    }).addTo(map);
  }
  if (bounds.length) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
  else map.setView(data.center, 11);
  window.setSelected = function (id) {
    Object.keys(markers).forEach(function (key) {
      markers[key].setIcon(key === id ? selected : normal);
    });
  };
})();
true;
</script></body></html>`;
}

// Alternativa sin clave de Google: OpenStreetMap + Leaflet dentro de un WebView.
export function OsmPointsMap({
  points,
  location,
  preview = false,
  previewHeight = 230,
  fill = false,
  selectedId = null,
  onSelect,
}: PointsMapProps) {
  const colors = useColors();
  const dark = useColorSchemeName() === 'dark';
  const webview = useRef<WebView<object>>(null);
  const [error, setError] = useState(false);
  const pointsRef = useRef(points);
  const onSelectRef = useRef(onSelect);
  const selectedIdRef = useRef(selectedId);
  useEffect(() => {
    pointsRef.current = points;
    onSelectRef.current = onSelect;
    selectedIdRef.current = selectedId;
  });
  // El HTML no depende de selectedId: la selección se aplica por inyección para no recargar el mapa.
  const [initialSelectedId] = useState(selectedId);
  const html = useMemo(
    () =>
      buildHtml({
        points,
        location,
        preview,
        selectedId: initialSelectedId,
        background: colors.surfaceSoft,
        dark,
      }),
    [points, location, preview, initialSelectedId, colors.surfaceSoft, dark]
  );
  useEffect(() => {
    webview.current?.injectJavaScript(
      `window.setSelected && window.setSelected(${JSON.stringify(selectedId)}); true;`
    );
  }, [selectedId]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type: string; id?: string };
      if (message.type === 'error') setError(true);
      if (message.type === 'select') {
        const point = pointsRef.current.find((item) => item.id === message.id);
        if (point) onSelectRef.current(point);
      }
    } catch {
      // Mensaje ajeno al mapa: se ignora.
    }
  };

  return (
    <View style={fill ? { flex: 1, gap: 8 } : { gap: 8 }}>
      <View
        accessibilityLabel="Mapa de puntos verdes"
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
        <WebView<object>
          ref={webview}
          source={{ html, baseUrl: 'https://com.ikarus16x.tecnoraeeapp.invalid' }}
          originWhitelist={['*']}
          javaScriptEnabled
          nestedScrollEnabled
          onLoadEnd={() => {
            webview.current?.injectJavaScript(
              `window.setSelected && window.setSelected(${JSON.stringify(selectedIdRef.current)}); true;`
            );
          }}
          onMessage={onMessage}
          onError={() => setError(true)}
          onHttpError={() => setError(true)}
          style={{ flex: 1, backgroundColor: colors.surface }}
        />
      </View>
      {error && (
        <Text style={{ color: colors.text, fontFamily: fonts.regular }}>
          El mapa no está disponible. Podés consultar los puntos en la lista.
        </Text>
      )}
    </View>
  );
}
