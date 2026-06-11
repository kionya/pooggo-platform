"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireHospital } from "@/lib/auth/guard";
import { pickHospitalEditableFields, validateHospitalProfile } from "@/lib/hospital/editable";
import { ownsBooking } from "@/lib/auth/ownership";
import { canTransition } from "@/lib/booking/status";
import type { HospitalInput } from "@/lib/hospital/types";

export async function updateHospitalProfile(input: HospitalInput): Promise<{ ok: boolean; errors: string[] }> {
  const session = await requireHospital();
  const hospitalId = session.user.hospitalId as string;
  const errors = validateHospitalProfile(input);
  if (errors.length) return { ok: false, errors };
  const f = pickHospitalEditableFields(input);
  try {
    await db.hospital.update({
      where: { id: hospitalId },
      data: {
        name: f.name, intro: f.intro, about: f.about, address: f.address, cautions: f.cautions,
        city: f.city.trim(), district: f.district.trim(), category: f.category, tags: f.tags,
        image: f.image, images: f.images, operatingHours: f.operatingHours, messengers: f.messengers,
        doctors: { deleteMany: {}, create: f.doctors.map((d) => ({ name: d.name, specialty: d.specialty, image: d.image || null, order: d.order })) },
      },
    });
    revalidatePath("/hospital/profile");
    revalidatePath(`/hospitals/${hospitalId}`);
    return { ok: true, errors: [] };
  } catch (e: any) {
    return { ok: false, errors: ["저장 실패: " + String(e?.message || e)] };
  }
}

export async function updateOwnBookingStatus(bookingId: string, next: string): Promise<void> {
  const session = await requireHospital();
  const b = await db.booking.findUnique({ where: { id: bookingId } });
  if (!b || !ownsBooking(session, b.hospitalId)) return;
  if (!canTransition(b.status, next)) return;
  await db.booking.update({ where: { id: bookingId }, data: { status: next } });
  revalidatePath("/hospital/bookings");
}
