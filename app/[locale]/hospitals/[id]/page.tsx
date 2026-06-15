import { getHospitalById } from "@/app/actions";
import { Star, User, DollarSign, MapPin, ArrowLeft, MessageSquare, Ticket } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { resolveText } from "@/lib/i18n/text";
import { setRequestLocale, getTranslations } from "next-intl/server";
import MessengerButtons from "@/components/hospitals/MessengerButtons";
import OperatingHoursTable from "@/components/hospitals/OperatingHoursTable";
import TierBadge from "@/components/hospitals/TierBadge";
import ComplianceNotice from "@/components/ComplianceNotice";
import { auth } from "@/auth";
import { canViewReviews } from "@/lib/reviews/access";
import ReviewForm from "@/components/hospitals/ReviewForm";
import AccountNav from "@/components/AccountNav";
import ReportButton from "@/components/hospitals/ReportButton";

// 👇 Next.js 15버전 호환 타입 (Promise)
type Props = {
  params: Promise<{ id: string; locale: string }>;
};

export default async function HospitalDetailPage(props: Props) {
  // ⭐⭐ 여기가 핵심입니다! await으로 기다렸다가 ID를 꺼내야 합니다.
  const { id: hospitalId, locale } = await props.params;
  setRequestLocale(locale);
  const tTier = await getTranslations("Tier");
  const tCompliance = await getTranslations("Compliance");
  const tDetail = await getTranslations("Detail");

  // 데이터 가져오기
  const hospital = await getHospitalById(hospitalId);

  // 1. 데이터가 없을 때 (에러 처리)
  if (!hospital) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-clay-600/10 p-6 rounded-xl border border-clay-600/30 mb-6 max-w-md">
          <h2 className="text-xl font-bold text-clay-700 mb-2">⚠ {tDetail("notFoundTitle")}</h2>
          <p className="text-stone-600 mb-4">요청하신 ID가 데이터베이스에 없습니다.</p>
          <div className="bg-cream p-3 rounded border border-stone-200 text-xs text-left font-mono text-stone-500 break-all">
            {/* ID가 비어있는지 확인하는 디버깅용 코드 */}
            <strong>Requested ID:</strong> {hospitalId ? hospitalId : "(ID 감지 실패! await params 확인 필요)"}
          </div>
        </div>
        <Link href="/hospitals" className="bg-gold-500 text-navy-900 px-6 py-3 rounded-xl font-bold hover:bg-gold-600 transition">
          {tDetail("backToList")}
        </Link>
      </div>
    );
  }

  // 안전장치
  const tagsArray = (hospital.tags || "").split(',');

  // 후기 로그인 게이팅: 로그인(PATIENT/HOSPITAL/SUPER_ADMIN)만 열람·작성
  const session = await auth();
  const canView = canViewReviews(session?.user?.role);

  return (
    <div className="min-h-screen bg-ivory pb-20">
      <div className="bg-cream sticky top-0 z-10 px-4 h-14 flex items-center shadow-sm border-b border-stone-200">
        <Link href="/hospitals" className="mr-4"><ArrowLeft className="w-6 h-6 text-navy-900" /></Link>
        <h1 className="font-serif font-bold text-lg truncate flex-1 text-navy-900">{resolveText(hospital.name, locale)}</h1>
        <AccountNav />
      </div>

      <div className="relative h-64 bg-stone-200">
        <img src={hospital.image || ""} alt={resolveText(hospital.name, locale)} className="w-full h-full object-cover" />
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-6 pt-20">
          <h2 className="text-white text-2xl font-bold font-serif">{resolveText(hospital.name, locale)}</h2>
          <div className="mt-2"><TierBadge tier={hospital.tier} /></div>
          <div className="flex items-center text-white/90 text-sm mt-1">
            <MapPin className="w-4 h-4 mr-1" /> {resolveText(hospital.address, locale)}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-6 relative z-0">
        <div className="bg-cream rounded-xl p-6 shadow-[var(--shadow-card)] border border-stone-200 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-yellow-500 font-bold text-lg">
              <Star className="w-5 h-5 fill-current mr-1" /> {hospital.rating}
            </div>
            <span className="text-stone-400 text-sm">{canView ? `리뷰 ${hospital.userReviews?.length || 0}개` : ""}</span>
          </div>
          <p className="text-stone-600 leading-relaxed">{resolveText(hospital.intro, locale)}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {tagsArray.map((tag, idx) => (
              <span key={idx} className="bg-teal-600/10 text-teal-700 px-3 py-1 rounded-full text-xs font-bold">#{tag}</span>
            ))}
          </div>
        </div>

        {/* 의료진 정보 */}
        {hospital.doctors && hospital.doctors.length > 0 && (
          <div className="bg-cream rounded-xl p-6 shadow-[var(--shadow-card)] border border-stone-200 mb-4">
            <h3 className="font-serif font-bold text-lg mb-4 flex items-center text-navy-900"><User className="w-5 h-5 mr-2 text-teal-600"/> {tDetail("doctorsTitle")}</h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {hospital.doctors.map(doc => (
                <div key={doc.id} className="flex-shrink-0 w-24 text-center">
                  <div className="w-20 h-20 bg-stone-200 rounded-full mx-auto mb-2 overflow-hidden flex items-center justify-center text-2xl">
                     👨‍⚕️
                  </div>
                  <div className="font-bold text-sm text-navy-900 mt-2">{resolveText(doc.name, locale)}</div>
                  <div className="text-xs text-stone-500">{resolveText(doc.specialty, locale)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 시술 가격표 */}
        {hospital.menus && hospital.menus.length > 0 && (
          <div className="bg-cream rounded-xl p-6 shadow-[var(--shadow-card)] border border-stone-200 mb-4">
            <h3 className="font-serif font-bold text-lg mb-4 flex items-center text-navy-900">
              <DollarSign className="w-5 h-5 mr-2 text-teal-600"/> {tDetail("pricesTitle")}
            </h3>
            <ul className="space-y-3">
              {hospital.menus.map((menu) => (
                <li key={menu.id} className="flex justify-between items-center border-b border-stone-100 pb-3 last:border-0">
                  <span className="text-stone-700 font-medium">{resolveText(menu.name, locale)}</span>
                  <span className="font-bold text-teal-600">{resolveText(menu.priceText, locale)}</span>
                </li>
              ))}
            </ul>
            <ComplianceNotice k="priceDisclaimer" className="mt-3" />
          </div>
        )}

        {(() => {
          const c = resolveText(hospital.cautions, locale);
          return (
            <div className="bg-gold-500/10 border border-gold-500/30 rounded-xl p-6 mb-4">
              <h3 className="font-bold text-lg mb-2 text-navy-900">{tCompliance("cautionsTitle")}</h3>
              <p className="text-sm text-stone-700 whitespace-pre-line">{c || tCompliance("cautionsFallback")}</p>
            </div>
          );
        })()}
        <OperatingHoursTable hours={hospital.operatingHours} />
        <MessengerButtons messengers={hospital.messengers as Record<string, string>} />
        {hospital.tier === "BENEFIT" && resolveText(hospital.benefits, locale) && (
          <div className="bg-gold-500/10 border border-gold-500/30 rounded-xl p-6 mb-4">
            <h3 className="font-bold text-lg mb-2 text-gold-600">★ {tTier("benefitsTitle")}</h3>
            <p className="text-navy-900 text-sm whitespace-pre-line">{resolveText(hospital.benefits, locale)}</p>
            {hospital.tier === "BENEFIT" && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 text-sm font-bold text-gold-600">
                <Ticket className="h-4 w-4" /> {tDetail("stampRedeemable")}
              </div>
            )}
          </div>
        )}

        <div className="bg-cream rounded-xl p-6 shadow-[var(--shadow-card)] border border-stone-200 mb-20">
          <h3 className="font-serif font-bold text-lg mb-4 flex items-center text-navy-900"><MessageSquare className="w-5 h-5 mr-2 text-teal-600"/> {tDetail("reviewsTitle")}</h3>
          {canView ? (
            <>
              {hospital.userReviews && hospital.userReviews.length > 0 ? (
                <ul className="space-y-4">
                  {hospital.userReviews.map((rv) => (
                    <li key={rv.id} className="border-b border-stone-100 pb-4 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-navy-900">{rv.userName}</span>
                        <span className="flex items-center text-yellow-500 text-sm font-bold">
                          <Star className="w-4 h-4 fill-current mr-1" /> {rv.rating}
                        </span>
                      </div>
                      <p className="text-sm text-stone-600 mt-1 whitespace-pre-line">{rv.content}</p>
                      {rv.authorUserId !== session?.user?.id && <div className="mt-1"><ReportButton reviewId={rv.id} /></div>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-stone-400 text-sm text-center py-4">{tDetail("noReviews")}</p>
              )}
              <ReviewForm hospitalId={hospital.id} />
              <ComplianceNotice k="reviewDisclaimer" className="mt-3" />
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-stone-400 text-sm mb-3">{tDetail("reviewsLoginRequired")}</p>
              <Link href="/account/login" className="inline-block bg-gold-500 text-navy-900 px-5 py-2 rounded-lg text-sm font-bold hover:bg-gold-600 transition">
                {tDetail("reviewsTitle")}
              </Link>
              <ComplianceNotice k="reviewDisclaimer" className="mt-4" />
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 w-full bg-cream border-t border-stone-200 p-4 z-20 safe-area-bottom">
        <Link href={`/booking?hospital=${hospital.id}`} className="block w-full bg-gold-500 text-navy-900 font-bold py-4 rounded-xl text-lg shadow-xl text-center hover:bg-gold-600 transition">
          {tDetail("bookThisClinic")}
        </Link>
      </div>
    </div>
  );
}