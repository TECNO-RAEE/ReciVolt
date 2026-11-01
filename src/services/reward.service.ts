import { supabase } from '@/config/supabase';
import type { PointsMovement, Redemption, Reward, RewardCategory } from '@/models/Reward';
type Row = Record<string, unknown>;
export function mapReward(row: Row): Reward {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    title: String(row.title),
    description: String(row.description ?? ''),
    category: row.category as RewardCategory,
    pointsCost: Number(row.points_cost),
    imageUrl: row.image_url ? String(row.image_url) : null,
    businessName: String(row.business_name),
    address: String(row.address ?? ''),
    hours: String(row.hours ?? ''),
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    stock: row.stock == null ? null : Number(row.stock),
    active: Boolean(row.active),
    startsAt: row.starts_at ? String(row.starts_at) : null,
    endsAt: row.ends_at ? String(row.ends_at) : null,
  };
}
export function mapRedemption(row: Row): Redemption {
  return {
    id: String(row.id),
    rewardId: String(row.reward_id),
    companyId: String(row.company_id),
    citizenName: String(row.citizen_name),
    status: row.status as Redemption['status'],
    code: String(row.verification_token),
    pointsCost: Number(row.points_cost),
    createdAt: String(row.created_at),
    redeemedAt: row.redeemed_at ? String(row.redeemed_at) : null,
    reward: mapReward(row.reward_snapshot as Row),
  };
}
export async function getActiveRewardCompanyIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let start = 0; ; start += 1000) {
    const { data, error } = await supabase
      .from('rewards')
      .select('company_id')
      .eq('active', true)
      .order('id')
      .range(start, start + 999);
    if (error) throw error;
    for (const row of data ?? []) ids.add(row.company_id);
    if (!data || data.length < 1000) return ids;
  }
}
export async function getRewards(companyId?: string, includeInactive = false): Promise<Reward[]> {
  const result: Reward[] = [];
  for (let page = 0; ; page++) {
    let query = supabase
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id')
      .range(page * 100, page * 100 + 99);
    if (companyId) query = query.eq('company_id', companyId);
    if (!companyId && !includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) throw error;
    result.push(...(data ?? []).map(mapReward));
    if (!data || data.length < 100) return result;
  }
}
export async function getReward(id: string): Promise<Reward | null> {
  const { data, error } = await supabase.from('rewards').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? mapReward(data) : null;
}
export async function rewardCommand(
  operation: 'reserve' | 'get' | 'lookup' | 'confirm',
  payload: object
) {
  const { data, error } = await supabase.rpc('reward_command', { operation, payload });
  if (error) throw error;
  if (!data) throw new Error('No pudimos obtener el canje.');
  return mapRedemption(data);
}
export async function saveReward(payload: object) {
  const { data, error } = await supabase.rpc('reward_command', { operation: 'save', payload });
  if (error) throw error;
  return mapReward(data);
}
export async function getRedemptions(page = 0) {
  const { data: account, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!account.user) throw new Error('Iniciá sesión para ver tus canjes.');
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select(
      'id,reward_id,company_id,citizen_name,status,verification_token,points_cost,created_at,redeemed_at,reward_snapshot'
    )
    .eq('user_id', account.user.id)
    .order('created_at', { ascending: false })
    .order('id')
    .range(page * 30, page * 30 + 29);
  if (error) throw error;
  return (data ?? []).map(mapRedemption);
}
export async function getPointsHistory(): Promise<PointsMovement[]> {
  const { data, error } = await supabase.rpc('my_points_history');
  if (error) throw error;
  return (data as Row[]).map((row) => ({
    id: String(row.id),
    amount: Number(row.amount),
    title: String(row.title),
    source: String(row.source),
    createdAt: String(row.created_at),
  }));
}
