import crypto from "crypto";
import { REDEEM_COST, type RedemptionStatus } from "./config";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 혼동 문자 제외

export function generateRedemptionCode(): string {
  const bytes = crypto.randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `PGS-${s}`;
}

export function canRedeem(balance: number, cost: number = REDEEM_COST): boolean {
  return balance >= cost;
}

export type RedemptionAction = "approve" | "reject" | "fulfill" | "cancel";

const NEXT: Record<RedemptionStatus, Partial<Record<RedemptionAction, RedemptionStatus>>> = {
  REQUESTED: { approve: "APPROVED", reject: "REJECTED", cancel: "CANCELLED" },
  APPROVED: { fulfill: "FULFILLED", reject: "REJECTED", cancel: "CANCELLED" },
  FULFILLED: {},
  REJECTED: {},
  CANCELLED: {},
};

export function nextRedemptionStatus(from: RedemptionStatus, action: RedemptionAction): RedemptionStatus | null {
  return NEXT[from]?.[action] ?? null;
}

// 종단 진입 시 차감했던 스탬프를 환급해야 하는 상태
export function isRefundExit(status: RedemptionStatus): boolean {
  return status === "REJECTED" || status === "CANCELLED";
}
