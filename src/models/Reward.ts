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
export function rewardUnsplashPhotoUrl(photoId: string) {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=800&q=85`;
}

const categoryFallbackPhotoIds: Record<RewardCategory, string> = {
  food: 'photo-1509042239860-f550ce710b93',
  wellness: 'photo-1517836357463-d25dfeac3438',
  education: 'photo-1495446815901-a7297e633e8d',
  shopping: 'photo-1416879595882-3373a0480b5b',
  other: 'photo-1542601906990-b4d3fb778b09',
};

export function rewardCategoryFallbackImage(category?: RewardCategory | null): string {
  const key = category && category in categoryFallbackPhotoIds ? category : 'other';
  return rewardUnsplashPhotoUrl(categoryFallbackPhotoIds[key]);
}

export function rewardEffectiveImageUrl(
  reward: Pick<Reward, 'imageUrl'> & { category?: RewardCategory | null },
  allowFallback = true
): string | null {
  const custom = reward.imageUrl?.trim();
  if (custom) return custom;
  return allowFallback ? rewardCategoryFallbackImage(reward.category) : null;
}

export function rewardQr(code: string) {
  return `TECNO-RAEE:REWARD:${code}`;
}
export function pointsLabel(points: number) {
  return `${points.toLocaleString('es-AR')} ${points === 1 ? 'punto' : 'puntos'}`;
}
