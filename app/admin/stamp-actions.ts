"use server";

import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { grantStamps, processRedemption } from "@/lib/stamps";
import type { RedemptionAction } from "@/lib/stamps/redemption";
import { revalidatePath } from "next/cache";

export async function grantStampsAction(formData: FormData): Promise<void> {
  const session = await requireRole(["SUPER_ADMIN"]);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const delta = parseInt(String(formData.get("delta") ?? ""), 10);
  const note = String(formData.get("note") ?? "");
  // 폼 액션 — 반환값 미사용. 잘못된 입력은 조용히 무시한다.
  if (!email) return;
  if (!Number.isInteger(delta) || delta === 0) return;

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return;

  await grantStamps({
    userId: user.id,
    delta,
    reason: delta > 0 ? "ADMIN_GRANT" : "ADJUST",
    adminId: session?.user?.id,
    note,
  });
  revalidatePath("/admin/stamps");
}

export async function processRedemptionAction(id: string, action: RedemptionAction): Promise<void> {
  const session = await requireRole(["SUPER_ADMIN"]);
  try {
    await processRedemption({ id, action, adminId: session?.user?.id ?? "" });
  } catch {
    return;
  }
  revalidatePath("/admin/redemptions");
}
