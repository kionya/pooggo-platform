import { describe, it, expect } from "vitest";
import { validateHospitalRegistration } from "./registration";

function valid() {
  return { email: "clinic@x.com", password: "secret123", passwordConfirm: "secret123", hospitalName: "리쥬엘의원" };
}

describe("validateHospitalRegistration", () => {
  it("완전 입력은 에러 없음", () => expect(validateHospitalRegistration(valid())).toEqual([]));
  it("이메일 형식 오류", () => {
    const v = valid(); v.email = "bad";
    expect(validateHospitalRegistration(v).some((e) => e.includes("email"))).toBe(true);
  });
  it("비밀번호 8자 미만", () => {
    const v = valid(); v.password = "1234"; v.passwordConfirm = "1234";
    expect(validateHospitalRegistration(v).some((e) => e.includes("password"))).toBe(true);
  });
  it("비밀번호 불일치", () => {
    const v = valid(); v.passwordConfirm = "different1";
    expect(validateHospitalRegistration(v).some((e) => e.includes("passwordConfirm"))).toBe(true);
  });
  it("병원명 누락", () => {
    const v = valid(); v.hospitalName = "  ";
    expect(validateHospitalRegistration(v).some((e) => e.includes("hospitalName"))).toBe(true);
  });
});
