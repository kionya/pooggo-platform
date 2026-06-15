import { Link } from "@/i18n/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

export default async function SuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { code } = await searchParams;
  const t = await getTranslations("Booking");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ivory p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-3xl font-bold font-serif text-navy-900 mb-2">{t("receivedTitle")}</h1>
        <p className="text-stone-600 mb-8">
          {t("codeLabel")}: <span className="font-mono font-bold text-teal-600">{code}</span>
          <br />
          {t("contactNote")}
        </p>
        <Link href="/" className="text-teal-600 hover:underline">
          {t("backHomeFull")}
        </Link>
      </div>
    </div>
  );
}
