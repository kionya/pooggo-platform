import { describe, it, expect } from "vitest";
import { pickHospitalEditableFields, validateHospitalProfile } from "./editable";
import type { HospitalInput } from "./types";
import { EMPTY_I18N } from "@/lib/i18n/types";

const full = (s: string) => ({ ko: s, en: s, zh: s, ja: s });
const hours = { mon: { open: "10:00", close: "19:00", closed: false }, tue: { open: "", close: "", closed: true }, wed: { open: "", close: "", closed: true }, thu: { open: "", close: "", closed: true }, fri: { open: "", close: "", closed: true }, sat: { open: "", close: "", closed: true }, sun: { open: "", close: "", closed: true }, note: EMPTY_I18N };

function valid(): HospitalInput {
  return {
    slug: "rejuel", name: full("리쥬엘"), intro: full("소개"), about: full("상세"), address: full("주소"), cautions: full("주의"),
    city: "Seoul", district: "Gangnam-gu", category: "DERMA", tags: "리프팅", image: "https://x/y.jpg", images: [],
    operatingHours: hours as any, messengers: { whatsapp: "", line: "", wechat: "", kakao: "", messenger: "", phone: "", email: "" },
    isPublished: true, tier: "BENEFIT", benefits: full("혜택"),
    doctors: [{ name: full("원장"), specialty: full("피부과"), image: "", order: 0 }],
    menus: [{ name: full("슈링크"), category: "LIFTING", price: 150000, priceText: full("15만"), currency: "KRW", order: 0 }],
  };
}

describe("pickHospitalEditableFields", () => {
  it("플랫폼 전용 필드 제외(slug/menus/tier/benefits/isPublished)", () => {
    const f = pickHospitalEditableFields(valid()) as Record<string, unknown>;
    expect(f.slug).toBeUndefined();
    expect(f.menus).toBeUndefined();
    expect(f.tier).toBeUndefined();
    expect(f.benefits).toBeUndefined();
    expect(f.isPublished).toBeUndefined();
  });
  it("편집 가능 필드는 보존(name/doctors/messengers)", () => {
    const f = pickHospitalEditableFields(valid());
    expect(f.name).toEqual(full("리쥬엘"));
    expect(f.doctors.length).toBe(1);
    expect(f.city).toBe("Seoul");
  });
});

describe("validateHospitalProfile", () => {
  it("완전 입력은 에러 없음", () => expect(validateHospitalProfile(valid())).toEqual([]));
  it("name 한 언어 누락 에러", () => {
    const v = valid(); v.name = { ...v.name, ja: "" };
    expect(validateHospitalProfile(v).some((e) => e.includes("name"))).toBe(true);
  });
  it("menus/tier 미검증(빈 menus여도 통과)", () => {
    const v = valid(); v.menus = []; v.tier = "GOLD" as any; v.benefits = EMPTY_I18N;
    expect(validateHospitalProfile(v)).toEqual([]);
  });
  it("의료진 전문분야 누락 에러", () => {
    const v = valid(); v.doctors[0].specialty = EMPTY_I18N;
    expect(validateHospitalProfile(v).some((e) => e.includes("의료진"))).toBe(true);
  });
});
