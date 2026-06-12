"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { registerPatient } from "@/app/[locale]/account/signup-actions";

export default function PatientSignupPage() {
  const t = useTranslations("Account");
  const locale = useLocale();
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const fd = new FormData(e.currentTarget);
    fd.set("locale", locale);
    const res = await registerPatient(fd);
    setSaving(false);
    if (res && !res.ok) setErrors(res.errors);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">{t("signupTitle")}</h1>
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-4">
            {errors.map((er, i) => <div key={i}>• {er}</div>)}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <input name="name" placeholder={t("name")} required className="w-full border p-3 rounded-lg" />
          <input name="email" type="email" placeholder={t("email")} required className="w-full border p-3 rounded-lg" />
          <input name="password" type="password" placeholder={t("password")} required className="w-full border p-3 rounded-lg" />
          <input name="passwordConfirm" type="password" placeholder={t("passwordConfirm")} required className="w-full border p-3 rounded-lg" />
          <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg disabled:opacity-50">
            {saving ? t("saving") : t("signupSubmit")}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4">
          <Link href="/account/login" className="hover:underline">{t("alreadyHaveAccount")}</Link>
        </p>
      </div>
    </div>
  );
}
