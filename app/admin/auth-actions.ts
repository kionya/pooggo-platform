"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createToken, verifyToken, ADMIN_COOKIE, safeEqualStr, TOKEN_TTL_MS } from "@/lib/auth";

export async function login(formData: FormData) {
  const pass = formData.get("password");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || typeof pass !== "string" || !safeEqualStr(pass, expected)) {
    redirect("/admin/login?error=1");
  }
  const c = await cookies();
  c.set(ADMIN_COOKIE, createToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_MS / 1000,
  });
  redirect("/admin");
}

export async function logout() {
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function requireAdmin() {
  const c = await cookies();
  if (!verifyToken(c.get(ADMIN_COOKIE)?.value)) redirect("/admin/login");
}
