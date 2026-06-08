import { describe, it, expect } from "vitest";
import { parseFilterParams, buildHospitalWhere } from "./filter";

describe("parseFilterParams", () => {
  it("문자/숫자 파라미터 파싱", () => {
    const p = parseFilterParams({ city: "Seoul", minPrice: "100000", minRating: "4.5", q: "리프팅" });
    expect(p).toMatchObject({ city: "Seoul", minPrice: 100000, minRating: 4.5, q: "리프팅" });
  });
  it("숫자 아닌 값은 undefined", () => {
    expect(parseFilterParams({ minPrice: "abc" }).minPrice).toBeUndefined();
  });
});

describe("buildHospitalWhere", () => {
  it("기본은 공개만", () => {
    expect(buildHospitalWhere({})).toEqual({ isPublished: true });
  });
  it("city/category/tier equals", () => {
    const w = buildHospitalWhere({ city: "Seoul", category: "DERMA", tier: "BENEFIT" });
    expect(w).toMatchObject({ city: "Seoul", category: "DERMA", tier: "BENEFIT" });
  });
  it("가격대는 menus.some.price 범위", () => {
    const w = buildHospitalWhere({ minPrice: 100000, maxPrice: 500000 });
    expect(w.menus).toEqual({ some: { price: { gte: 100000, lte: 500000 } } });
  });
  it("minRating은 rating.gte", () => {
    expect(buildHospitalWhere({ minRating: 4.5 }).rating).toEqual({ gte: 4.5 });
  });
  it("q는 tags/city/district OR", () => {
    const w = buildHospitalWhere({ q: "강남" });
    expect(Array.isArray(w.OR)).toBe(true);
    expect(w.OR.length).toBe(3);
  });
});
