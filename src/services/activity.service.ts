import type { Href } from 'expo-router';
import { effectiveDeliveryStatus, deliveryStatusNames } from '@/models/Delivery';
import { pickupStatusNames } from '@/models/Pickup';
import { getDeliveryHistory } from '@/services/delivery.service';
import { getPickupHistory } from '@/services/pickup.service';
import { getRedemptions } from '@/services/reward.service';
import { activityDestination, settleActivitySources } from '@/models/ActivitySources';

export type ActivityKind = 'DELIVERY' | 'PICKUP' | 'REDEMPTION';

export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  title: string;
  source: string;
  detail: string;
  createdAt: string;
  amount: number | null;
  destination: Href;
}

const PAGE_SIZE = 30;

export interface ActivityPageCursor {
  deliveries: number | null;
  pickups: number | null;
  redemptions: number | null;
}

export interface ActivityPage {
  entries: ActivityEntry[];
  next: ActivityPageCursor;
  hasMore: boolean;
  errors: Partial<Record<keyof ActivityPageCursor, string>>;
}

function pickupEventDate(pickup: Awaited<ReturnType<typeof getPickupHistory>>[number]) {
  switch (pickup.status) {
    case 'COORDINATED':
      return pickup.coordinatedAt ?? pickup.createdAt;
    case 'IN_TRANSIT':
      return pickup.inTransitAt ?? pickup.coordinatedAt ?? pickup.createdAt;
    case 'COMPLETED':
      return pickup.completedAt ?? pickup.inTransitAt ?? pickup.coordinatedAt ?? pickup.createdAt;
    case 'CANCELLED':
      return pickup.cancelledAt ?? pickup.createdAt;
    default:
      return pickup.createdAt;
  }
}

export async function getActivityHistoryPage(cursor: ActivityPageCursor): Promise<ActivityPage> {
  const settled = await settleActivitySources<{
    deliveries: Awaited<ReturnType<typeof getDeliveryHistory>>;
    pickups: Awaited<ReturnType<typeof getPickupHistory>>;
    redemptions: Awaited<ReturnType<typeof getRedemptions>>;
  }>({
    deliveries:
      cursor.deliveries === null
        ? Promise.resolve([])
        : getDeliveryHistory(null, cursor.deliveries),
    pickups: cursor.pickups === null ? Promise.resolve([]) : getPickupHistory(null, cursor.pickups),
    redemptions:
      cursor.redemptions === null ? Promise.resolve([]) : getRedemptions(cursor.redemptions),
  });
  const deliveries = settled.values.deliveries ?? [];
  const pickups = settled.values.pickups ?? [];
  const redemptions = settled.values.redemptions ?? [];

  const entries: ActivityEntry[] = [
    ...deliveries.map((delivery) => {
      const status = effectiveDeliveryStatus(delivery);
      return {
        id: `delivery:${delivery.id}`,
        kind: 'DELIVERY' as const,
        title: deliveryStatusNames[status],
        source: delivery.pointName || delivery.companyName,
        detail: delivery.items
          .map(
            (item) => `${item.categoryName} × ${item.confirmedQuantity ?? item.declaredQuantity}`
          )
          .join(' · '),
        createdAt:
          status === 'CONFIRMED'
            ? (delivery.confirmedAt ?? delivery.createdAt)
            : delivery.createdAt,
        amount: status === 'CONFIRMED' ? delivery.points : null,
        destination: activityDestination('DELIVERY', delivery.id),
      };
    }),
    ...pickups.map((pickup) => ({
      id: `pickup:${pickup.id}`,
      kind: 'PICKUP' as const,
      title: `Retiro ${pickupStatusNames[pickup.status].toLocaleLowerCase('es-AR')}`,
      source: pickup.companyName,
      detail: pickup.items
        .map((item) => `${item.categoryName} × ${item.confirmedQuantity ?? item.declaredQuantity}`)
        .join(' · '),
      createdAt: pickupEventDate(pickup),
      amount: pickup.status === 'COMPLETED' ? pickup.points : null,
      destination: activityDestination('PICKUP', pickup.id),
    })),
    ...redemptions.map((redemption) => ({
      id: `redemption:${redemption.id}`,
      kind: 'REDEMPTION' as const,
      title: redemption.status === 'REDEEMED' ? 'Premio entregado' : 'Premio reservado',
      source: redemption.reward.businessName,
      detail: redemption.reward.title,
      // Points are charged when the redemption is reserved, not when the reward is delivered.
      createdAt: redemption.createdAt,
      amount: -redemption.pointsCost,
      destination: activityDestination('REDEMPTION', redemption.id),
    })),
  ];

  const next: ActivityPageCursor = {
    deliveries:
      !settled.errors.deliveries && cursor.deliveries !== null && deliveries.length === PAGE_SIZE
        ? cursor.deliveries + 1
        : null,
    pickups:
      !settled.errors.pickups && cursor.pickups !== null && pickups.length === PAGE_SIZE
        ? cursor.pickups + 1
        : null,
    redemptions:
      !settled.errors.redemptions && cursor.redemptions !== null && redemptions.length === PAGE_SIZE
        ? cursor.redemptions + 1
        : null,
  };

  return {
    entries: sortActivityEntries(entries),
    next,
    hasMore: next.deliveries !== null || next.pickups !== null || next.redemptions !== null,
    errors: settled.errors,
  };
}

export function sortActivityEntries(entries: ActivityEntry[]): ActivityEntry[] {
  return [...entries].sort((a, b) => {
    const dateOrder = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    return dateOrder || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id);
  });
}
