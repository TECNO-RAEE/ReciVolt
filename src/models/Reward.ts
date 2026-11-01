export const rewardCategories = {
  food: 'Gastronomía',
  wellness: 'Bienestar',
  education: 'Educación',
  shopping: 'Hogar',
  other: 'Otros',
} as const;
export type RewardCategory = keyof typeof rewardCategories;
export interface Reward {
  id: string;
  companyId: string;
  title: string;
  description: string;
  category: RewardCategory;
  pointsCost: number;
  imageUrl: string | null;
  businessName: string;
  address: string;
  hours: string;
  latitude: number | null;
  longitude: number | null;
  stock: number | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  demo?: boolean;
}
export interface Redemption {
  id: string;
  rewardId: string;
  companyId: string;
  citizenName: string;
  status: 'RESERVED' | 'REDEEMED';
  code: string;
  pointsCost: number;
  createdAt: string;
  redeemedAt: string | null;
  reward: Reward;
}
export interface PointsMovement {
  id: string;
  amount: number;
  title: string;
  source: string;
  createdAt: string;
}
export function rewardAvailable(reward: Reward, now = Date.now()) {
  return (
    reward.active &&
    reward.stock !== 0 &&
    (!reward.startsAt || Date.parse(reward.startsAt) <= now) &&
    (!reward.endsAt || Date.parse(reward.endsAt) > now)
  );
}
export function rewardQr(code: string) {
  return `TECNO-RAEE:REWARD:${code}`;
}
export function pointsLabel(points: number) {
  return `${points.toLocaleString('es-AR')} ${points === 1 ? 'punto' : 'puntos'}`;
}
