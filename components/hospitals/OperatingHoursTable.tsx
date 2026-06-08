import { useTranslations, useLocale } from "next-intl";
import { resolveText } from "@/lib/i18n/text";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABEL: Record<string, Record<string, string>> = {
  ko: { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" },
  en: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
  zh: { mon: "周一", tue: "周二", wed: "周三", thu: "周四", fri: "周五", sat: "周六", sun: "周日" },
  ja: { mon: "月", tue: "火", wed: "水", thu: "木", fri: "金", sat: "土", sun: "日" },
};

type DayHours = { open: string; close: string; closed: boolean };

export default function OperatingHoursTable({ hours }: { hours: any }) {
  const t = useTranslations("Detail");
  const locale = useLocale();
  if (!hours) return null;
  const labels = DAY_LABEL[locale] ?? DAY_LABEL.ko;
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
      <h3 className="font-bold text-lg mb-4">{t("hours")}</h3>
      <table className="w-full text-sm">
        <tbody>
          {DAYS.map((d) => {
            const dh: DayHours | undefined = hours[d];
            return (
              <tr key={d} className="border-b border-gray-50 last:border-0">
                <td className="py-2 font-medium text-gray-700 w-16">{labels[d]}</td>
                <td className="py-2 text-gray-600">
                  {!dh || dh.closed ? t("closed") : `${dh.open} ~ ${dh.close}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hours.note && resolveText(hours.note, locale) && (
        <p className="text-xs text-gray-400 mt-3">{t("note")}: {resolveText(hours.note, locale)}</p>
      )}
    </div>
  );
}
