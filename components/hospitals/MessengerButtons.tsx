"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { buildMessengerLinks } from "@/lib/messengers";

export default function MessengerButtons({ messengers }: { messengers: Record<string, string> | null | undefined }) {
  const t = useTranslations("Detail");
  const [copied, setCopied] = useState<string | null>(null);
  const links = buildMessengerLinks(messengers);
  if (links.length === 0) return null;

  return (
    <div className="bg-cream rounded-2xl p-6 border border-stone-200 shadow-[var(--shadow-card)] mb-4">
      <h3 className="font-bold text-lg text-navy-900 mb-4">{t("messengers")}</h3>
      <div className="flex flex-wrap gap-2">
        {links.map((l) =>
          l.kind === "link" ? (
            <a key={l.channel} href={l.url} target="_blank" rel="noopener noreferrer"
               className="px-4 py-2 rounded-lg bg-navy-900 text-cream text-sm font-bold hover:bg-navy-700 transition-colors">
              {l.label}
            </a>
          ) : (
            <button key={l.channel} type="button"
              onClick={() => { navigator.clipboard?.writeText(l.value); setCopied(l.channel); setTimeout(() => setCopied(null), 2000); }}
              className="px-4 py-2 rounded-lg bg-stone-100 text-stone-700 text-sm font-bold hover:bg-stone-200 transition-colors border border-stone-200">
              {l.label}: {l.value} ({copied === l.channel ? t("copied") : t("copy")})
            </button>
          ),
        )}
      </div>
    </div>
  );
}
