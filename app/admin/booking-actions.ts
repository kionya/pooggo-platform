"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guard";
import { canTransition } from "@/lib/booking/status";

export async function updateBookingStatus(id: string, next: string): Promise<void> {
  await requireRole(["SUPER_ADMIN"]);
  const b = await db.booking.findUnique({ where: { id } });
  if (!b) return;
  if (!canTransition(b.status, next)) {
    console.warn(`[booking] 잘못된 전이 ${b.status}→${next}`);
    return;
  }
  await db.booking.update({ where: { id }, data: { status: next } });
  revalidatePath("/admin/bookings");
}
