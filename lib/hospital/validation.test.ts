import { describe, it, expect } from "vitest";
import { validateHospitalInput, HOSPITAL_CATEGORIES } from "./validation";
import type { HospitalInput } from "./types";
import { EMPTY_I18N } from "@/lib/i18n/types";

const full = (s: string) => ({ ko: s, en: s, zh: s, ja: s });
const baseHours = { open: "10:00", close: "19:00", closed: false };

function valid(): HospitalInput {
  return {
    slug: "rejuel-gangnam",
    name: full("리쥬엘"), intro: full("소개"), about: full("상세"), address: full("주소"),
    cautions: full("주의사항"),
    city: "Seoul", district: "Gangnam-gu", category: "DERMA", tags: full("리프팅"),
    image: "https://x/y.jpg", images: [],
    operatingHours: { mon: baseHours, tue: baseHours, wed: baseHours, thu: baseHours, fri: baseHours, sat: baseHours, sun: { open: "", close: "", closed: true }, note: full("휴무") },
    messengers: { whatsapp: "", line: "", wechat: "", kakao: "", messenger: "", phone: "", email: "" },
    isPublished: true,
    tier: "RECOMMENDED", benefits: EMPTY_I18N,
    doctors: [{ name: full("원장"), specialty: full("피부과"), image: "", order: 0 }],
    menus: [{ name: full("슈링크"), category: "LIFTING", price: 150000, priceText: full("150,000 KRW~"), currency: "KRW", order: 0 }],
  };
}

describe("validateHospitalInput", () => {
  it("완전한 입력은 에러 없음", () => {
    expect(validateHospitalInput(valid())).toEqual([]);
  });
  it("slug 누락 시 에러", () => {
    const v = valid(); v.slug = "";
    expect(validateHospitalInput(v).some((e) => e.includes("slug"))).toBe(true);
  });
  it("다국어 한 언어 누락 시 에러", () => {
    const v = valid(); v.name = { ...v.name, ja: "" };
    expect(validateHospitalInput(v).some((e) => e.includes("name"))).toBe(true);
  });
  it("잘못된 category 에러", () => {
    const v = valid(); v.category = "WRONG";
    expect(validateHospitalInput(v).some((e) => e.includes("category"))).toBe(true);
  });
  it("의료진 전문분야 누락 에러", () => {
    const v = valid(); v.doctors[0].specialty = EMPTY_I18N;
    expect(validateHospitalInput(v).some((e) => e.includes("의료진"))).toBe(true);
  });
  it("의료진 이름 누락 에러", () => {
    const v = valid(); v.doctors[0].name = EMPTY_I18N;
    expect(validateHospitalInput(v).some((e) => e.includes("의료진"))).toBe(true);
  });
  it("시술 가격표기 누락 에러", () => {
    const v = valid(); v.menus[0].priceText = EMPTY_I18N;
    expect(validateHospitalInput(v).some((e) => e.includes("시술"))).toBe(true);
  });
  it("카테고리 상수는 정확한 6종", () => {
    expect([...HOSPITAL_CATEGORIES]).toEqual(["PLASTIC", "DERMA", "DENTAL", "OPHTHALMOLOGY", "HAIR", "ETC"]);
  });
  it("잘못된 tier 에러", () => {
    const v = valid(); v.tier = "GOLD";
    expect(validateHospitalInput(v).some((e) => e.includes("tier"))).toBe(true);
  });
  it("BENEFIT 등급은 benefits 4언어 필수", () => {
    const v = valid(); v.tier = "BENEFIT"; v.benefits = EMPTY_I18N;
    expect(validateHospitalInput(v).some((e) => e.includes("benefits"))).toBe(true);
  });
});
