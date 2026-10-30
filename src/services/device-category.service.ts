import { supabase } from '@/config/supabase';
import { getDeviceCategoryGroupKey, type DeviceCategory } from '@/models/DeviceCategory';

export async function getDeviceCategories(): Promise<DeviceCategory[]> {
  const { data, error } = await supabase
    .from('device_categories')
    .select('id, name, slug')
    .eq('active', true)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, groupKey: getDeviceCategoryGroupKey(row) }));
}
