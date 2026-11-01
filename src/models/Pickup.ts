import type { GreenPoint } from './GreenPoint';

export type PickupStatus = 'REQUESTED' | 'COORDINATED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export interface PickupItem {
  categoryId: string;
  categoryName: string;
  declaredQuantity: number;
  confirmedQuantity: number | null;
  pointsSnapshot: number;
}

export interface Pickup {
  id: string;
  userId: string;
  companyId: string;
  pointId: string | null;
  citizenName: string;
  citizenPhone: string | null;
  companyName: string;
  pointName: string | null;
  status: PickupStatus;
  addressStreet: string;
  addressLocality: string;
  addressReference: string;
  notes: string;
  photoPath: string | null;
  code: string;
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  driverName: string | null;
  createdAt: string;
  coordinatedAt: string | null;
  inTransitAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  points: number;
  items: PickupItem[];
}

export const pickupStatusNames: Record<PickupStatus, string> = {
  REQUESTED: 'Por coordinar',
  COORDINATED: 'Coordinado',
  IN_TRANSIT: 'En camino',
  COMPLETED: 'Recibido',
  CANCELLED: 'Cancelado',
};

export function pickupQr(code: string): string {
  return `TECNO-RAEE:PICKUP:${code}`;
}

export function pickupQuantity(value: string): number {
  const normalized = value.trim();
  if (!/^[1-9][0-9]{0,2}$/.test(normalized)) {
    throw new Error('Usá cantidades enteras entre 1 y 999.');
  }
  return Number(normalized);
}

export function pickupTotalUnits(items: PickupItem[]): number {
  return items.reduce((sum, item) => sum + (item.confirmedQuantity ?? item.declaredQuantity), 0);
}

export function pickupEstimate(items: PickupItem[]): { points: number } {
  return items.reduce(
    (total, item) => {
      const quantity = item.confirmedQuantity ?? item.declaredQuantity;
      return {
        points: total.points + quantity * item.pointsSnapshot,
      };
    },
    { points: 0 }
  );
}

export function canRequestPickup(
  point: Pick<GreenPoint, 'id' | 'pickupEnabled' | 'demo'>
): boolean {
  return Boolean(point.pickupEnabled && !point.demo && !point.id.startsWith('example-'));
}

export interface PickupTimelineStep {
  step: number;
  title: string;
  status: 'completed' | 'current' | 'upcoming';
  dateLabel?: string | null;
  subtitle?: string | null;
}

export function formatPickupDate(isoDateString?: string | null): string | null {
  if (!isoDateString) return null;
  try {
    const date = new Date(isoDateString);
    if (isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return null;
  }
}

export function getPickupTimeline(pickup: Pickup): PickupTimelineStep[] {
  const status = pickup.status;

  if (status === 'CANCELLED') {
    return [
      {
        step: 1,
        title: 'Solicitado',
        status: 'completed',
        dateLabel: formatPickupDate(pickup.createdAt),
      },
      {
        step: 2,
        title: 'Cancelado',
        status: 'current',
        dateLabel: formatPickupDate(pickup.cancelledAt ?? pickup.createdAt),
        subtitle: 'La solicitud fue cancelada',
      },
    ];
  }

  // 1. Solicitado
  // 2. Coordinado
  // 3. En camino
  // 4. Recibido
  const step1Status: 'completed' | 'current' = status === 'REQUESTED' ? 'current' : 'completed';
  const step2Status: 'completed' | 'current' | 'upcoming' =
    status === 'REQUESTED'
      ? 'upcoming'
      : status === 'COORDINATED'
        ? 'current'
        : 'completed';
  const step3Status: 'completed' | 'current' | 'upcoming' =
    status === 'REQUESTED' || status === 'COORDINATED'
      ? 'upcoming'
      : status === 'IN_TRANSIT'
        ? 'current'
        : 'completed';
  const step4Status: 'completed' | 'current' | 'upcoming' =
    status === 'COMPLETED' ? 'completed' : 'upcoming';

  const scheduledLabel = pickup.scheduledDate
    ? `Pactado: ${formatPickupDate(pickup.scheduledDate)}${pickup.scheduledTimeSlot ? ` (${pickup.scheduledTimeSlot})` : ''}`
    : formatPickupDate(pickup.coordinatedAt);

  return [
    {
      step: 1,
      title: 'Solicitado',
      status: step1Status,
      dateLabel: formatPickupDate(pickup.createdAt),
      subtitle: status === 'REQUESTED' ? 'Aguardando coordinación con la empresa' : null,
    },
    {
      step: 2,
      title: 'Coordinado',
      status: step2Status,
      dateLabel: scheduledLabel,
      subtitle: pickup.driverName ? `Responsable: ${pickup.driverName}` : null,
    },
    {
      step: 3,
      title: 'En camino',
      status: step3Status,
      dateLabel: formatPickupDate(pickup.inTransitAt),
      subtitle: status === 'IN_TRANSIT' ? 'El vehículo se encuentra en camino' : null,
    },
    {
      step: 4,
      title: 'Recibido',
      status: step4Status,
      dateLabel: formatPickupDate(pickup.completedAt),
      subtitle: status === 'COMPLETED' ? `${pickup.points} puntos acreditados` : null,
    },
  ];
}
