import { setRequestLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { Link } from "@/i18n/navigation";
import TierBadge from "@/components/hospitals/TierBadge";
import { Star, MapPin } from "lucide-react";
import ComplianceNotice from "@/components/ComplianceNotice";

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { ids } = await searchParams;
  const t = await getTranslations("Compare");
  const tc = await getTranslations("Compliance");

  const idList = (ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const hospitals = idList.length
    ? await db.hospital.findMany({
        where: { id: { in: idList }, isPublished: true },
        include: { menus: { orderBy: { order: "asc" } } },
      })
    : [];

  const ordered = idList
    .map((id) => hospitals.find((h) => h.id === id))
    .filter((h): h is (typeof hospitals)[number] => Boolean(h));

  if (ordered.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 mb-6">{t("empty")}</p>
        <Link
          href="/hospitals"
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold"
        >
          {t("back")}
        </Link>
      </div>
    );
  }

  const categories = Array.from(
    new Set(ordered.flatMap((h) => h.menus.map((m) => m.category)))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <caption className="sr-only">{t("title")}</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left p-3 border-b w-40">{t("treatment")}</th>
              {ordered.map((h) => (
                <th key={h.id} scope="col" className="p-3 border-b text-left align-top">
                  <div className="flex items-center gap-2 mb-1">
                    <TierBadge tier={h.tier} />
                  </div>
                  <Link
                    href={`/hospitals/${h.id}`}
                    className="font-bold hover:text-blue-600"
                  >
                    {resolveText(h.name, locale)}
                  </Link>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current mr-1" />
                    {h.rating} ·{" "}
                    <MapPin className="w-3 h-3 mx-1" />
                    {h.city}
                  </div>
                  <Link href={`/booking?hospital=${h.id}`} className="inline-block mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-blue-700">{t("consultCta")}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              const cells = ordered.map(
                (h) => h.menus.find((m) => m.category === cat) ?? null
              );
              const prices = cells.map((m) =>
                m && m.price != null ? m.price : null
              );
              const valid = prices.filter((p): p is number => p != null);
              const min = valid.length ? Math.min(...valid) : null;
              const multiple = valid.length > 1;

              return (
                <tr key={cat} className="border-b">
                  <th scope="row" className="p-3 font-medium text-gray-700 text-left">{cat}</th>
                  {cells.map((m, i) => {
                    const isLowest =
                      m != null &&
                      m.price != null &&
                      min != null &&
                      m.price === min &&
                      multiple;
                    return (
                      <td
                        key={i}
                        className="p-3"
                      >
                        {m ? (
                          <>
                            <div className="text-sm">
                              {resolveText(m.name, locale)}
                            </div>
                            <div className="text-sm">
                              {resolveText(m.priceText, locale) || "-"}{" "}
                              {isLowest ? `(${tc("lowestNote")})` : ""}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ComplianceNotice k="priceDisclaimer" className="mt-4" />
      <div className="mt-6">
        <Link href="/hospitals" className="text-blue-600 underline">
          {t("back")}
        </Link>
      </div>
    </div>
  );
}
