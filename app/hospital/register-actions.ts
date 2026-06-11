"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { hashPassword } from "@/lib/auth/password";
import { validateHospitalRegistration } from "@/lib/hospital/registration";
import { EMPTY_I18N } from "@/lib/i18n/types";

export async function registerHospital(formData: FormData): Promise<{ ok: boolean; errors: string[] }> {
  const input = {
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    passwordConfirm: String(formData.get("passwordConfirm") || ""),
    hospitalName: String(formData.get("hospitalName") || ""),
  };
  const errors = validateHospitalRegistration(input);
  if (errors.length) return { ok: false, errors };

  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { ok: false, errors: ["email: 이미 가입된 이메일입니다."] };

  const passwordHash = await hashPassword(input.password);
  const name = { ko: input.hospitalName, en: input.hospitalName, zh: input.hospitalName, ja: input.hospitalName };
  const emptyHours = {
    mon: { open: "", close: "", closed: true }, tue: { open: "", close: "", closed: true }, wed: { open: "", close: "", closed: true },
    thu: { open: "", close: "", closed: true }, fri: { open: "", close: "", closed: true }, sat: { open: "", close: "", closed: true },
    sun: { open: "", close: "", closed: true }, note: { ...EMPTY_I18N },
  };
  const emptyMsg = { whatsapp: "", line: "", wechat: "", kakao: "", messenger: "", phone: "", email: "" };

  try {
    await db.$transaction(async (tx) => {
      const hospital = await tx.hospital.create({
        data: {
          slug: `pending-${crypto.randomUUID().slice(0, 8)}`,
          name, intro: { ...EMPTY_I18N }, about: { ...EMPTY_I18N }, address: { ...EMPTY_I18N }, cautions: { ...EMPTY_I18N },
          benefits: {}, city: "", district: "", category: "ETC", tags: "", image: "", images: [],
          operatingHours: emptyHours, messengers: emptyMsg, tier: "RECOMMENDED", isPublished: false,
        },
      });
      await tx.user.create({
        data: { email, passwordHash, role: "HOSPITAL", status: "PENDING", hospitalId: hospital.id },
      });
    });
  } catch (e: any) {
    return { ok: false, errors: ["등록 실패: " + String(e?.message || e)] };
  }
  redirect("/hospital/register/success");
}
