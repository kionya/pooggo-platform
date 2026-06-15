"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { registerPatient } from "@/app/[locale]/account/signup-actions";
import { inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

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
    <div className="min-h-screen flex items-center justify-center bg-ivory p-4">
      <div className="bg-cream p-8 rounded-2xl border border-stone-200 shadow-[var(--shadow-card)] w-full max-w-md">
        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-6 text-center">{t("signupTitle")}</h1>
        {errors.length > 0 && (
          <div className="bg-clay-600/10 border border-clay-600/30 text-clay-700 p-3 rounded-lg text-sm mb-4">
            {errors.map((er, i) => <div key={i}>• {er}</div>)}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <input name="name" placeholder={t("name")} required className={inputClass} />
          <input name="email" type="email" placeholder={t("email")} required className={inputClass} />
          <input name="password" type="password" placeholder={t("password")} required className={inputClass} />
          <input name="passwordConfirm" type="password" placeholder={t("passwordConfirm")} required className={inputClass} />
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? t("saving") : t("signupSubmit")}
          </Button>
        </form>
        <p className="text-center text-sm text-stone-400 mt-4">
          <Link href="/account/login" className="hover:underline hover:text-navy-900">{t("alreadyHaveAccount")}</Link>
        </p>
      </div>
    </div>
  );
}
