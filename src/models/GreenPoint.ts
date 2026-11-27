import type { DeviceCategory, DeviceIntakePolicy } from './DeviceCategory';

export interface Coordinates {
  latitude: number;
  longitude: number;
}
export interface PointSchedule {
  weekday: number;
  opensMinute: number;
  closesMinute: number;
}
export interface GreenPoint extends Coordinates {
  demo?: boolean;
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  address: string;
  phone: string | null;
  description: string | null;
  timeZone: string;
  pickupEnabled: boolean;
  categories: DeviceCategory[];
  intakeConfirmed: boolean;
  intakePolicies: DeviceIntakePolicy[];
  schedules: PointSchedule[];
}
export type OpeningStatus = 'open' | 'closed' | 'unknown';

export function isExamplePointId(id: string): boolean {
  return id.startsWith('example-');
}

export function canRegisterDelivery(point: GreenPoint): boolean {
  return !point.demo && !isExamplePointId(point.id);
}

export function openingStatus(
  point: Pick<GreenPoint, 'schedules' | 'timeZone'>,
  now = new Date()
): OpeningStatus {
  if (!point.schedules.length) return 'unknown';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: point.timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(part('weekday')) + 1;
    const minute = Number(part('hour')) * 60 + Number(part('minute'));
    const yesterday = weekday === 1 ? 7 : weekday - 1;
    return point.schedules.some(
      (s) =>
        (s.weekday === weekday && minute >= s.opensMinute && minute < s.closesMinute) ||
        (s.weekday === yesterday && s.closesMinute > 1440 && minute < s.closesMinute - 1440)
    )
      ? 'open'
      : 'closed';
  } catch {
    return 'unknown';
  }
}

export function distanceKm(from: Coordinates, to: Coordinates): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const a =
    Math.sin(radians(to.latitude - from.latitude) / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(radians(to.longitude - from.longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export function formatDistance(km: number): string {
  return km < 1
    ? `${Math.round(km * 1000)} m`
    : `${km.toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;
}
export function formatScheduleMinute(minute: number): string {
  const clock = minute % 1440;
  return `${String(Math.floor(clock / 60)).padStart(2, '0')}:${String(clock % 60).padStart(2, '0')}${minute >= 1440 ? ' (+1 día)' : ''}`;
}
export const weekdayNames = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
export function getAcceptedCategories(
  point: Pick<GreenPoint, 'categories' | 'intakePolicies'>
): DeviceCategory[] {
  const rejectedIds = new Set(
    (point.intakePolicies ?? [])
      .filter((policy) => policy.mode === 'not_accepted')
      .map((policy) => policy.categoryId)
  );
  const byId = new Map<string, DeviceCategory>();
  for (const category of point.categories ?? []) {
    if (!rejectedIds.has(category.id)) byId.set(category.id, category);
  }
  for (const policy of point.intakePolicies ?? []) {
    if (policy.mode !== 'not_accepted' && policy.category) {
      byId.set(policy.category.id, policy.category);
    }
  }
  return [...byId.values()];
}

const CATEGORY_SEARCH_RULES: readonly [RegExp, readonly string[]][] = [
  [
    /\b(notebook|notebooks|laptop|laptops|netbook|netbooks)\b/i,
    ['laptop', 'netbook', 'portatil', 'macbook', 'compu'],
  ],
  [
    /\b(pc|computadora|computadoras|computador|computadores|desktop|cpu)\b/i,
    ['pc', 'compu', 'escritorio', 'desktop', 'gabinete', 'torre', 'teclado', 'mouse'],
  ],
  [/\b(monitor|monitores)\b/i, ['monitor', 'pantalla', 'lcd', 'led']],
  [
    /\b(televisor|televisores|tv)\b/i,
    ['tv', 'tele', 'televisor', 'televisores', 'smart tv', 'pantalla'],
  ],
  [
    /\b(celular|celulares|telefono|telefonos|teléfono|teléfonos|smartphone|smartphones|movil|moviles|móvil|móviles)\b/i,
    ['celu', 'celus', 'telefono', 'telefonos', 'smartphone', 'movil', 'iphone', 'android'],
  ],
  [/\b(tablet|tablets|ipad|ipads|e-reader|ereader)\b/i, ['tablet', 'ipad', 'ereader', 'kindle']],
  [
    /\b(electrodomestico|electrodomesticos|electrodoméstico|electrodomésticos|pequenos|pequeños|hogar|microondas|licuadora|cafetera)\b/i,
    [
      'electrodomestico',
      'microondas',
      'licuadora',
      'cafetera',
      'pava',
      'tostadora',
      'plancha',
      'aspiradora',
      'ventilador',
      'secador',
    ],
  ],
  [
    /\b(audio|sonido|auricular|auriculares|parlante|parlantes|microfono|micrófono)\b/i,
    ['auris', 'auricular', 'audio', 'parlante', 'headset', 'airpods'],
  ],
  [
    /\b(consola|consolas|videojuego|videojuegos|joystick|joysticks|playstation|xbox|nintendo)\b/i,
    ['play', 'playstation', 'xbox', 'nintendo', 'switch', 'joystick', 'videojuego'],
  ],
  [
    /\b(impresora|impresoras|scanner|scanners|escaner|escáner|toner)\b/i,
    ['impresora', 'escaner', 'scanner', 'multifuncion', 'toner', 'cartucho'],
  ],
  [
    /\b(cargador|cargadores|adaptador|adaptadores)\b/i,
    ['cargador', 'fuente', 'transformador', 'adaptador', 'usb'],
  ],
  [
    /\b(cable|cables|enchufe|zapatilla)\b/i,
    ['cable', 'enchufe', 'alargue', 'zapatilla', 'hdmi', 'usb'],
  ],
];

/**
 * Returns common everyday search aliases for a device category so citizens
 * can find green points without guessing exact catalog labels.
 */
export function getDeviceCategorySearchTerms(
  category: Pick<DeviceCategory, 'name' | 'slug'>
): string[] {
  const target = normalize(`${category.slug ?? ''} ${category.name ?? ''}`);
  for (const [pattern, aliases] of CATEGORY_SEARCH_RULES) {
    if (pattern.test(target)) return [...aliases];
  }
  return [];
}

function matchesCategoryAlias(category: DeviceCategory, normalizedQuery: string): boolean {
  if (!normalizedQuery) return false;
  const queryWords = normalizedQuery.split(/\s+/);
  return getDeviceCategorySearchTerms(category).some((rawAlias) => {
    const alias = normalize(rawAlias);
    return (
      alias === normalizedQuery ||
      queryWords.includes(alias) ||
      (alias.length >= 5 && normalizedQuery.startsWith(alias)) ||
      (normalizedQuery.length >= 5 && alias.startsWith(normalizedQuery))
    );
  });
}

export interface DiscoveryFilters {
  search?: string;
  categoryId?: string;
  categoryIds?: string[];
  companyId?: string;
  openOnly?: boolean;
  pickupOnly?: boolean;
  nearbyOnly?: boolean;
}
export function filterGreenPoints(
  points: GreenPoint[],
  filters: DiscoveryFilters,
  location: Coordinates | null,
  now = new Date()
): GreenPoint[] {
  const query = normalize(filters.search ?? '');
  const categoryIds = filters.categoryIds?.length
    ? filters.categoryIds
    : filters.categoryId
      ? [filters.categoryId]
      : [];
  return points
    .filter((p) => {
      const accepted = getAcceptedCategories(p);
      const baseText = normalize(
        `${p.name} ${p.address} ${p.companyName} ${accepted.map((c) => c.name).join(' ')}`
      );
      const matchesSearch =
        !query ||
        baseText.includes(query) ||
        accepted.some((category) => matchesCategoryAlias(category, query));
      const matchesCategories =
        !categoryIds.length ||
        categoryIds.some((categoryId) => {
          const rejected = (p.intakePolicies ?? []).some(
            (policy) => policy.categoryId === categoryId && policy.mode === 'not_accepted'
          );
          if (rejected) return false;
          return (
            accepted.some((category) => category.id === categoryId) ||
            (p.intakePolicies ?? []).some(
              (policy) => policy.categoryId === categoryId && policy.mode !== 'not_accepted'
            )
          );
        });
      return (
        matchesSearch &&
        matchesCategories &&
        (!filters.companyId || p.companyId === filters.companyId) &&
        (!filters.openOnly || openingStatus(p, now) === 'open') &&
        (!filters.pickupOnly || p.pickupEnabled) &&
        (!filters.nearbyOnly || (location !== null && distanceKm(location, p) <= 10))
      );
    })
    .sort((a, b) =>
      location
        ? distanceKm(location, a) - distanceKm(location, b) || a.name.localeCompare(b.name, 'es')
        : a.name.localeCompare(b.name, 'es')
    );
}
