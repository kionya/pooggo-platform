"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { reportReview } from "@/app/actions";

export default function ReportButton({ reviewId }: { reviewId: string }) {
  const t = useTranslations("Detail");
  const tErr = useTranslations("Errors");
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("reviewId", reviewId);
    const res = await reportReview(fd);
    if (res.ok) { setDone(true); setOpen(false); }
    else setMsg(res.errors[0] ? tErr(res.errors[0]) : "");
  }

  if (done) return <span className="text-xs text-gray-400">{t("reported")}</span>;
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs text-gray-400 hover:text-red-500">{t("reportReview")}</button>;

  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-1">
      <input name="reason" placeholder={t("reportReason")} className="border p-1 rounded text-xs" />
      {msg && <span className="text-xs text-red-500">{msg}</span>}
      <button type="submit" className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded self-start">{t("reportSubmit")}</button>
    </form>
  );
}
