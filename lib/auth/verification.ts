import crypto from "crypto";

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function generateVerifyToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export function isVerifyTokenExpired(expires: Date | null, now: number): boolean {
  if (!expires) return true;
  return expires.getTime() <= now;
}
