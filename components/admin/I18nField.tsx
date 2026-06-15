"use client";

import { useId, useState } from "react";
import { LANGS, type I18nText, type Lang } from "@/lib/i18n/types";
import { inputClass } from "@/components/ui/Field";

const LABEL: Record<Lang, string> = { ko: "KR", en: "EN", zh: "CN", ja: "JP" };

export default function I18nField({
  label, value, onChange, multiline = false,
}: {
  label: string;
  value: I18nText;
  onChange: (v: I18nText) => void;
  multiline?: boolean;
}) {
  const [tab, setTab] = useState<Lang>("ko");
  const baseId = useId();
  const fieldId = `${baseId}-${tab}`;
  const incomplete = LANGS.some((l) => !value[l].trim());
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={fieldId} className="text-sm font-bold text-navy-900">
          {label} {incomplete && <span className="text-clay-600">*4개 언어 필수</span>}
        </label>
        <div className="flex gap-1">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setTab(l)}
              className={`px-2 py-0.5 text-xs rounded font-bold transition-colors ${tab === l ? "bg-navy-900 text-cream" : "bg-stone-100 text-stone-600 hover:bg-stone-200"} ${!value[l].trim() ? "ring-1 ring-clay-600/50" : ""}`}
            >
              {LABEL[l]}
            </button>
          ))}
        </div>
      </div>
      {multiline ? (
        <textarea
          id={fieldId}
          value={value[tab]}
          onChange={(e) => onChange({ ...value, [tab]: e.target.value })}
          className={`${inputClass} h-24 resize-none`}
        />
      ) : (
        <input
          id={fieldId}
          value={value[tab]}
          onChange={(e) => onChange({ ...value, [tab]: e.target.value })}
          className={inputClass}
        />
      )}
    </div>
  );
}
