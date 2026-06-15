import { requirePatient } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { Star, Ticket } from "lucide-react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getBalance } from "@/lib/stamps";
import { progress } from "@/lib/stamps/balance";
import { STAMP_GOAL } from "@/lib/stamps";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function AccountHome({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePatient();
  const t = await getTranslations("Account");
  const tDetail = await getTranslations("Detail");

  const [reviews, balance] = await Promise.all([
    db.review.findMany({
      where: { authorUserId: session.user.id },
      include: { hospital: true },
      orderBy: { createdAt: "desc" },
    }),
    getBalance(session.user.id),
  ]);
  const p = progress(balance, STAMP_GOAL);

  return (
    <div className="space-y-6">
      <div className="bg-cream rounded-2xl border border-stone-200 shadow-[var(--shadow-card)] p-6">
        <div className="text-lg font-bold text-navy-900">{session.user.name || t("myAccount")}</div>
        <div className="text-sm text-stone-500">{session.user.email}</div>
      </div>

      <Link href="/account/stamps" className="block">
        <div className="flex items-center justify-between rounded-xl border border-gold-500/30 bg-gold-500/10 p-6">
          <div className="flex items-center gap-3">
            <Ticket className="h-6 w-6 text-gold-600" />
            <div>
              <div className="font-bold text-navy-900">{t("stampSummaryTitle")}</div>
              <div className="text-sm text-stone-500">
                {p.complete ? t("stampReady") : t("stampRemaining", { n: p.remaining })}
              </div>
            </div>
          </div>
          <span className="font-serif text-xl font-bold text-gold-600">{p.count}/{p.goal}</span>
        </div>
      </Link>

      <div className="bg-cream rounded-2xl border border-stone-200 shadow-[var(--shadow-card)] p-6">
        <h2 className="font-serif font-bold text-lg text-navy-900 mb-4">{t("myReviews")}</h2>
        {reviews.length === 0 ? (
          <p className="text-stone-400 text-sm py-4 text-center">{t("noReviews")}</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-stone-100 pb-4 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-navy-900">
                    {resolveText(r.hospital.name, locale)}
                    {r.isHidden && <span className="ml-2 text-xs text-clay-600">({tDetail("reviewHidden")})</span>}
                  </span>
                  <span className="flex items-center text-yellow-500 text-sm font-bold">
                    <Star className="w-4 h-4 fill-current mr-1" /> {r.rating}
                  </span>
                </div>
                <p className="text-sm text-stone-600 mt-1 whitespace-pre-line">{r.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
