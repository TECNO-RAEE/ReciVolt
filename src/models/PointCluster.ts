export interface ClusterCoordinates {
  latitude: number;
  longitude: number;
}

export type MapItem<T extends ClusterCoordinates> =
  | { kind: 'point'; item: T }
  | {
      kind: 'cluster';
      /** Estable mientras los mismos puntos caigan en la misma celda. */
      id: string;
      count: number;
      latitude: number;
      longitude: number;
      items: T[];
    };

/** Por debajo de ~50 m de radio no se agrupa: dos puntos así de cerca se ven por separado. */
const MIN_CELL_DEGREES = 0.00045;

/** Tamaño de celda (en grados) para un mapa nativo según cuánto cubre la pantalla. */
export function cellDegreesForRegion(longitudeDelta: number, viewportWidthPx = 360, cellPx = 56) {
  if (!(longitudeDelta > 0) || !(viewportWidthPx > 0)) return 0;
  return (longitudeDelta * cellPx) / viewportWidthPx;
}

/** Tamaño de celda (en grados) para un zoom de tiles web (Leaflet/OSM). */
export function cellDegreesForZoom(zoom: number, cellPx = 56) {
  return ((360 / 2 ** zoom) * cellPx) / 256;
}

/**
 * Agrupa puntos cercanos: cada punto se une al cluster más próximo cuyo centro esté a menos de
 * `cellDegrees` (en latitud y longitud); si no hay ninguno, abre uno nuevo. A diferencia de una
 * grilla fija, dos puntos vecinos nunca quedan separados por caer a ambos lados de un borde.
 * Es determinista (ordena por coordenadas e id) y no muta la entrada.
 */
export function clusterPoints<T extends ClusterCoordinates & { id: string }>(
  items: readonly T[],
  cellDegrees: number
): MapItem<T>[] {
  if (!(cellDegrees > MIN_CELL_DEGREES)) return items.map((item) => ({ kind: 'point', item }));
  const sorted = [...items].sort(
    (a, b) =>
      a.latitude - b.latitude || a.longitude - b.longitude || a.id.localeCompare(b.id)
  );
  const groups: { latitude: number; longitude: number; items: T[] }[] = [];
  for (const item of sorted) {
    let target: (typeof groups)[number] | undefined;
    let best = Infinity;
    for (const group of groups) {
      const dLat = Math.abs(group.latitude - item.latitude);
      const dLng = Math.abs(group.longitude - item.longitude);
      if (dLat < cellDegrees && dLng < cellDegrees && dLat + dLng < best) {
        best = dLat + dLng;
        target = group;
      }
    }
    if (!target) {
      groups.push({ latitude: item.latitude, longitude: item.longitude, items: [item] });
      continue;
    }
    target.items.push(item);
    const n = target.items.length;
    target.latitude += (item.latitude - target.latitude) / n;
    target.longitude += (item.longitude - target.longitude) / n;
  }
  return groups.map((group): MapItem<T> => {
    if (group.items.length === 1) return { kind: 'point', item: group.items[0] };
    const ids = group.items.map((i) => i.id).sort();
    return {
      kind: 'cluster',
      id: `cluster:${ids[0]}:${ids.length}`,
      count: group.items.length,
      latitude: group.latitude,
      longitude: group.longitude,
      items: group.items,
    };
  });
}

/** Región mínima que encuadra un cluster al tocarlo (zoom-in). */
export function regionForCluster(items: readonly ClusterCoordinates[], padding = 1.6) {
  const lats = items.map((p) => p.latitude);
  const lngs = items.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * padding, 0.004),
    longitudeDelta: Math.max((maxLng - minLng) * padding, 0.004),
  };
}
