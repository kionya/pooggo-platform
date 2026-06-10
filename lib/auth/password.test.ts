import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("해시는 평문과 다름", async () => {
    const h = await hashPassword("secret123!");
    expect(h).not.toBe("secret123!");
    expect(h.length).toBeGreaterThan(20);
  });
  it("올바른 비번은 검증 통과", async () => {
    const h = await hashPassword("secret123!");
    expect(await verifyPassword("secret123!", h)).toBe(true);
  });
  it("틀린 비번은 거부", async () => {
    const h = await hashPassword("secret123!");
    expect(await verifyPassword("wrong", h)).toBe(false);
  });
  it("빈 해시는 false", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
  });
});
