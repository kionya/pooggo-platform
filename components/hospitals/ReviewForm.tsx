"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addReview } from "@/app/actions";
import { inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function ReviewForm({ hospitalId }: { hospitalId: string }) {
  const t = useTranslations("Detail");
  const tErr = useTranslations("Errors");
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
        <div className="bg-clay-600/10 border border-clay-600/30 text-clay-700 p-3 rounded-lg text-sm">
          {errors.map((er, i) => <div key={i}>• {tErr(er)}</div>)}
        </div>
      )}
      <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className={`${inputClass} w-auto text-sm`}>
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
      </select>
      <textarea name="content" placeholder={t("reviewContent")} required rows={3} className={`${inputClass} text-sm`} />
      <Button type="submit" disabled={saving} size="sm">
        {t("reviewSubmit")}
      </Button>
    </form>
  );
}
