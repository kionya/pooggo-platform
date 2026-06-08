export const HOSPITAL_TIERS = ["RECOMMENDED", "PARTNER", "BENEFIT"] as const;
export type Tier = (typeof HOSPITAL_TIERS)[number];

export function tierRank(tier: string): number {
  switch (tier) {
    case "BENEFIT": return 0;
    case "PARTNER": return 1;
    default: return 2; // RECOMMENDED 및 알 수 없는 값
  }
}

export function compareHospitalsByTier(
  a: { tier: string; rating: number },
  b: { tier: string; rating: number },
): number {
  const r = tierRank(a.tier) - tierRank(b.tier);
  if (r !== 0) return r;
  return b.rating - a.rating; // 동급은 평점 내림차순
}
