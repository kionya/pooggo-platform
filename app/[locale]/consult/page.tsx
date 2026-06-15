import { createConsultation } from "@/app/actions";
import { inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function ConsultPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Consult");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ivory p-4">
      <div className="bg-cream p-8 rounded-2xl border border-stone-200 shadow-[var(--shadow-card)] w-full max-w-md">
        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-6 text-center">{t("title")}</h1>

        <form action={createConsultation} className="space-y-4">

          <div>
            <label className="block text-sm font-semibold text-navy-900 mb-1.5">{t("name")}</label>
            <input
              name="customerName"
              type="text"
              placeholder={t("namePlaceholder")}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy-900 mb-1.5">{t("phone")}</label>
            <input
              name="phone"
              type="text"
              placeholder="010-1234-5678"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy-900 mb-1.5">{t("content")}</label>
            <textarea
              name="content"
              placeholder={t("contentPlaceholder")}
              required
              className={`${inputClass} h-24`}
            ></textarea>
          </div>

          <Button type="submit" variant="primary" className="w-full">
            {t("submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
