import { useTranslations } from "next-intl";

const STYLE: Record<string, string> = {
  BENEFIT: "bg-amber-100 text-amber-800 border-amber-300",
  PARTNER: "bg-blue-100 text-blue-700 border-blue-300",
  RECOMMENDED: "bg-gray-100 text-gray-600 border-gray-200",
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
