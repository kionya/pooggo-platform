import { useTranslations } from "next-intl";

const STYLE: Record<string, string> = {
  BENEFIT: "bg-gold-500/15 text-gold-600 border-gold-500/30",
  PARTNER: "bg-teal-600/10 text-teal-700 border-teal-600/30",
  RECOMMENDED: "bg-stone-100 text-stone-600 border-stone-200",
};

export default function TierBadge({ tier }: { tier: string }) {
  const t = useTranslations("Tier");
  const key = ["BENEFIT", "PARTNER", "RECOMMENDED"].includes(tier) ? tier : "RECOMMENDED";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STYLE[key]}`}>
      {t(key)}
    </span>
  );
}
