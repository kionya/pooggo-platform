"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { generateVerifyToken, VERIFY_TOKEN_TTL_MS } from "@/lib/auth/verification";
import { sendEmail } from "@/lib/notify/email";
import { verificationEmail } from "@/lib/notify/templates";

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function resendVerification(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") || "ko");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  // 열거 방지: PENDING 환자에게만 실제 재발송, 그 외엔 무시. 항상 동일 결과로 이동.
  if (user && user.role === "PATIENT" && user.status === "PENDING") {
    const token = generateVerifyToken();
    await db.user.update({ where: { id: user.id }, data: { emailVerifyToken: token, emailVerifyExpires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS) } });
    const link = `${await baseUrl()}/${locale}/account/verify?token=${token}`;
    const mail = verificationEmail(link, locale);
    const sent = await sendEmail({ to: email, subject: mail.subject, html: mail.html });
    if (sent.skipped) console.info(`[verify] 재발송 링크(이메일 미발송): ${link}`);
  }
  redirect(`/${locale}/account/verify-sent?email=${encodeURIComponent(email)}&resent=1`);
}
