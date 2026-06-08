import crypto from "crypto";

export const ADMIN_COOKIE = "rd_admin";
export const TOKEN_TTL_MS = 1000 * 60 * 60 * 8; // 8시간

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ADMIN_SESSION_SECRET 미설정 (프로덕션 필수).");
    }
    return "dev-insecure-secret-change-me";
  }
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createToken(ttlMs: number = TOKEN_TTL_MS): string {
  const payload = JSON.stringify({ exp: Date.now() + ttlMs });
  const b64 = Buffer.from(payload).toString("base64");
  return `${b64}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return false;

  let payload: string;
  try {
    payload = Buffer.from(b64, "base64").toString();
  } catch {
    return false;
  }

  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  let sigOk = false;
  try {
    sigOk = crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
  if (!sigOk) return false;

  try {
    const parsed = JSON.parse(payload) as { exp?: number };
    return typeof parsed.exp === "number" && Date.now() < parsed.exp;
  } catch {
    return false;
  }
}

export function safeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}
