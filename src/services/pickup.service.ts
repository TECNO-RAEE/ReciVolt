import { supabase } from '@/config/supabase';
import { canRequestPickup, type Pickup, type PickupItem, type PickupStatus } from '@/models/Pickup';
import type { GreenPoint } from '@/models/GreenPoint';
export {
  pickDeliveryPhoto as pickPickupPhoto,
  removeDeliveryPhoto as removePickupPhoto,
  getDeliveryPhotoUrl as getPickupPhotoUrl,
} from './delivery.service';

type Row = Record<string, unknown>;

export function mapPickup(row: Row): Pickup {
  const items = (row.items ?? row.pickup_items ?? []) as Row[];
  return {
    id: String(row.id),
    userId: String(row.user_id),
    companyId: String(row.company_id),
    pointId: row.green_point_id == null ? null : String(row.green_point_id),
    citizenName: String(row.citizen_name),
    citizenPhone: row.citizen_phone == null ? null : String(row.citizen_phone),
    companyName: String(row.company_name),
    pointName: row.point_name == null ? null : String(row.point_name),
    status: row.status as PickupStatus,
    addressStreet: String(row.address_street),
    addressLocality: String(row.address_locality),
    addressReference: String(row.address_reference ?? ''),
    notes: String(row.notes ?? ''),
    photoPath: row.photo_path == null ? null : String(row.photo_path),
    code: String(row.verification_token),
    scheduledDate: row.scheduled_date == null ? null : String(row.scheduled_date),
    scheduledTimeSlot: row.scheduled_time_slot == null ? null : String(row.scheduled_time_slot),
    driverName: row.driver_name == null ? null : String(row.driver_name),
    createdAt: String(row.created_at),
    coordinatedAt: row.coordinated_at == null ? null : String(row.coordinated_at),
    inTransitAt: row.in_transit_at == null ? null : String(row.in_transit_at),
    completedAt: row.completed_at == null ? null : String(row.completed_at),
    cancelledAt: row.cancelled_at == null ? null : String(row.cancelled_at),
    points: Number(row.confirmed_points ?? 0),
    items: items.map((i): PickupItem => ({
      categoryId: String(i.device_category_id),
      categoryName: String(i.category_name),
      declaredQuantity: Number(i.declared_quantity),
      confirmedQuantity: i.confirmed_quantity == null ? null : Number(i.confirmed_quantity),
      pointsSnapshot: Number(i.points_snapshot ?? 0),
    })),
  };
}

export async function pickupCommand(
  operation: 'create' | 'get' | 'cancel' | 'coordinate' | 'in_transit' | 'complete',
  payload: object
): Promise<Pickup> {
  const { data, error } = await supabase.rpc('pickup_command', { operation, payload });
  if (error) throw error;
  if (!data) throw new Error('No pudimos procesar la solicitud de retiro.');
  return mapPickup(data as Row);
}

export async function getPickupHistory(
  companyId?: string | null,
  page = 0,
  status?: PickupStatus | PickupStatus[]
): Promise<Pickup[]> {
  let query = supabase
    .from('pickups')
    .select('*, pickup_items(*)')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(page * 30, page * 30 + 29);

  if (companyId) {
    query = query.eq('company_id', companyId);
  } else {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Iniciá sesión para ver tus retiros.');
    query = query.eq('user_id', data.user.id);
  }

  if (status) {
    query = Array.isArray(status) ? query.in('status', status) : query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapPickup(row as Row));
}

export async function getPickupStatusCounts(
  companyId: string
): Promise<Record<PickupStatus, number>> {
  const { data, error } = await supabase
    .from('pickups')
    .select('status')
    .eq('company_id', companyId);
  if (error) throw error;
  const counts: Record<PickupStatus, number> = {
    REQUESTED: 0,
    COORDINATED: 0,
    IN_TRANSIT: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };
  for (const row of data ?? []) {
    const status = row.status as PickupStatus;
    if (status in counts) counts[status] += 1;
  }
  return counts;
}

export function getPickupEligiblePoints(points: GreenPoint[]): GreenPoint[] {
  return points.filter(canRequestPickup);
}
