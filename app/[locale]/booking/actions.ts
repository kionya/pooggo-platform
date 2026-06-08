"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { validateBookingInput } from "@/lib/booking/validation";
import type { BookingInput } from "@/lib/booking/types";
import { makeBookingCode } from "@/lib/booking/code";
import { uploadBookingPhoto } from "@/lib/upload/blob";
import { sendBookingNotifications } from "@/lib/notify";
import { resolveText } from "@/lib/i18n/text";
import crypto from "crypto";

export async function createBooking(formData: FormData): Promise<{ ok: boolean; errors: string[] }> {
  const hospitalIds = String(formData.get("hospitalIds") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const ageRaw = String(formData.get("age") || "").trim();
  const input: BookingInput = {
    hospitalIds,
    locale: String(formData.get("locale") || "ko"),
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    nationality: String(formData.get("nationality") || ""),
    email: String(formData.get("email") || ""),
    age: ageRaw ? Number(ageRaw) : null,
    gender: String(formData.get("gender") || ""),
    messengerChannel: String(formData.get("messengerChannel") || ""),
    messengerHandle: String(formData.get("messengerHandle") || ""),
    treatmentInterest: String(formData.get("treatmentInterest") || ""),
    memo: String(formData.get("memo") || ""),
    preferredDate1: String(formData.get("preferredDate1") || ""),
    preferredDate2: String(formData.get("preferredDate2") || ""),
    timeOfDay: String(formData.get("timeOfDay") || ""),
    consent: formData.get("consent") === "on" || formData.get("consent") === "true",
  };

  const errors = validateBookingInput(input);
  if (errors.length) return { ok: false, errors };

  const hospitals = await db.hospital.findMany({ where: { id: { in: input.hospitalIds }, isPublished: true } });
  if (hospitals.length === 0) return { ok: false, errors: ["hospital: 유효한 병원이 없습니다."] };

  const photo = await uploadBookingPhoto(formData.get("photo") as File | null);
  const multiple = hospitals.length > 1;
  const groupId = multiple ? crypto.randomUUID() : null;

  const created: { code: string; hospitalId: string }[] = [];
  for (const h of hospitals) {
    const code = makeBookingCode();
    await db.booking.create({
      data: {
        code, locale: input.locale, groupId, hospitalId: h.id,
        name: input.name, phone: input.phone, nationality: input.nationality,
        email: input.email || null, age: input.age, gender: input.gender || null,
        messengerChannel: input.messengerChannel || null, messengerHandle: input.messengerHandle || null,
        treatmentInterest: input.treatmentInterest || null, memo: input.memo || null, photo,
        preferredDate1: new Date(input.preferredDate1),
        preferredDate2: input.preferredDate2 ? new Date(input.preferredDate2) : null,
        timeOfDay: input.timeOfDay, consent: input.consent,
      },
    });
    created.push({ code, hospitalId: h.id });
  }

  const hospitalsById: Record<string, { name: string; email: string }> = {};
  for (const h of hospitals) {
    const msg = (h.messengers as any) || {};
    hospitalsById[h.id] = { name: resolveText(h.name, input.locale), email: typeof msg.email === "string" ? msg.email : "" };
  }
  const notifyRows = created.map((c) => ({
    code: c.code, hospitalId: c.hospitalId,
    name: input.name, phone: input.phone, nationality: input.nationality, email: input.email,
    preferredDate1: input.preferredDate1, preferredDate2: input.preferredDate2, timeOfDay: input.timeOfDay,
    treatmentInterest: input.treatmentInterest, memo: input.memo,
    messengerChannel: input.messengerChannel, messengerHandle: input.messengerHandle,
  }));
  await sendBookingNotifications(notifyRows, hospitalsById);

  if (groupId) redirect(`/${input.locale}/booking/success?group=${groupId}`);
  redirect(`/${input.locale}/booking/success?code=${created[0].code}`);
}
