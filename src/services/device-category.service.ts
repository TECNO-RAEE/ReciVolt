import { supabase } from '@/config/supabase';
import { getDeviceCategoryGroupKey, type DeviceCategory } from '@/models/DeviceCategory';

export async function getDeviceCategories(): Promise<DeviceCategory[]> {
  const { data, error } = await supabase
    .from('device_categories')
    .select('id, name, slug, group_key')
    .eq('active', true)
    .order('sort_order');
  if (!error) return (data ?? []).map((row) => ({ ...row, groupKey: row.group_key }));
  if (error.code !== '42703') throw error;

  // Older deployments have no group_key yet; use the legacy heuristic only during migration.
  const legacy = await supabase
    .from('device_categories')
    .select('id, name, slug')
    .eq('active', true)
    .order('sort_order');
  if (legacy.error) throw legacy.error;
  return (legacy.data ?? []).map((row) => ({ ...row, groupKey: getDeviceCategoryGroupKey(row) }));
}
