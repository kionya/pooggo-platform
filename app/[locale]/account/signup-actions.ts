"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { hashPassword } from "@/lib/auth/password";
import { validatePatientSignup } from "@/lib/auth/patient-registration";

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
  try {
    await db.user.create({
      data: { email, passwordHash, name: input.name.trim(), role: "PATIENT", status: "ACTIVE" },
    });
  } catch (e: any) {
    return { ok: false, errors: ["가입 실패: " + String(e?.message || e)] };
  }

  // 즉시 ACTIVE → 자동 로그인 후 계정 홈으로. signIn은 성공 시 NEXT_REDIRECT를 throw한다.
  try {
    await signIn("credentials", { email, password: input.password, redirectTo: `/${locale}/account` });
  } catch (e) {
    if (e instanceof AuthError) redirect(`/${locale}/account/login`);
    throw e; // NEXT_REDIRECT 통과(성공 리다이렉트)
  }
  return { ok: true, errors: [] };
}
