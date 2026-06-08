import { describe, it, expect } from "vitest";
import { createToken, verifyToken } from "./auth";

describe("session token", () => {
  it("발급한 토큰은 검증 통과", () => {
    expect(verifyToken(createToken())).toBe(true);
  });
  it("위조 토큰은 거부", () => {
    expect(verifyToken("garbage.deadbeef")).toBe(false);
  });
  it("undefined는 거부", () => {
    expect(verifyToken(undefined)).toBe(false);
  });
  it("서명 변조 시 거부", () => {
    const tok = createToken();
    const tampered = tok.slice(0, -2) + (tok.endsWith("00") ? "11" : "00");
    expect(verifyToken(tampered)).toBe(false);
  });
});
