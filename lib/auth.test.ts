import { describe, it, expect, beforeAll } from "vitest";
import { createToken, verifyToken } from "./auth";

beforeAll(() => {
  process.env.ADMIN_SESSION_SECRET = "test-secret";
});

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
  it("만료된 토큰은 거부", () => {
    expect(verifyToken(createToken(-1000))).toBe(false);
  });
  it("다른 시크릿으로 서명된 토큰은 거부", () => {
    const tok = createToken();
    process.env.ADMIN_SESSION_SECRET = "other-secret";
    const result = verifyToken(tok);
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    expect(result).toBe(false);
  });
});
