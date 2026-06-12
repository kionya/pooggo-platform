"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guard";

export async function hideReview(id: string): Promise<void> {
  await requireRole(["SUPER_ADMIN"]);
  await db.review.update({ where: { id }, data: { isHidden: true } });
  revalidatePath("/admin/reviews");
}

export async function unhideReview(id: string): Promise<void> {
  await requireRole(["SUPER_ADMIN"]);
  await db.review.update({ where: { id }, data: { isHidden: false } });
  revalidatePath("/admin/reviews");
}

export async function deleteReview(id: string): Promise<void> {
  await requireRole(["SUPER_ADMIN"]);
  await db.review.delete({ where: { id } }); // Report는 Cascade 삭제
  revalidatePath("/admin/reviews");
}
