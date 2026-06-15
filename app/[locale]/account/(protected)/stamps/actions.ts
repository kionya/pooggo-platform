"use server";

import { requirePatient } from "@/lib/auth/guard";
import { requestRedemption, cancelRedemption } from "@/lib/stamps";
import { getLocale, getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

export async function requestRedemptionAction(formData: FormData): Promise<{ ok: boolean; errors: string[] }> {
  const session = await requirePatient();
  const t = await getTranslations("Stamps");
  const hospitalId = String(formData.get("hospitalId") ?? "");
  const note = String(formData.get("note") ?? "");
  if (!hospitalId) return { ok: false, errors: [t("errSelectHospital")] };
  try {
    await requestRedemption({ userId: session.user.id, hospitalId, note });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    const map: Record<string, string> = {
      INELIGIBLE_HOSPITAL: t("errIneligible"),
      INSUFFICIENT_BALANCE: t("errInsufficient"),
    };
    return { ok: false, errors: [map[msg] ?? t("errGeneric")] };
  }
  const locale = await getLocale();
  revalidatePath(`/${locale}/account/stamps`);
  return { ok: true, errors: [] };
}

export async function cancelRedemptionAction(id: string): Promise<{ ok: boolean; errors: string[] }> {
  const session = await requirePatient();
  const t = await getTranslations("Stamps");
  try {
    await cancelRedemption({ id, userId: session.user.id });
  } catch {
    return { ok: false, errors: [t("errCancel")] };
  }
  const locale = await getLocale();
  revalidatePath(`/${locale}/account/stamps`);
  return { ok: true, errors: [] };
}
