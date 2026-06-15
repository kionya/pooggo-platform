"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guard";
import { validateHospitalInput } from "@/lib/hospital/validation";
import type { HospitalInput } from "@/lib/hospital/types";

type Result = { ok: boolean; errors: string[]; id?: string };

function scalarData(input: HospitalInput) {
  return {
    slug: input.slug.trim(),
    name: input.name, intro: input.intro, about: input.about,
    address: input.address, cautions: input.cautions,
    city: input.city.trim(), district: input.district.trim(),
    category: input.category, tags: input.tags,
    image: input.image, images: input.images,
    operatingHours: input.operatingHours, messengers: input.messengers,
    isPublished: input.isPublished,
  };
}

function doctorsCreate(input: HospitalInput) {
  return input.doctors.map((d) => ({
    name: d.name, specialty: d.specialty, image: d.image || null, order: d.order,
  }));
}

function menusCreate(input: HospitalInput) {
  return input.menus.map((m) => ({
    name: m.name, category: m.category, price: m.price,
    priceText: m.priceText, currency: m.currency, order: m.order,
  }));
}

export async function createHospital(input: HospitalInput): Promise<Result> {
  await requireRole(["SUPER_ADMIN"]);
  const errors = validateHospitalInput(input);
  if (errors.length) return { ok: false, errors };
  try {
    const created = await db.hospital.create({
      data: {
        ...scalarData(input),
        doctors: { create: doctorsCreate(input) },
        menus: { create: menusCreate(input) },
      },
    });
    revalidatePath("/admin/hospitals");
    revalidatePath("/");
    return { ok: true, errors: [], id: created.id };
  } catch (e: any) {
    return { ok: false, errors: [e?.code === "P2002" ? "이미 존재하는 slug입니다." : "저장 실패: " + String(e?.message || e)] };
  }
}

export async function updateHospital(id: string, input: HospitalInput): Promise<Result> {
  await requireRole(["SUPER_ADMIN"]);
  const errors = validateHospitalInput(input);
  if (errors.length) return { ok: false, errors };
  try {
    await db.hospital.update({
      where: { id },
      data: {
        ...scalarData(input),
        // deleteMany는 이 병원의 의사/메뉴로 자동 스코프됨(부모 update where: {id})
        doctors: { deleteMany: {}, create: doctorsCreate(input) },
        menus: { deleteMany: {}, create: menusCreate(input) },
      },
    });
    revalidatePath("/admin/hospitals");
    revalidatePath(`/hospitals/${id}`);
    revalidatePath("/");
    return { ok: true, errors: [], id };
  } catch (e: any) {
    return { ok: false, errors: [e?.code === "P2002" ? "이미 존재하는 slug입니다." : "수정 실패: " + String(e?.message || e)] };
  }
}

export async function deleteHospital(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireRole(["SUPER_ADMIN"]);
  try {
    await db.$transaction(async (tx) => {
      const active = await tx.redemption.count({
        where: { hospitalId: id, status: { in: ["REQUESTED", "APPROVED"] } },
      });
      if (active > 0) {
        throw new Error("진행 중인 교환 신청이 있어 삭제할 수 없습니다. 먼저 교환 건을 처리하세요.");
      }
      await tx.redemption.deleteMany({ where: { hospitalId: id } });
      await tx.menu.deleteMany({ where: { hospitalId: id } });
      await tx.doctor.deleteMany({ where: { hospitalId: id } });
      await tx.review.deleteMany({ where: { hospitalId: id } });
      await tx.treatment.deleteMany({ where: { hospitalId: id } });
      await tx.lead.updateMany({ where: { hospitalId: id }, data: { hospitalId: null } });
      await tx.hospital.delete({ where: { id } });
    });
    revalidatePath("/admin/hospitals");
    revalidatePath("/");
    return { ok: true };
  } catch (e: any) {
    console.error("병원 삭제 실패(연결된 상담/예약 존재 가능):", e);
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export async function togglePublish(id: string, next: boolean): Promise<void> {
  await requireRole(["SUPER_ADMIN"]);
  try {
    await db.hospital.update({ where: { id }, data: { isPublished: next } });
    revalidatePath("/admin/hospitals");
    revalidatePath("/");
  } catch (e) {
    console.error("공개 토글 실패:", e);
  }
}
