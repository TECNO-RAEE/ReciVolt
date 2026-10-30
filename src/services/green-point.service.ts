import { supabase } from '@/config/supabase';
import type { GreenPoint } from '@/models/GreenPoint';
import { getDeviceCategoryGroupKey, type DeviceCategory } from '@/models/DeviceCategory';

export interface GreenPointRow {
  id: string;
  company_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  description: string | null;
  time_zone: string;
  pickup_enabled: boolean;
  intake_confirmed: boolean;
  companies: { name: string; status: string };
  green_point_schedules: { weekday: number; opens_minute: number; closes_minute: number }[];
  green_point_device_categories: {
    device_categories: (DeviceCategory & { group_key?: string }) | null;
  }[];
  green_point_device_policies: {
    device_category_id: string;
    mode: 'onsite' | 'pickup' | 'not_accepted';
    device_categories: (DeviceCategory & { group_key?: string }) | null;
  }[];
}
type LegacyGreenPointRow = Omit<
  GreenPointRow,
  'intake_confirmed' | 'green_point_device_policies'
> & {
  green_point_device_categories: {
    device_categories: DeviceCategory | null;
  }[];
};

function categoryWithGroup(category: DeviceCategory & { group_key?: string }) {
  return {
    ...category,
    groupKey: category.group_key ?? getDeviceCategoryGroupKey(category),
  };
}

export function mapGreenPoint(row: GreenPointRow): GreenPoint {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.companies.name,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    description: row.description,
    timeZone: row.time_zone,
    pickupEnabled:
      row.pickup_enabled ||
      row.green_point_device_policies.some((policy) => policy.mode === 'pickup'),
    intakeConfirmed: row.intake_confirmed,
    categories: row.green_point_device_categories
      .flatMap((r) => (r.device_categories ? [categoryWithGroup(r.device_categories)] : []))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    intakePolicies: row.green_point_device_policies.map((policy) => ({
      categoryId: policy.device_category_id,
      mode: policy.mode,
      category: policy.device_categories ? categoryWithGroup(policy.device_categories) : undefined,
    })),
    schedules: row.green_point_schedules
      .map((s) => ({
        weekday: s.weekday,
        opensMinute: s.opens_minute,
        closesMinute: s.closes_minute,
      }))
      .sort((a, b) => a.weekday - b.weekday || a.opensMinute - b.opensMinute),
  };
}

function mapLegacyGreenPoint(row: LegacyGreenPointRow): GreenPoint {
  const categories = row.green_point_device_categories
    .flatMap((entry) =>
      entry.device_categories ? [categoryWithGroup(entry.device_categories)] : []
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.companies.name,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    description: row.description,
    timeZone: row.time_zone,
    pickupEnabled: row.pickup_enabled,
    intakeConfirmed: false,
    categories,
    // Before the per-point policy migration, the existing relationship meant in-person intake.
    intakePolicies: categories.map((category) => ({
      categoryId: category.id,
      mode: 'onsite' as const,
      category,
    })),
    schedules: row.green_point_schedules
      .map((schedule) => ({
        weekday: schedule.weekday,
        opensMinute: schedule.opens_minute,
        closesMinute: schedule.closes_minute,
      }))
      .sort((a, b) => a.weekday - b.weekday || a.opensMinute - b.opensMinute),
  };
}

function requiresPolicyMigration(error: { code?: string; message?: string }): boolean {
  return (
    ['42703', '42P01', 'PGRST200', 'PGRST204', 'PGRST205'].includes(error.code ?? '') ||
    /intake_confirmed|green_point_device_policies|group_key|schema cache/i.test(error.message ?? '')
  );
}

async function getGreenPointsWithSelection<T>(
  selection: string,
  map: (row: T) => GreenPoint,
  signal?: AbortSignal
): Promise<GreenPoint[]> {
  const points: GreenPoint[] = [];
  const pageSize = 500;
  for (let start = 0; ; start += pageSize) {
    let query = supabase
      .from('green_points')
      .select(selection)
      .eq('active', true)
      .eq('companies.status', 'ACTIVE')
      .order('name')
      .order('id')
      .range(start, start + pageSize - 1);
    if (signal) query = query.abortSignal(signal);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as unknown as T[];
    points.push(...rows.map(map));
    if (rows.length < pageSize) return points;
  }
}

// Explicit public filters also apply to company/admin sessions. RLS remains the authority.
export async function getGreenPoints(signal?: AbortSignal): Promise<GreenPoint[]> {
  try {
    return await getGreenPointsWithSelection<GreenPointRow>(
      `
      id, company_id, name, address, latitude, longitude, phone, description, time_zone, pickup_enabled, intake_confirmed,
      companies!inner(name, status),
      green_point_schedules(weekday, opens_minute, closes_minute),
      green_point_device_categories(device_categories(id, name, slug, group_key)),
      green_point_device_policies(device_category_id, mode, device_categories(id, name, slug, group_key))
      `,
      mapGreenPoint,
      signal
    );
  } catch (error) {
    if (!requiresPolicyMigration(error as { code?: string; message?: string })) throw error;
    return getGreenPointsWithSelection<LegacyGreenPointRow>(
      `
      id, company_id, name, address, latitude, longitude, phone, description, time_zone, pickup_enabled,
      companies!inner(name, status),
      green_point_schedules(weekday, opens_minute, closes_minute),
      green_point_device_categories(device_categories(id, name, slug))
      `,
      mapLegacyGreenPoint,
      signal
    );
  }
}
