import { describe, it, expect } from "vitest";
import { computeBalance, progress } from "./balance";

describe("computeBalance", () => {
  it("sums deltas including refunds and adjustments", () => {
    expect(computeBalance([{ delta: 1 }, { delta: 1 }, { delta: -10 }, { delta: 10 }])).toBe(2);
  });
  it("returns 0 for empty ledger", () => {
    expect(computeBalance([])).toBe(0);
  });
});

describe("progress", () => {
  it("caps count at goal and computes remaining", () => {
    expect(progress(7)).toEqual({ count: 7, goal: 10, remaining: 3, complete: false });
  });
  it("marks complete at or above goal", () => {
    expect(progress(10)).toEqual({ count: 10, goal: 10, remaining: 0, complete: true });
    expect(progress(13)).toEqual({ count: 10, goal: 10, remaining: 0, complete: true });
  });
  it("never returns negative remaining or count", () => {
    expect(progress(-5)).toEqual({ count: 0, goal: 10, remaining: 10, complete: false });
  });
});
