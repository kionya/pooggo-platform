import { describe, it, expect } from "vitest";
import { ownsHospital, ownsBooking } from "./ownership";

const sess = (hospitalId: string | null) => ({ user: { role: "HOSPITAL", hospitalId } });

describe("ownsHospital", () => {
  it("자기 병원 true", () => expect(ownsHospital(sess("h1"), "h1")).toBe(true));
  it("타 병원 false", () => expect(ownsHospital(sess("h1"), "h2")).toBe(false));
  it("hospitalId 없으면 false", () => expect(ownsHospital(sess(null), "h1")).toBe(false));
  it("세션 null false", () => expect(ownsHospital(null, "h1")).toBe(false));
});

describe("ownsBooking", () => {
  it("자기 병원 예약 true", () => expect(ownsBooking(sess("h1"), "h1")).toBe(true));
  it("타 병원 예약 false", () => expect(ownsBooking(sess("h1"), "h2")).toBe(false));
});
