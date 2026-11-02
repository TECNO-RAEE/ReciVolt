import type { Href } from 'expo-router';
import { effectiveDeliveryStatus, deliveryStatusNames } from '@/models/Delivery';
import { pickupStatusNames } from '@/models/Pickup';
import { getDeliveryHistory } from '@/services/delivery.service';
import { getPickupHistory } from '@/services/pickup.service';
import { getRedemptions } from '@/services/reward.service';

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

export async function getActivityHistoryPage(
  cursor: ActivityPageCursor
): Promise<ActivityPage> {
  const [deliveries, pickups, redemptions] = await Promise.all([
    cursor.deliveries === null ? [] : getDeliveryHistory(null, cursor.deliveries),
    cursor.pickups === null ? [] : getPickupHistory(null, cursor.pickups),
    cursor.redemptions === null ? [] : getRedemptions(cursor.redemptions),
  ]);

  const entries: ActivityEntry[] = [
    ...deliveries.map((delivery) => {
      const status = effectiveDeliveryStatus(delivery);
      return {
        id: `delivery:${delivery.id}`,
        kind: 'DELIVERY' as const,
        title: deliveryStatusNames[status],
        source: delivery.pointName || delivery.companyName,
        detail: delivery.items
          .map((item) => `${item.categoryName} × ${item.confirmedQuantity ?? item.declaredQuantity}`)
          .join(' · '),
        createdAt: status === 'CONFIRMED' ? delivery.confirmedAt ?? delivery.createdAt : delivery.createdAt,
        amount: status === 'CONFIRMED' ? delivery.points : null,
        destination: { pathname: '/delivery/[id]', params: { id: delivery.id } } as const,
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
      destination: { pathname: '/pickup/[id]', params: { id: pickup.id } } as const,
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
      destination: { pathname: '/redemption/[id]', params: { id: redemption.id } } as const,
    })),
  ];

  const next: ActivityPageCursor = {
    deliveries:
      cursor.deliveries !== null && deliveries.length === PAGE_SIZE
        ? cursor.deliveries + 1
        : null,
    pickups:
      cursor.pickups !== null && pickups.length === PAGE_SIZE ? cursor.pickups + 1 : null,
    redemptions:
      cursor.redemptions !== null && redemptions.length === PAGE_SIZE
        ? cursor.redemptions + 1
        : null,
  };

  return {
    entries: sortActivityEntries(entries),
    next,
    hasMore: next.deliveries !== null || next.pickups !== null || next.redemptions !== null,
  };
}

export function sortActivityEntries(entries: ActivityEntry[]): ActivityEntry[] {
  return [...entries].sort((a, b) => {
    const dateOrder = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    return dateOrder || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id);
  });
}
