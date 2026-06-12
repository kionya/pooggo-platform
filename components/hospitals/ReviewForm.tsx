"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addReview } from "@/app/actions";

export default function ReviewForm({ hospitalId }: { hospitalId: string }) {
  const t = useTranslations("Detail");
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(5);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSaving(true);
    setErrors([]);
    const fd = new FormData(form);
    fd.set("hospitalId", hospitalId);
    fd.set("rating", String(rating));
    const res = await addReview(fd);
    setSaving(false);
    if (res && !res.ok) { setErrors(res.errors); return; }
    form.reset();
    setRating(5);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
          {errors.map((er, i) => <div key={i}>• {er}</div>)}
        </div>
      )}
      <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border p-2 rounded-lg text-sm">
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
      </select>
      <textarea name="content" placeholder={t("reviewContent")} required rows={3} className="w-full border p-3 rounded-lg text-sm" />
      <button type="submit" disabled={saving} className="bg-blue-600 text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50">
        {t("reviewSubmit")}
      </button>
    </form>
  );
}
