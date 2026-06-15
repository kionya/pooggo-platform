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
    expect(validateBookingInput(v)).toContain("BOOKING_HOSPITAL_MIN");
  });
  it("이름 누락 에러", () => {
    const v = valid(); v.name = "  ";
    expect(validateBookingInput(v)).toContain("REQUIRED_NAME");
  });
  it("연락처 누락 에러", () => {
    const v = valid(); v.phone = "";
    expect(validateBookingInput(v)).toContain("REQUIRED_PHONE");
  });
  it("국적 누락 에러", () => {
    const v = valid(); v.nationality = "";
    expect(validateBookingInput(v)).toContain("REQUIRED_NATIONALITY");
  });
  it("1지망 날짜 누락 에러", () => {
    const v = valid(); v.preferredDate1 = "";
    expect(validateBookingInput(v)).toContain("REQUIRED_DATE1");
  });
  it("잘못된 timeOfDay 에러", () => {
    const v = valid(); v.timeOfDay = "NIGHT";
    expect(validateBookingInput(v)).toContain("INVALID_TIMEOFDAY");
  });
  it("동의 미체크 에러", () => {
    const v = valid(); v.consent = false;
    expect(validateBookingInput(v)).toContain("REQUIRED_CONSENT");
  });
  it("이메일 형식 오류 에러", () => {
    const v = valid(); v.email = "not-email";
    expect(validateBookingInput(v)).toContain("INVALID_EMAIL");
  });
  it("병원 4곳 이상 에러", () => {
    const v = valid(); v.hospitalIds = ["a", "b", "c", "d"];
    expect(validateBookingInput(v)).toContain("BOOKING_HOSPITAL_MAX");
  });
  it("preferredDate1 잘못된 날짜 형식 에러", () => {
    const v = valid(); v.preferredDate1 = "garbage";
    expect(validateBookingInput(v)).toContain("INVALID_DATE1");
  });
  it("preferredDate2 비어있으면 통과", () => {
    const v = valid(); v.preferredDate2 = "";
    expect(validateBookingInput(v)).toEqual([]);
  });
  it("preferredDate2 있고 형식 틀리면 에러", () => {
    const v = valid(); v.preferredDate2 = "not-a-date";
    expect(validateBookingInput(v)).toContain("INVALID_DATE2");
  });
});
