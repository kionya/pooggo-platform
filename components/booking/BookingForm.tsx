"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createBooking } from "@/app/[locale]/booking/actions";
import { MESSENGER_CHANNELS, GENDERS } from "@/lib/booking/types";

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
    <form onSubmit={onSubmit} className="space-y-4 bg-white p-6 rounded-2xl border">
      <div className="text-sm text-gray-500">{t("forHospitals")}: <b>{hospitalNames.join(", ")}</b></div>
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
          {errors.map((er, i) => <div key={i}>• {er}</div>)}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-bold">{t("name")}<input name="name" required className="w-full border p-2 rounded mt-1" /></label>
        <label className="text-sm font-bold">{t("phone")}<input name="phone" required className="w-full border p-2 rounded mt-1" /></label>
        <label className="text-sm font-bold">{t("nationality")}<input name="nationality" required className="w-full border p-2 rounded mt-1" /></label>
        <label className="text-sm font-bold">{t("email")}<input name="email" type="email" className="w-full border p-2 rounded mt-1" /></label>
        <label className="text-sm font-bold">{t("age")}<input name="age" type="number" className="w-full border p-2 rounded mt-1" /></label>
        <label className="text-sm font-bold">{t("gender")}
          <select name="gender" className="w-full border p-2 rounded mt-1 bg-white">
            <option value="">-</option>
            {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">{t("messenger")}
          <select name="messengerChannel" className="w-full border p-2 rounded mt-1 bg-white">
            <option value="">-</option>
            {MESSENGER_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">{t("handle")}<input name="messengerHandle" className="w-full border p-2 rounded mt-1" /></label>
      </div>
      <label className="text-sm font-bold block">{t("interest")}<input name="treatmentInterest" className="w-full border p-2 rounded mt-1" /></label>
      <label className="text-sm font-bold block">{t("memo")}<textarea name="memo" className="w-full border p-2 rounded mt-1 h-20" /></label>
      <label className="text-sm font-bold block">{t("photo")}<input name="photo" type="file" accept="image/*" className="w-full border p-2 rounded mt-1" /></label>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm font-bold">{t("date1")}<input name="preferredDate1" type="date" required className="w-full border p-2 rounded mt-1" /></label>
        <label className="text-sm font-bold">{t("date2")}<input name="preferredDate2" type="date" className="w-full border p-2 rounded mt-1" /></label>
        <label className="text-sm font-bold">{t("timeOfDay")}
          <select name="timeOfDay" required defaultValue="MORNING" className="w-full border p-2 rounded mt-1 bg-white">
            <option value="MORNING">{t("morning")}</option>
            <option value="AFTERNOON">{t("afternoon")}</option>
            <option value="EVENING">{t("evening")}</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input name="consent" type="checkbox" /> {t("consent")}</label>
      <p className="text-xs text-gray-400">{t("notConfirmed")}</p>
      <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">{saving ? t("submitting") : t("submit")}</button>
    </form>
  );
}
