import { describe, it, expect } from "vitest";
import { BOOKING_STATUSES, canTransition } from "./status";

describe("BOOKING_STATUSES", () => {
  it("5종", () => expect([...BOOKING_STATUSES]).toEqual(["NEW", "CONFIRMED", "VISITED", "DONE", "CANCELLED"]));
});

describe("canTransition", () => {
  it("NEW→CONFIRMED 허용", () => expect(canTransition("NEW", "CONFIRMED")).toBe(true));
  it("NEW→CANCELLED 허용", () => expect(canTransition("NEW", "CANCELLED")).toBe(true));
  it("NEW→VISITED 불가(점프)", () => expect(canTransition("NEW", "VISITED")).toBe(false));
  it("CONFIRMED→VISITED 허용", () => expect(canTransition("CONFIRMED", "VISITED")).toBe(true));
  it("VISITED→DONE 허용", () => expect(canTransition("VISITED", "DONE")).toBe(true));
  it("DONE→NEW 역행 불가", () => expect(canTransition("DONE", "NEW")).toBe(false));
  it("CANCELLED는 종료(전이 없음)", () => expect(canTransition("CANCELLED", "NEW")).toBe(false));
  it("같은 상태로는 불가", () => expect(canTransition("NEW", "NEW")).toBe(false));
});
