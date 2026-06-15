import { describe, it, expect } from "vitest";
import { validatePatientSignup } from "./patient-registration";

function valid() {
  return { email: "patient@x.com", password: "secret123", passwordConfirm: "secret123", name: "홍길동" };
}

describe("validatePatientSignup", () => {
  it("완전 입력은 에러 없음", () => expect(validatePatientSignup(valid())).toEqual([]));
  it("이메일 형식 오류", () => {
    const v = valid(); v.email = "bad";
    expect(validatePatientSignup(v)).toContain("INVALID_EMAIL");
  });
  it("비밀번호 8자 미만", () => {
    const v = valid(); v.password = "1234"; v.passwordConfirm = "1234";
    expect(validatePatientSignup(v)).toContain("PASSWORD_MIN");
  });
  it("비밀번호 불일치", () => {
    const v = valid(); v.passwordConfirm = "different1";
    expect(validatePatientSignup(v)).toContain("PASSWORD_MISMATCH");
  });
  it("이름 누락", () => {
    const v = valid(); v.name = "  ";
    expect(validatePatientSignup(v)).toContain("REQUIRED_NAME");
  });
});
