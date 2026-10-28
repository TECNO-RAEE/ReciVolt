export type DeliveryStatus = 'PENDING_RECEPTION' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
export interface DeliveryItem {
  categoryId: string;
  categoryName: string;
  declaredQuantity: number;
  confirmedQuantity: number | null;
  pointsSnapshot: number;
}
export interface Delivery {
  id: string;
  userId: string;
  companyId: string;
  pointId: string;
  citizenName: string;
  companyName: string;
  pointName: string;
  status: DeliveryStatus;
  code: string;
  notes: string;
  photoPath: string | null;
  expiresAt: string;
  createdAt: string;
  confirmedAt: string | null;
  points: number;
  items: DeliveryItem[];
}
export interface DeliveryBalance {
  points: number;
  companies: { id: string; name: string; points: number }[];
}
export const deliveryStatusNames: Record<DeliveryStatus, string> = {
  PENDING_RECEPTION: 'Pendiente de recepción',
  CONFIRMED: 'Entrega confirmada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Código vencido',
};
export function effectiveDeliveryStatus(
  delivery: Pick<Delivery, 'status' | 'expiresAt'>,
  now = Date.now()
): DeliveryStatus {
  return delivery.status === 'PENDING_RECEPTION' && Date.parse(delivery.expiresAt) <= now
    ? 'EXPIRED'
    : delivery.status;
}
export function deliveryQr(code: string) {
  // Protocolo estable: conservar este prefijo aunque cambie el nombre comercial.
  return `TECNO-RAEE:DELIVERY:${code}`;
}
export function parseOperationCode(value: string): {
  type: 'DELIVERY' | 'PICKUP' | 'REWARD';
  code: string;
} {
  const normalized = value.trim().toUpperCase();
  const match =
    /^(?:(?:TECNO-RAEE|ECO-RAEE|RECIVOLT):(DELIVERY|PICKUP|REWARD):)?(TRR?-[A-F0-9]{8}(?:-[A-F0-9]{8}){3})$/.exec(
      normalized
    );
  if (!match) throw new Error('Ingresá o escaneá un código válido.');
  const type = match[1] ?? (match[2].startsWith('TRR-') ? 'REWARD' : 'DELIVERY');
  if (match[2].startsWith('TRR-') && type !== 'REWARD')
    throw new Error('El código corresponde a un premio.');
  return { type: type as 'DELIVERY' | 'PICKUP' | 'REWARD', code: match[2] };
}
export function deliveryQuantity(value: string, allowZero = false): number {
  const normalized = value.trim();
  if (!/^(0|[1-9][0-9]{0,2})$/.test(normalized) || (!allowZero && normalized === '0'))
    throw new Error(`Usá cantidades enteras entre ${allowZero ? 0 : 1} y 999.`);
  return Number(normalized);
}
export function deliveryEstimate(items: DeliveryItem[], quantities?: Record<string, string>) {
  return items.reduce(
    (total, item) => {
      const quantity = quantities
        ? deliveryQuantity(quantities[item.categoryId] ?? '', true)
        : item.declaredQuantity;
      return {
        points: total.points + quantity * item.pointsSnapshot,
      };
    },
    { points: 0 }
  );
}
