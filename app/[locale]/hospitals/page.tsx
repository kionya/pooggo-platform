import { setRequestLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { parseFilterParams, buildHospitalWhere } from "@/lib/hospital/filter";
import { compareHospitalsByTier } from "@/lib/hospital/tier";
import { Link } from "@/i18n/navigation";
import FilterBar from "@/components/hospitals/FilterBar";
import TierBadge from "@/components/hospitals/TierBadge";
import { Star, MapPin } from "lucide-react";

export default async function HospitalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("Hospitals");

  const filter = parseFilterParams(sp);
  const where = buildHospitalWhere(filter);
  const rows = await db.hospital.findMany({ where });
  const hospitals = [...rows].sort(compareHospitalsByTier);

  const current: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") current[k] = v;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="font-serif text-3xl font-bold mb-2 text-navy-900">{t("title")}</h1>
      <p className="text-stone-500 mb-6">{t("subtitle")}</p>
      <FilterBar current={current} />
      {hospitals.length === 0 ? (
        <p className="text-stone-400 text-center py-20">{t("noResults")}</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hospitals.map((h) => (
            <div key={h.id} className="bg-cream rounded-2xl overflow-hidden shadow-[var(--shadow-card)] border border-stone-200">
              <Link href={`/hospitals/${h.id}`} className="block relative h-48 bg-stone-200">
                <img src={h.image || ""} alt={resolveText(h.name, locale)} className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4"><TierBadge tier={h.tier} /></div>
                <div className="absolute top-4 right-4 bg-cream/90 px-2 py-1 rounded-lg flex items-center shadow-sm">
                  <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" /><span className="text-sm font-bold">{h.rating}</span>
                </div>
              </Link>
              <div className="p-6">
                <Link href={`/hospitals/${h.id}`}><h3 className="text-xl font-bold mb-1 text-navy-900 hover:text-teal-600 transition">{resolveText(h.name, locale)}</h3></Link>
                <div className="flex items-center text-sm text-stone-500 mb-3"><MapPin className="w-4 h-4 mr-1" />{h.city}, {h.district}</div>
                <p className="text-stone-600 text-sm line-clamp-2 mb-4">{resolveText(h.intro, locale)}</p>
                <Link href={`/hospitals/${h.id}`} className="block text-center py-3 rounded-xl font-bold text-sm bg-navy-900 text-cream hover:bg-navy-700 transition">{t("viewDetail")}</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
