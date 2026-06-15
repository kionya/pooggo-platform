/**
 * Unit tests for lib/stamps/index.ts DB helper functions.
 * The Prisma client is mocked — no real DB required.
 *
 * Covered behaviours:
 *  (a) requestRedemption deducts exactly REDEEM_COST
 *  (b) requestRedemption throws INSUFFICIENT_BALANCE when balance < REDEEM_COST
 *  (c) cancelRedemption refunds and returns CANCELLED
 *  (d) processRedemption with 'reject' creates a refund event
 *  (e) processRedemption with 'fulfill' does NOT create a refund event
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { REDEEM_COST } from "./config";

// ---------------------------------------------------------------------------
// Mock @/lib/db before importing the module under test
// ---------------------------------------------------------------------------

// We'll track what data was passed to stampEvent.create and redemption.create
const createdStampEvents: unknown[] = [];
const updatedRedemptions: unknown[] = [];

// tx object that simulates a Prisma interactive transaction client
function makeTx(overrides: {
  hospitalTier?: string;
  hospitalPublished?: boolean;
  balanceDelta?: number;
  redemptionStatus?: string;
  redemptionUserId?: string;
  redemptionStampCost?: number;
  redemptionId?: string;
}) {
  const {
    hospitalTier = "BENEFIT",
    hospitalPublished = true,
    balanceDelta = 10,
    redemptionStatus = "REQUESTED",
    redemptionUserId = "user-1",
    redemptionStampCost = 10,
    redemptionId = "redemption-1",
  } = overrides;

  return {
    hospital: {
      findUnique: vi.fn().mockResolvedValue({
        id: "hospital-1",
        tier: hospitalTier,
        isPublished: hospitalPublished,
      }),
    },
    stampEvent: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { delta: balanceDelta } }),
      create: vi.fn().mockImplementation(({ data }: { data: unknown }) => {
        createdStampEvents.push(data);
        return Promise.resolve({ id: "event-1", ...data });
      }),
    },
    redemption: {
      findUnique: vi.fn().mockResolvedValue({
        id: redemptionId,
        userId: redemptionUserId,
        status: redemptionStatus,
        stampCost: redemptionStampCost,
      }),
      create: vi.fn().mockImplementation(({ data }: { data: unknown }) => {
        return Promise.resolve({ id: "redemption-1", ...data });
      }),
      update: vi.fn().mockImplementation(({ data }: { data: unknown }) => {
        updatedRedemptions.push(data);
        return Promise.resolve({ id: redemptionId, ...data });
      }),
    },
  };
}

// Mock factory: db.$transaction calls the callback with the tx object
function makeDb(txOverrides: Parameters<typeof makeTx>[0] = {}) {
  const tx = makeTx(txOverrides);
  return {
    stampEvent: {
      create: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    redemption: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((fn: (tx: ReturnType<typeof makeTx>) => Promise<unknown>) => fn(tx)),
    _tx: tx, // expose for assertions
  };
}

vi.mock("@/lib/db", () => {
  // We'll swap the db instance per test via a module-level variable
  return { get db() { return currentDb; } };
});

let currentDb: ReturnType<typeof makeDb>;

// Import AFTER the mock is registered
const { requestRedemption, cancelRedemption, processRedemption } = await import("./index");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  createdStampEvents.length = 0;
  updatedRedemptions.length = 0;
});

describe("requestRedemption", () => {
  it("(a) deducts exactly REDEEM_COST when balance is sufficient", async () => {
    currentDb = makeDb({ balanceDelta: REDEEM_COST });
    const result = await requestRedemption({ userId: "user-1", hospitalId: "hospital-1" });
    expect(result).toBeDefined();
    // The REDEEM debit event should have been created
    const debitEvent = createdStampEvents.find(
      (e) => (e as { reason: string }).reason === "REDEEM"
    ) as { delta: number; reason: string } | undefined;
    expect(debitEvent).toBeDefined();
    expect(debitEvent?.delta).toBe(-REDEEM_COST);
  });

  it("(b) throws INSUFFICIENT_BALANCE when balance < REDEEM_COST", async () => {
    currentDb = makeDb({ balanceDelta: REDEEM_COST - 1 });
    await expect(
      requestRedemption({ userId: "user-1", hospitalId: "hospital-1" })
    ).rejects.toThrow("INSUFFICIENT_BALANCE");
  });

  it("throws INELIGIBLE_HOSPITAL when hospital tier is not BENEFIT", async () => {
    currentDb = makeDb({ hospitalTier: "STANDARD", balanceDelta: REDEEM_COST });
    await expect(
      requestRedemption({ userId: "user-1", hospitalId: "hospital-1" })
    ).rejects.toThrow("INELIGIBLE_HOSPITAL");
  });

  it("throws INELIGIBLE_HOSPITAL when hospital is not published", async () => {
    currentDb = makeDb({ hospitalPublished: false, balanceDelta: REDEEM_COST });
    await expect(
      requestRedemption({ userId: "user-1", hospitalId: "hospital-1" })
    ).rejects.toThrow("INELIGIBLE_HOSPITAL");
  });
});

describe("cancelRedemption", () => {
  it("(c) refunds stampCost and returns CANCELLED", async () => {
    currentDb = makeDb({
      redemptionStatus: "REQUESTED",
      redemptionUserId: "user-1",
      redemptionStampCost: REDEEM_COST,
      redemptionId: "redemption-1",
    });
    const result = await cancelRedemption({ id: "redemption-1", userId: "user-1" });
    expect(result).toBe("CANCELLED");
    // A REFUND stamp event should have been created
    const refundEvent = createdStampEvents.find(
      (e) => (e as { reason: string }).reason === "REFUND"
    ) as { delta: number; reason: string } | undefined;
    expect(refundEvent).toBeDefined();
    expect(refundEvent?.delta).toBe(REDEEM_COST);
  });

  it("throws NOT_FOUND when redemption belongs to different user", async () => {
    currentDb = makeDb({ redemptionUserId: "other-user" });
    await expect(
      cancelRedemption({ id: "redemption-1", userId: "user-1" })
    ).rejects.toThrow("NOT_FOUND");
  });

  it("throws INVALID_TRANSITION when redemption is already FULFILLED", async () => {
    currentDb = makeDb({ redemptionStatus: "FULFILLED", redemptionUserId: "user-1" });
    await expect(
      cancelRedemption({ id: "redemption-1", userId: "user-1" })
    ).rejects.toThrow("INVALID_TRANSITION");
  });
});

describe("processRedemption", () => {
  it("(d) reject creates a REFUND stamp event", async () => {
    currentDb = makeDb({
      redemptionStatus: "REQUESTED",
      redemptionUserId: "user-1",
      redemptionStampCost: REDEEM_COST,
      redemptionId: "redemption-1",
    });
    const result = await processRedemption({ id: "redemption-1", action: "reject", adminId: "admin-1" });
    expect(result).toBe("REJECTED");
    const refundEvent = createdStampEvents.find(
      (e) => (e as { reason: string }).reason === "REFUND"
    ) as { delta: number; reason: string } | undefined;
    expect(refundEvent).toBeDefined();
    expect(refundEvent?.delta).toBe(REDEEM_COST);
  });

  it("(e) fulfill does NOT create a refund stamp event", async () => {
    currentDb = makeDb({
      redemptionStatus: "APPROVED",
      redemptionUserId: "user-1",
      redemptionStampCost: REDEEM_COST,
      redemptionId: "redemption-1",
    });
    const result = await processRedemption({ id: "redemption-1", action: "fulfill", adminId: "admin-1" });
    expect(result).toBe("FULFILLED");
    const refundEvent = createdStampEvents.find(
      (e) => (e as { reason: string }).reason === "REFUND"
    );
    expect(refundEvent).toBeUndefined();
  });

  it("throws INVALID_TRANSITION for an invalid action", async () => {
    currentDb = makeDb({ redemptionStatus: "FULFILLED", redemptionUserId: "user-1" });
    await expect(
      processRedemption({ id: "redemption-1", action: "approve", adminId: "admin-1" })
    ).rejects.toThrow("INVALID_TRANSITION");
  });
});
