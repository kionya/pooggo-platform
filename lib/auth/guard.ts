import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasRole } from "./roles";

// 세션 + 역할 가드. 불충족 시 /admin/login 으로 리다이렉트.
export async function requireRole(allowed: string[]) {
  const session = await auth();
  if (!session || !hasRole(session.user?.role, allowed)) {
    redirect("/admin/login");
  }
  return session;
}
