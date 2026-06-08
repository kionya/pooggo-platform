"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABEL: Record<string, string> = { ko: "KR", en: "EN", zh: "CN", ja: "JP" };

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className="flex items-center gap-3 text-sm font-bold text-gray-400">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          className={l === locale ? "text-gray-900 cursor-pointer" : "hover:text-gray-900 cursor-pointer transition"}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
