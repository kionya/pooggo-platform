import { describe, it, expect } from "vitest";
import { makeBookingCode } from "./code";

describe("makeBookingCode", () => {
  it("RDB- 접두 + 6자리 대문자/숫자", () => {
    const c = makeBookingCode();
    expect(c).toMatch(/^RDB-[A-Z0-9]{6}$/);
  });
  it("연속 호출 시 대체로 다름", () => {
    const set = new Set(Array.from({ length: 50 }, () => makeBookingCode()));
    expect(set.size).toBeGreaterThan(45);
  });
});
