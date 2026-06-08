import { setRequestLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { parseHospitalIds } from "@/lib/booking/ids";
import BookingForm from "@/components/booking/BookingForm";
import { Link } from "@/i18n/navigation";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ hospital?: string; hospitals?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("Booking");
  const ids = parseHospitalIds(sp);
  const rows = ids.length ? await db.hospital.findMany({ where: { id: { in: ids }, isPublished: true } }) : [];
  const ordered = ids.map((id) => rows.find((h) => h.id === id)).filter(Boolean) as typeof rows;

  if (ordered.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 mb-6">{t("forHospitals")}: -</p>
        <Link href="/hospitals" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">{t("backHome")}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>
      <BookingForm hospitalIds={ordered.map((h) => h.id)} hospitalNames={ordered.map((h) => resolveText(h.name, locale))} />
    </div>
  );
}
