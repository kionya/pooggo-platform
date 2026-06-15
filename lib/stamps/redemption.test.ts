import { describe, it, expect } from "vitest";
import { canRedeem, nextRedemptionStatus, isRefundExit, generateRedemptionCode } from "./redemption";

describe("canRedeem", () => {
  it("requires balance >= cost", () => {
    expect(canRedeem(10)).toBe(true);
    expect(canRedeem(9)).toBe(false);
  });
});

describe("nextRedemptionStatus", () => {
  it("allows valid transitions", () => {
    expect(nextRedemptionStatus("REQUESTED", "approve")).toBe("APPROVED");
    expect(nextRedemptionStatus("APPROVED", "fulfill")).toBe("FULFILLED");
    expect(nextRedemptionStatus("REQUESTED", "cancel")).toBe("CANCELLED");
    expect(nextRedemptionStatus("APPROVED", "reject")).toBe("REJECTED");
    expect(nextRedemptionStatus("REQUESTED", "reject")).toBe("REJECTED");
    expect(nextRedemptionStatus("APPROVED", "cancel")).toBe("CANCELLED");
  });
  it("rejects invalid transitions", () => {
    expect(nextRedemptionStatus("REQUESTED", "fulfill")).toBeNull();
    expect(nextRedemptionStatus("FULFILLED", "approve")).toBeNull();
    expect(nextRedemptionStatus("CANCELLED", "approve")).toBeNull();
  });
});

describe("isRefundExit", () => {
  it("refunds on reject/cancel only", () => {
    expect(isRefundExit("REJECTED")).toBe(true);
    expect(isRefundExit("CANCELLED")).toBe(true);
    expect(isRefundExit("FULFILLED")).toBe(false);
    expect(isRefundExit("APPROVED")).toBe(false);
  });
});

describe("generateRedemptionCode", () => {
  it("produces PGS- prefixed 6-char codes without ambiguous chars", () => {
    expect(generateRedemptionCode()).toMatch(/^PGS-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
});
