import { describe, it, expect } from "vitest";
import { emptyHospitalInput, emptyHours, emptyMessengers } from "./empty";
import { LANGS } from "@/lib/i18n/types";

// 이 모듈은 서버/클라이언트 공용 순수 팩토리여야 한다(클라이언트 컴포넌트로 되돌리면
// 서버 컴포넌트의 new 페이지에서 다시 런타임 에러가 난다). 순수성과 기본값을 고정한다.
describe("emptyHospitalInput", () => {
  it("returns create-form defaults", () => {
    const v = emptyHospitalInput();
    expect(v.slug).toBe("");
    expect(v.category).toBe("PLASTIC");
    expect(v.tier).toBe("RECOMMENDED");
    expect(v.isPublished).toBe(false);
    expect(v.doctors).toEqual([]);
    expect(v.menus).toEqual([]);
  });

  it("initializes every i18n field with all languages blank", () => {
    const v = emptyHospitalInput();
    for (const field of [v.name, v.intro, v.about, v.address, v.cautions, v.benefits]) {
      for (const lang of LANGS) expect(field[lang]).toBe("");
    }
  });

  it("returns fresh objects each call (no shared references)", () => {
    const a = emptyHospitalInput();
    const b = emptyHospitalInput();
    expect(a.name).not.toBe(b.name);
    expect(a.operatingHours).not.toBe(b.operatingHours);
  });
});

describe("emptyHours / emptyMessengers", () => {
  it("opens weekdays and closes Sunday", () => {
    const h = emptyHours();
    expect(h.mon.closed).toBe(false);
    expect(h.sun.closed).toBe(true);
  });

  it("provides all messenger channels as empty strings", () => {
    const m = emptyMessengers();
    expect(Object.values(m).every((x) => x === "")).toBe(true);
  });
});
