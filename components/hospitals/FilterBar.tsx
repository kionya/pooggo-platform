"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { HOSPITAL_CATEGORIES } from "@/lib/hospital/validation";
import { HOSPITAL_TIERS } from "@/lib/hospital/tier";

export default function FilterBar({ current }: { current: Record<string, string> }) {
  const t = useTranslations("Filters");
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const params = new URLSearchParams(current);
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="bg-white border rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
      <div>
        <label htmlFor="f-city" className="block text-xs font-bold text-gray-500 mb-1">{t("region")}</label>
        <input id="f-city" defaultValue={current.city ?? ""} onBlur={(e) => update("city", e.target.value)} placeholder="Seoul" className="border p-2 rounded-lg text-sm w-28" />
      </div>
      <div>
        <label htmlFor="f-category" className="block text-xs font-bold text-gray-500 mb-1">{t("category")}</label>
        <select id="f-category" value={current.category ?? ""} onChange={(e) => update("category", e.target.value)} className="border p-2 rounded-lg text-sm bg-white">
          <option value="">{t("all")}</option>
          {HOSPITAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="f-tier" className="block text-xs font-bold text-gray-500 mb-1">{t("tier")}</label>
        <select id="f-tier" value={current.tier ?? ""} onChange={(e) => update("tier", e.target.value)} className="border p-2 rounded-lg text-sm bg-white">
          <option value="">{t("all")}</option>
          {HOSPITAL_TIERS.map((tr) => <option key={tr} value={tr}>{tr}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="f-minRating" className="block text-xs font-bold text-gray-500 mb-1">{t("minRating")}</label>
        <select id="f-minRating" value={current.minRating ?? ""} onChange={(e) => update("minRating", e.target.value)} className="border p-2 rounded-lg text-sm bg-white">
          <option value="">{t("all")}</option>
          <option value="4.5">4.5+</option>
          <option value="4.8">4.8+</option>
        </select>
      </div>
      <div>
        <label htmlFor="f-q" className="block text-xs font-bold text-gray-500 mb-1">{t("keyword")}</label>
        <input id="f-q" defaultValue={current.q ?? ""} onBlur={(e) => update("q", e.target.value)} placeholder={t("keyword")} className="border p-2 rounded-lg text-sm w-32" />
      </div>
      <button type="button" onClick={() => router.replace(pathname)} className="text-sm text-gray-500 underline">{t("reset")}</button>
    </div>
  );
}
