import crypto from "crypto";

export const ADMIN_COOKIE = "rd_admin";

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || "dev-insecure-secret-change-me";
}

export function createToken(): string {
  const payload = `admin.${Date.now()}`;
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64")}.${sig}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return false;
  const payload = Buffer.from(b64, "base64").toString();
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
