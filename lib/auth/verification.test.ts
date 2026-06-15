import { describe, it, expect } from "vitest";
import { generateVerifyToken, isVerifyTokenExpired, VERIFY_TOKEN_TTL_MS } from "./verification";

describe("generateVerifyToken", () => {
  it("비어있지 않은 문자열", () => expect(generateVerifyToken().length).toBeGreaterThan(20));
  it("매번 다름", () => expect(generateVerifyToken()).not.toBe(generateVerifyToken()));
});

describe("isVerifyTokenExpired", () => {
  const now = 1_000_000_000_000;
  it("null은 만료 취급", () => expect(isVerifyTokenExpired(null, now)).toBe(true));
  it("과거 만료", () => expect(isVerifyTokenExpired(new Date(now - 1000), now)).toBe(true));
  it("미래 유효", () => expect(isVerifyTokenExpired(new Date(now + 1000), now)).toBe(false));
});

describe("TTL", () => {
  it("24시간", () => expect(VERIFY_TOKEN_TTL_MS).toBe(24 * 60 * 60 * 1000));
});
