import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { hasRole } from "./roles";

// 세션 + 역할 가드. 불충족 시 /admin/login 으로 리다이렉트.
export async function requireRole(allowed: string[]) {
  const session = await auth();
  if (!session || !hasRole(session.user?.role, allowed)) {
    redirect("/admin/login");
  }
  return session;
}

// 병원 포털 가드: HOSPITAL 역할 + hospitalId 보유. 불충족 시 /hospital/login.
export async function requireHospital() {
  const session = await auth();
  if (!session || !hasRole(session.user?.role, ["HOSPITAL"]) || !session.user?.hospitalId) {
    redirect("/hospital/login");
  }
  return session;
}

// 환자 가드: PATIENT 역할. 불충족 시 현재 로케일의 /account/login 으로 리다이렉트.
export async function requirePatient() {
  const session = await auth();
  if (!session || !hasRole(session.user?.role, ["PATIENT"])) {
    const locale = await getLocale();
    redirect(`/${locale}/account/login`);
  }
  return session;
}
