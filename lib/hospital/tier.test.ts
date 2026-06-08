import { describe, it, expect } from "vitest";
import { tierRank, compareHospitalsByTier, HOSPITAL_TIERS } from "./tier";

describe("tierRank", () => {
  it("BENEFIT<PARTNER<RECOMMENDED 순위", () => {
    expect(tierRank("BENEFIT")).toBeLessThan(tierRank("PARTNER"));
    expect(tierRank("PARTNER")).toBeLessThan(tierRank("RECOMMENDED"));
  });
  it("알 수 없는 값은 RECOMMENDED 순위", () => {
    expect(tierRank("XYZ")).toBe(tierRank("RECOMMENDED"));
  });
});

describe("compareHospitalsByTier", () => {
  it("등급이 다르면 등급 우선", () => {
    expect(compareHospitalsByTier({ tier: "BENEFIT", rating: 1 }, { tier: "RECOMMENDED", rating: 5 })).toBeLessThan(0);
  });
  it("같은 등급은 평점 높은 순", () => {
    expect(compareHospitalsByTier({ tier: "PARTNER", rating: 4.5 }, { tier: "PARTNER", rating: 4.9 })).toBeGreaterThan(0);
  });
  it("상수는 3종", () => expect(HOSPITAL_TIERS.length).toBe(3));
});
