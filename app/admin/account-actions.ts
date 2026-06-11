"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guard";

export async function approveHospitalAccount(userId: string): Promise<void> {
  await requireRole(["SUPER_ADMIN"]);
  await db.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
  revalidatePath("/admin/accounts");
}

export async function rejectHospitalAccount(userId: string): Promise<void> {
  await requireRole(["SUPER_ADMIN"]);
  await db.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
  revalidatePath("/admin/accounts");
}
