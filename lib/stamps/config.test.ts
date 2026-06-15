import { describe, it, expect } from "vitest";
import {
  STAMP_GOAL,
  REDEEM_COST,
  STAMP_REASONS,
  REDEMPTION_STATUSES,
} from "./config";

describe("STAMP_GOAL === REDEEM_COST identity invariant", () => {
  it("STAMP_GOAL and REDEEM_COST are equal (change both together)", () => {
    expect(STAMP_GOAL).toBe(REDEEM_COST);
  });
});

describe("STAMP_REASONS exhaustiveness", () => {
  const EXPECTED_REASONS = [
    "EARN_BOOKING",
    "EARN_REVIEW",
    "ADMIN_GRANT",
    "REDEEM",
    "REFUND",
    "ADJUST",
  ] as const;

  it("contains all expected reason values", () => {
    for (const reason of EXPECTED_REASONS) {
      expect(STAMP_REASONS).toContain(reason);
    }
  });

  it("has no extra undocumented reason values", () => {
    expect(STAMP_REASONS).toHaveLength(EXPECTED_REASONS.length);
  });
});

describe("REDEMPTION_STATUSES exhaustiveness", () => {
  const EXPECTED_STATUSES = [
    "REQUESTED",
    "APPROVED",
    "FULFILLED",
    "REJECTED",
    "CANCELLED",
  ] as const;

  it("contains all expected status values", () => {
    for (const status of EXPECTED_STATUSES) {
      expect(REDEMPTION_STATUSES).toContain(status);
    }
  });

  it("has no extra undocumented status values", () => {
    expect(REDEMPTION_STATUSES).toHaveLength(EXPECTED_STATUSES.length);
  });
});
