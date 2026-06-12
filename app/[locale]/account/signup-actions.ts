"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { hashPassword } from "@/lib/auth/password";
import { validatePatientSignup } from "@/lib/auth/patient-registration";
import { generateVerifyToken, VERIFY_TOKEN_TTL_MS } from "@/lib/auth/verification";
import { sendEmail } from "@/lib/notify/email";
import { verificationEmail } from "@/lib/notify/templates";

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function registerPatient(formData: FormData): Promise<{ ok: boolean; errors: string[] }> {
  const input = {
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    passwordConfirm: String(formData.get("passwordConfirm") || ""),
    name: String(formData.get("name") || ""),
  };
  const locale = String(formData.get("locale") || "ko");

  const errors = validatePatientSignup(input);
  if (errors.length) return { ok: false, errors };

  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { ok: false, errors: ["email: 이미 가입된 이메일입니다."] };

  const passwordHash = await hashPassword(input.password);
  const token = generateVerifyToken();
  const expires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
  try {
    await db.user.create({
      data: {
        email, passwordHash, name: input.name.trim(), role: "PATIENT", status: "PENDING",
        emailVerifyToken: token, emailVerifyExpires: expires,
      },
    });
  } catch (e: any) {
    return { ok: false, errors: ["가입 실패: " + String(e?.message || e)] };
  }

  // 인증 메일 발송(키 미설정 시 콘솔 폴백)
  const link = `${await baseUrl()}/${locale}/account/verify?token=${token}`;
  const mail = verificationEmail(link, locale);
  const sent = await sendEmail({ to: email, subject: mail.subject, html: mail.html });
  if (sent.skipped) console.info(`[verify] 인증 링크(이메일 미발송): ${link}`);

  redirect(`/${locale}/account/verify-sent?email=${encodeURIComponent(email)}`);
}
