import { db } from "@/lib/db";
import { REDEEM_COST, type StampReason, type RedemptionStatus } from "./config";
import { generateRedemptionCode, isRefundExit, nextRedemptionStatus, type RedemptionAction } from "./redemption";

export { STAMP_GOAL, REDEEM_COST } from "./config";

export async function getBalance(userId: string): Promise<number> {
  const r = await db.stampEvent.aggregate({ _sum: { delta: true }, where: { userId } });
  return r._sum.delta ?? 0;
}

export function getHistory(userId: string) {
  return db.stampEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function grantStamps(params: {
  userId: string;
  delta: number;
  reason: StampReason;
  sourceType?: string;
  sourceId?: string;
  adminId?: string;
  note?: string;
}): Promise<void> {
  await db.stampEvent.create({
    data: {
      userId: params.userId,
      delta: params.delta,
      reason: params.reason,
      sourceType: params.sourceType ?? null,
      sourceId: params.sourceId ?? null,
      adminId: params.adminId ?? null,
      note: params.note ?? null,
    },
  });
}

// 교환 신청: 병원 적격성 + 잔액 검증 → Redemption 생성 + REDEEM 차감(원자)
export async function requestRedemption(params: { userId: string; hospitalId: string; note?: string }) {
  return db.$transaction(async (tx) => {
    const hospital = await tx.hospital.findUnique({ where: { id: params.hospitalId } });
    if (!hospital || hospital.tier !== "BENEFIT" || !hospital.isPublished) {
      throw new Error("INELIGIBLE_HOSPITAL");
    }
    const agg = await tx.stampEvent.aggregate({ _sum: { delta: true }, where: { userId: params.userId } });
    const balance = agg._sum.delta ?? 0;
    if (balance < REDEEM_COST) throw new Error("INSUFFICIENT_BALANCE");

    const redemption = await tx.redemption.create({
      data: {
        code: generateRedemptionCode(),
        userId: params.userId,
        hospitalId: params.hospitalId,
        stampCost: REDEEM_COST,
        status: "REQUESTED",
        note: params.note?.slice(0, 500) ?? null,
      },
    });
    await tx.stampEvent.create({
      data: {
        userId: params.userId,
        delta: -REDEEM_COST,
        reason: "REDEEM",
        sourceType: "Redemption",
        sourceId: redemption.id,
        redemptionId: redemption.id,
      },
    });
    return redemption;
  }, { isolationLevel: "Serializable" });
}

// 사용자 취소: REQUESTED/APPROVED → CANCELLED + 환급
export async function cancelRedemption(params: { id: string; userId: string }) {
  return db.$transaction(async (tx) => {
    const r = await tx.redemption.findUnique({ where: { id: params.id } });
    if (!r || r.userId !== params.userId) throw new Error("NOT_FOUND");
    const to = nextRedemptionStatus(r.status as RedemptionStatus, "cancel");
    if (!to) throw new Error("INVALID_TRANSITION");
    await tx.redemption.update({ where: { id: r.id }, data: { status: to } });
    if (isRefundExit(to)) {
      await tx.stampEvent.create({
        data: {
          userId: r.userId,
          delta: r.stampCost,
          reason: "REFUND",
          sourceType: "Redemption",
          sourceId: r.id,
          redemptionId: r.id,
        },
      });
    }
    return to;
  }, { isolationLevel: "Serializable" });
}

// 관리자 처리: approve/reject/fulfill. 환급 종단이면 REFUND 이벤트.
export async function processRedemption(params: { id: string; action: RedemptionAction; adminId: string }) {
  return db.$transaction(async (tx) => {
    const r = await tx.redemption.findUnique({ where: { id: params.id } });
    if (!r) throw new Error("NOT_FOUND");
    const to = nextRedemptionStatus(r.status as RedemptionStatus, params.action);
    if (!to) throw new Error("INVALID_TRANSITION");
    await tx.redemption.update({
      where: { id: r.id },
      data: { status: to, processedByAdminId: params.adminId, processedAt: new Date() },
    });
    if (isRefundExit(to)) {
      await tx.stampEvent.create({
        data: {
          userId: r.userId,
          delta: r.stampCost,
          reason: "REFUND",
          sourceType: "Redemption",
          sourceId: r.id,
          redemptionId: r.id,
          adminId: params.adminId,
        },
      });
    }
    return to;
  }, { isolationLevel: "Serializable" });
}
