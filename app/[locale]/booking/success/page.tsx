import { setRequestLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { Link } from "@/i18n/navigation";

export default async function BookingSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ code?: string; group?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { code, group } = await searchParams;
  const t = await getTranslations("Booking");

  const bookings = group
    ? await db.booking.findMany({ where: { groupId: group }, include: { hospital: true } })
    : code
    ? await db.booking.findMany({ where: { code }, include: { hospital: true } })
    : [];

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-teal-600/10 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
        ✓
      </div>
      <h1 className="text-2xl font-bold font-serif text-navy-900 mb-3">{t("successTitle")}</h1>
      <p className="text-sm text-stone-500 mb-6">{t("notConfirmed")}</p>
      <div className="bg-cream border border-stone-200 rounded-xl p-5 mb-6 text-left">
        {bookings.length === 0 ? (
          <p className="text-stone-400">-</p>
        ) : (
          bookings.map((b) => (
            <div
              key={b.id}
              className="flex justify-between border-b border-stone-100 py-2 last:border-0"
            >
              <span className="text-stone-700">{resolveText(b.hospital.name, locale)}</span>
              <span className="font-bold text-teal-600">
                {t("yourCode")}: {b.code}
              </span>
            </div>
          ))
        )}
      </div>
      {bookings.some((b) => b.email) && (
        <p className="text-xs text-stone-400 mb-6">{t("emailedNote")}</p>
      )}
      <Link href="/" className="bg-gold-500 text-navy-900 px-6 py-3 rounded-xl font-bold hover:bg-gold-600 transition-colors">
        {t("backHome")}
      </Link>
    </div>
  );
}
