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
export interface DiscoveryFilters {
  search?: string;
  categoryId?: string;
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
  return points
    .filter(
      (p) =>
        (!query ||
          normalize(
            `${p.name} ${p.address} ${p.companyName} ${(p.categories ?? []).map((c) => c.name).join(' ')} ${(p.intakePolicies ?? [])
              .filter((policy) => policy.mode !== 'not_accepted')
              .map((policy) => policy.category?.name ?? '')
              .join(' ')}`
          ).includes(query)) &&
        (!filters.categoryId ||
          (p.categories ?? []).some((c) => c.id === filters.categoryId) ||
          (p.intakePolicies ?? []).some(
            (policy) => policy.categoryId === filters.categoryId && policy.mode !== 'not_accepted'
          )) &&
        (!filters.companyId || p.companyId === filters.companyId) &&
        (!filters.openOnly || openingStatus(p, now) === 'open') &&
        (!filters.pickupOnly || p.pickupEnabled) &&
        (!filters.nearbyOnly || (location !== null && distanceKm(location, p) <= 10))
    )
    .sort((a, b) =>
      location
        ? distanceKm(location, a) - distanceKm(location, b) || a.name.localeCompare(b.name, 'es')
        : a.name.localeCompare(b.name, 'es')
    );
}
