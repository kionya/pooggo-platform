export type HospitalFilterParams = {
  city?: string; district?: string; category?: string; tier?: string;
  minPrice?: number; maxPrice?: number; minRating?: number; q?: string;
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const num = (v: string | string[] | undefined) => {
  const x = one(v);
  if (x === undefined) return undefined;
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
};

export function parseFilterParams(sp: SP): HospitalFilterParams {
  return {
    city: one(sp.city), district: one(sp.district), category: one(sp.category), tier: one(sp.tier),
    minPrice: num(sp.minPrice), maxPrice: num(sp.maxPrice), minRating: num(sp.minRating), q: one(sp.q),
  };
}

export function buildHospitalWhere(p: HospitalFilterParams): Record<string, unknown> {
  const where: Record<string, unknown> = { isPublished: true };
  if (p.city) where.city = p.city;
  if (p.district) where.district = p.district;
  if (p.category) where.category = p.category;
  if (p.tier) where.tier = p.tier;
  if (p.minRating !== undefined) where.rating = { gte: p.minRating };
  if (p.minPrice !== undefined || p.maxPrice !== undefined) {
    const price: Record<string, number> = {};
    if (p.minPrice !== undefined) price.gte = p.minPrice;
    if (p.maxPrice !== undefined) price.lte = p.maxPrice;
    where.menus = { some: { price } };
  }
  if (p.q) {
    where.OR = [
      { tags: { contains: p.q, mode: "insensitive" } },
      { city: { contains: p.q, mode: "insensitive" } },
      { district: { contains: p.q, mode: "insensitive" } },
    ];
  }
  return where;
}
