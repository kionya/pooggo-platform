"use client";

import { useState } from "react";
import { LANGS, type I18nText, type Lang } from "@/lib/i18n/types";

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
  const incomplete = LANGS.some((l) => !value[l].trim());
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-bold text-gray-700">
          {label} {incomplete && <span className="text-red-500">*4개 언어 필수</span>}
        </label>
        <div className="flex gap-1">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setTab(l)}
              className={`px-2 py-0.5 text-xs rounded ${tab === l ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"} ${!value[l].trim() ? "ring-1 ring-red-300" : ""}`}
            >
              {LABEL[l]}
            </button>
          ))}
        </div>
      </div>
      {multiline ? (
        <textarea
          value={value[tab]}
          onChange={(e) => onChange({ ...value, [tab]: e.target.value })}
          className="w-full border border-gray-200 p-3 rounded-lg h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
        />
      ) : (
        <input
          value={value[tab]}
          onChange={(e) => onChange({ ...value, [tab]: e.target.value })}
          className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      )}
    </div>
  );
}
