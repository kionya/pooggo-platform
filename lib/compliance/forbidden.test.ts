import { describe, it, expect } from "vitest";
import { scanForbidden } from "./forbidden";

describe("scanForbidden", () => {
  it("깨끗한 문구는 빈 배열", () => {
    expect(scanForbidden("검증된 한국 병원을 비교하세요")).toEqual([]);
    expect(scanForbidden("Compare verified Korean clinics")).toEqual([]);
  });
  it("100% 감지", () => expect(scanForbidden("대리수술 100% 차단")).toContain("100%"));
  it("상위 1% 감지", () => expect(scanForbidden("상위 1% 병원")).toContain("상위 1%"));
  it("world class 감지(대소문자 무시)", () => expect(scanForbidden("World Class K-Beauty")).toContain("world class"));
  it("government verified 감지", () => expect(scanForbidden("Government Verified Partners")).toContain("government verified"));
  it("official 감지(단어경계)", () => expect(scanForbidden("Official Platform")).toContain("official"));
  it("guarantee 감지", () => expect(scanForbidden("Safety Guarantee")).toContain("guarantee"));
  it("보장 감지", () => expect(scanForbidden("효과를 보장합니다")).toContain("보장"));
  it("완치 감지", () => expect(scanForbidden("완치 가능")).toContain("완치"));
  it("부작용 없음 감지", () => expect(scanForbidden("부작용 없는 시술")).toContain("부작용 없음"));
  it("best 단어경계 — 'best' 감지하나 'bestseller'는 무시", () => {
    expect(scanForbidden("Find Best Clinic")).toContain("best");
    expect(scanForbidden("bestseller list")).not.toContain("best");
  });
  it("최고/1위 감지", () => {
    expect(scanForbidden("국내 최고의 병원")).toContain("최고/1위");
    expect(scanForbidden("국내 1위 클리닉")).toContain("최고/1위");
  });
  it("no side effect 감지", () => expect(scanForbidden("No side effects at all")).toContain("no side effect"));
});
