import { describe, it, expect } from "vitest";
import { validateBookingInput } from "./validation";
import type { BookingInput } from "./types";

function valid(): BookingInput {
  return {
    hospitalIds: ["h1"], locale: "ko",
    name: "John", phone: "+8210", nationality: "US",
    email: "j@x.com", age: 30, gender: "MALE",
    messengerChannel: "whatsapp", messengerHandle: "+8210",
    treatmentInterest: "rhino", memo: "",
    preferredDate1: "2026-07-01", preferredDate2: "", timeOfDay: "MORNING",
    consent: true,
  };
}

describe("validateBookingInput", () => {
  it("완전 입력은 에러 없음", () => expect(validateBookingInput(valid())).toEqual([]));
  it("병원 0곳 에러", () => {
    const v = valid(); v.hospitalIds = [];
    expect(validateBookingInput(v).some((e) => e.includes("hospital"))).toBe(true);
  });
  it("이름 누락 에러", () => {
    const v = valid(); v.name = "  ";
    expect(validateBookingInput(v).some((e) => e.includes("name"))).toBe(true);
  });
  it("연락처 누락 에러", () => {
    const v = valid(); v.phone = "";
    expect(validateBookingInput(v).some((e) => e.includes("phone"))).toBe(true);
  });
  it("국적 누락 에러", () => {
    const v = valid(); v.nationality = "";
    expect(validateBookingInput(v).some((e) => e.includes("nationality"))).toBe(true);
  });
  it("1지망 날짜 누락 에러", () => {
    const v = valid(); v.preferredDate1 = "";
    expect(validateBookingInput(v).some((e) => e.includes("preferredDate1"))).toBe(true);
  });
  it("잘못된 timeOfDay 에러", () => {
    const v = valid(); v.timeOfDay = "NIGHT";
    expect(validateBookingInput(v).some((e) => e.includes("timeOfDay"))).toBe(true);
  });
  it("동의 미체크 에러", () => {
    const v = valid(); v.consent = false;
    expect(validateBookingInput(v).some((e) => e.includes("consent"))).toBe(true);
  });
  it("이메일 형식 오류 에러", () => {
    const v = valid(); v.email = "not-email";
    expect(validateBookingInput(v).some((e) => e.includes("email"))).toBe(true);
  });
  it("병원 4곳 이상 에러", () => {
    const v = valid(); v.hospitalIds = ["a", "b", "c", "d"];
    expect(validateBookingInput(v).some((e) => e.includes("hospital"))).toBe(true);
  });
});
