"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createBooking } from "@/app/[locale]/booking/actions";
import { MESSENGER_CHANNELS, GENDERS } from "@/lib/booking/types";
import { inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function BookingForm({ hospitalIds, hospitalNames }: { hospitalIds: string[]; hospitalNames: string[] }) {
  const t = useTranslations("Booking");
  const locale = useLocale();
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const fd = new FormData(e.currentTarget);
    fd.set("hospitalIds", hospitalIds.join(","));
    fd.set("locale", locale);
    const res = await createBooking(fd);
    setSaving(false);
    if (res && !res.ok) setErrors(res.errors);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 bg-cream p-6 rounded-2xl border border-stone-200 shadow-[var(--shadow-card)]">
      <div className="text-sm text-stone-600">{t("forHospitals")}: <b className="text-navy-900">{hospitalNames.join(", ")}</b></div>
      {errors.length > 0 && (
        <div className="bg-clay-600/10 border border-clay-600/30 text-clay-700 p-3 rounded-lg text-sm">
          {errors.map((er, i) => <div key={i}>• {er}</div>)}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-semibold text-navy-900">{t("name")}<input name="name" required className={`${inputClass} mt-1`} /></label>
        <label className="text-sm font-semibold text-navy-900">{t("phone")}<input name="phone" required className={`${inputClass} mt-1`} /></label>
        <label className="text-sm font-semibold text-navy-900">{t("nationality")}<input name="nationality" required className={`${inputClass} mt-1`} /></label>
        <label className="text-sm font-semibold text-navy-900">{t("email")}<input name="email" type="email" className={`${inputClass} mt-1`} /></label>
        <label className="text-sm font-semibold text-navy-900">{t("age")}<input name="age" type="number" className={`${inputClass} mt-1`} /></label>
        <label className="text-sm font-semibold text-navy-900">{t("gender")}
          <select name="gender" className={`${inputClass} mt-1`}>
            <option value="">-</option>
            {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-navy-900">{t("messenger")}
          <select name="messengerChannel" className={`${inputClass} mt-1`}>
            <option value="">-</option>
            {MESSENGER_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-navy-900">{t("handle")}<input name="messengerHandle" className={`${inputClass} mt-1`} /></label>
      </div>
      <label className="text-sm font-semibold text-navy-900 block">{t("interest")}<input name="treatmentInterest" className={`${inputClass} mt-1`} /></label>
      <label className="text-sm font-semibold text-navy-900 block">{t("memo")}<textarea name="memo" className={`${inputClass} mt-1 h-20`} /></label>
      <label className="text-sm font-semibold text-navy-900 block">{t("photo")}<input name="photo" type="file" accept="image/*" className={`${inputClass} mt-1`} /></label>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm font-semibold text-navy-900">{t("date1")}<input name="preferredDate1" type="date" required className={`${inputClass} mt-1`} /></label>
        <label className="text-sm font-semibold text-navy-900">{t("date2")}<input name="preferredDate2" type="date" className={`${inputClass} mt-1`} /></label>
        <label className="text-sm font-semibold text-navy-900">{t("timeOfDay")}
          <select name="timeOfDay" required defaultValue="MORNING" className={`${inputClass} mt-1`}>
            <option value="MORNING">{t("morning")}</option>
            <option value="AFTERNOON">{t("afternoon")}</option>
            <option value="EVENING">{t("evening")}</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-navy-900"><input name="consent" type="checkbox" /> {t("consent")}</label>
      <p className="text-xs text-stone-400">{t("notConfirmed")}</p>
      <Button type="submit" disabled={saving} className="w-full">{saving ? t("submitting") : t("submit")}</Button>
    </form>
  );
}
