"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { requestRedemptionAction } from "@/app/[locale]/account/(protected)/stamps/actions";

type Hospital = { id: string; name: string };

export function RedeemForm({
  hospitals,
  labels,
}: {
  hospitals: Hospital[];
  labels: {
    selectHospital: string;
    note: string;
    notePlaceholder: string;
    submit: string;
    cautionsTitle: string;
    cautions: string;
    consent: string;
  };
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    start(async () => {
      const res = await requestRedemptionAction(formData);
      if (res.ok) {
        setErrors([]);
        router.refresh();
      } else {
        setErrors(res.errors);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <Field label={labels.selectHospital} htmlFor="hospitalId" required>
        <select id="hospitalId" name="hospitalId" className={inputClass} required>
          <option value="">—</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={labels.note} htmlFor="note">
        <textarea id="note" name="note" rows={3} className={inputClass} placeholder={labels.notePlaceholder} />
      </Field>

      <div className="rounded-lg border border-clay-600/30 bg-clay-600/10 p-4 text-sm text-clay-700">
        <p className="font-bold">{labels.cautionsTitle}</p>
        <p className="mt-1 whitespace-pre-line">{labels.cautions}</p>
      </div>

      <label className="flex items-center gap-2 text-sm text-navy-900">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        {labels.consent}
      </label>

      {errors.length > 0 && (
        <ul role="alert" className="rounded-lg border border-clay-600/30 bg-clay-600/10 p-3 text-sm text-clay-700">
          {errors.map((e, i) => (
            <li key={i}>• {e}</li>
          ))}
        </ul>
      )}

      <Button type="submit" disabled={!consent || pending}>
        {labels.submit}
      </Button>
    </form>
  );
}
