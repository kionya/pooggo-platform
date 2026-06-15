"use server";

import { requireRole } from "@/lib/auth/guard";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { grantStamps, processRedemption } from "@/lib/stamps";
import type { RedemptionAction } from "@/lib/stamps/redemption";
import { revalidatePath } from "next/cache";

export async function grantStampsAction(formData: FormData): Promise<{ ok: boolean; errors: string[] }> {
  await requireRole(["SUPER_ADMIN"]);
  const session = await auth();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const delta = parseInt(String(formData.get("delta") ?? ""), 10);
  const note = String(formData.get("note") ?? "");
  if (!email) return { ok: false, errors: ["이메일을 입력하세요."] };
  if (!Number.isInteger(delta) || delta === 0) return { ok: false, errors: ["발급 수량(정수, 0 아님)을 입력하세요."] };

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { ok: false, errors: ["해당 이메일의 사용자가 없습니다."] };

  await grantStamps({
    userId: user.id,
    delta,
    reason: delta > 0 ? "ADMIN_GRANT" : "ADJUST",
    adminId: session?.user?.id,
    note,
  });
  revalidatePath("/admin/stamps");
  return { ok: true, errors: [] };
}

export async function processRedemptionAction(id: string, action: RedemptionAction): Promise<{ ok: boolean; errors: string[] }> {
  await requireRole(["SUPER_ADMIN"]);
  const session = await auth();
  try {
    await processRedemption({ id, action, adminId: session?.user?.id ?? "" });
  } catch {
    return { ok: false, errors: ["처리할 수 없는 상태입니다."] };
  }
  revalidatePath("/admin/redemptions");
  return { ok: true, errors: [] };
}
