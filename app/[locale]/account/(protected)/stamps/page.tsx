import { requirePatient } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { getBalance, getHistory } from "@/lib/stamps";
import { progress } from "@/lib/stamps/balance";
import { STAMP_GOAL } from "@/lib/stamps/config";
import { resolveText } from "@/lib/i18n/text";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StampCard } from "@/components/stamps/StampCard";
import { RedeemForm } from "@/components/stamps/RedeemForm";
import { CancelRedemptionButton } from "@/components/stamps/CancelRedemptionButton";

type Props = { params: Promise<{ locale: string }> };

const STATUS_TONE: Record<string, "gold" | "teal" | "stone" | "clay"> = {
  REQUESTED: "gold",
  APPROVED: "teal",
  FULFILLED: "teal",
  REJECTED: "clay",
  CANCELLED: "stone",
};

export default async function StampsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePatient();
  const t = await getTranslations("Stamps");

  const [balance, history, benefitHospitals, redemptions] = await Promise.all([
    getBalance(session.user.id),
    getHistory(session.user.id),
    db.hospital.findMany({ where: { tier: "BENEFIT", isPublished: true }, select: { id: true, name: true } }),
    db.redemption.findMany({
      where: { userId: session.user.id },
      include: { hospital: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const p = progress(balance, STAMP_GOAL);
  const hospitals = benefitHospitals.map((h) => ({ id: h.id, name: resolveText(h.name, locale as never) }));

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="font-serif text-2xl font-bold text-navy-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-stone-500">{t("subtitle")}</p>
        <p className="mt-2 text-xs text-stone-400">{t("foreignNotice")}</p>

        <div className="mt-6">
          <StampCard balance={balance} goal={STAMP_GOAL} />
          <p className="mt-4 text-sm text-navy-900">
            {p.complete ? t("readyToRedeem") : t("remaining", { n: p.remaining })}
          </p>
        </div>
      </Card>

      {/* 교환 신청 */}
      {p.complete && hospitals.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 font-bold text-navy-900">{t("redeemTitle")}</h2>
          <RedeemForm
            hospitals={hospitals}
            labels={{
              selectHospital: t("selectHospital"),
              note: t("note"),
              notePlaceholder: t("notePlaceholder"),
              submit: t("submitRedeem"),
              cautionsTitle: t("cautionsTitle"),
              cautions: t("cautions"),
              consent: t("consent"),
            }}
          />
        </Card>
      )}

      {/* 내 교환 내역 */}
      <Card className="p-6">
        <h2 className="mb-4 font-bold text-navy-900">{t("myRedemptions")}</h2>
        {redemptions.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-400">{t("noRedemptions")}</p>
        ) : (
          <ul className="space-y-3">
            {redemptions.map((r) => (
              <li key={r.id} className="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0">
                <div>
                  <div className="font-medium text-navy-900">{resolveText(r.hospital.name, locale as never)}</div>
                  <div className="text-xs text-stone-500">
                    {t("code")}: <span className="font-mono">{r.code}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={STATUS_TONE[r.status] ?? "stone"}>{t(`status_${r.status}`)}</Badge>
                  {(r.status === "REQUESTED" || r.status === "APPROVED") && (
                    <CancelRedemptionButton id={r.id} label={t("cancel")} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 적립 내역(원장) */}
      <Card className="p-6">
        <h2 className="mb-4 font-bold text-navy-900">{t("ledger")}</h2>
        {history.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-400">{t("noLedger")}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {history.map((e) => (
              <li key={e.id} className="flex items-center justify-between">
                <span className="text-stone-600">{t(`reason_${e.reason}`)}</span>
                <span className={e.delta >= 0 ? "font-bold text-teal-700" : "font-bold text-clay-700"}>
                  {e.delta >= 0 ? `+${e.delta}` : e.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
