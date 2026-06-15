// ⚠️ 금액·규칙은 추후 확정 — 본 상수는 1차 골격용 기본값.
export const STAMP_GOAL = 10;
export const REDEEM_COST = 10;
export const DEFAULT_BOOKING_STAMPS = 1; // 예약완료 수동 지급 기본값(placeholder)

export const STAMP_REASONS = [
  "EARN_BOOKING",
  "EARN_REVIEW",
  "ADMIN_GRANT",
  "REDEEM",
  "REFUND",
  "ADJUST",
] as const;
export type StampReason = (typeof STAMP_REASONS)[number];

export const REDEMPTION_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "FULFILLED",
  "REJECTED",
  "CANCELLED",
] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];
