import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/config/supabase';
import type { Delivery, DeliveryBalance, DeliveryStatus } from '@/models/Delivery';

type Row = Record<string, unknown>;
export function mapDelivery(row: Row): Delivery {
  const items = (row.items ?? row.delivery_items ?? []) as Row[];
  return {
    id: String(row.id),
    userId: String(row.user_id),
    companyId: String(row.company_id),
    pointId: String(row.green_point_id),
    citizenName: String(row.citizen_name),
    companyName: String(row.company_name),
    pointName: String(row.point_name),
    status: row.status as DeliveryStatus,
    code: String(row.verification_token),
    notes: String(row.notes ?? ''),
    photoPath: row.photo_path == null ? null : String(row.photo_path),
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at),
    confirmedAt: row.confirmed_at == null ? null : String(row.confirmed_at),
    points: Number(row.confirmed_points),
    items: items.map((i) => ({
      categoryId: String(i.device_category_id),
      categoryName: String(i.category_name),
      declaredQuantity: Number(i.declared_quantity),
      confirmedQuantity: i.confirmed_quantity == null ? null : Number(i.confirmed_quantity),
      pointsSnapshot: Number(i.points_snapshot),
    })),
  };
}
export async function deliveryCommand(
  operation: 'create' | 'get' | 'lookup' | 'confirm' | 'cancel',
  payload: object
): Promise<Delivery> {
  const { data, error } = await supabase.rpc('delivery_command', { operation, payload });
  if (error) throw error;
  if (!data) throw new Error('No pudimos obtener la entrega.');
  return mapDelivery(data);
}
export async function getDeliveryHistory(companyId: string | null, page = 0): Promise<Delivery[]> {
  let query = supabase
    .from('deliveries')
    .select('*, delivery_items(*)')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(page * 30, page * 30 + 29);
  if (companyId) query = query.eq('company_id', companyId);
  else {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Iniciá sesión.');
    query = query.eq('user_id', data.user.id);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapDelivery);
}
export async function getDeliveryBalance(): Promise<DeliveryBalance> {
  const { data, error } = await supabase.rpc('my_delivery_balance');
  if (error) throw error;
  return {
    points: Number(data.points),
    companies: (data.companies as Row[]).map((c) => ({
      id: String(c.company_id),
      name: String(c.company_name),
      points: Number(c.points),
    })),
  };
}
export async function getDeliveryRates(companyId: string) {
  const points = await supabase
    .from('company_device_points')
    .select('device_category_id, points')
    .eq('company_id', companyId);
  if (points.error) throw points.error;
  return {
    points: Object.fromEntries(
      (points.data ?? []).map((p) => [p.device_category_id, p.points])
    ) as Record<string, number>,
  };
}
export async function pickDeliveryPhoto(
  userId: string
): Promise<{ path: string; uri: string } | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.8,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.mimeType && !['image/jpeg', 'image/png'].includes(asset.mimeType))
    throw new Error('Elegí una foto JPG o PNG.');
  const bytes = await (await fetch(asset.uri)).arrayBuffer();
  if (bytes.byteLength > 5242880) throw new Error('La foto puede pesar hasta 5 MB.');
  const mime = asset.mimeType ?? 'image/jpeg';
  const path = `${userId}/${Crypto.randomUUID()}.${mime === 'image/png' ? 'png' : 'jpg'}`;
  const { error } = await supabase.storage
    .from('delivery-photos')
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw error;
  return { path, uri: asset.uri };
}
export async function removeDeliveryPhoto(path: string) {
  const { error } = await supabase.storage.from('delivery-photos').remove([path]);
  if (error) throw error;
}
export async function getDeliveryPhotoUrl(path: string) {
  const { data, error } = await supabase.storage.from('delivery-photos').createSignedUrl(path, 120);
  if (error) throw error;
  return data.signedUrl;
}
