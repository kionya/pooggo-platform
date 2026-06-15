import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { requireHospital } from "@/lib/auth/guard";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

const TIER_LABEL: Record<string, string> = { RECOMMENDED: "추천", PARTNER: "제휴", BENEFIT: "베네핏" };

export default async function HospitalDashboard() {
  const session = await requireHospital();
  const hospitalId = session.user.hospitalId as string;
  const [hospital, newCount, totalCount] = await Promise.all([
    db.hospital.findUnique({ where: { id: hospitalId } }),
    db.booking.count({ where: { hospitalId, status: "NEW" } }),
    db.booking.count({ where: { hospitalId } }),
  ]);
  if (!hospital) return <p className="text-stone-400">병원 정보를 찾을 수 없습니다.</p>;

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-navy-900 mb-6">{resolveText(hospital.name, "ko")}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-5">
          <div className="text-sm text-stone-500">공개 상태</div>
          <div className="text-lg font-bold text-navy-900 mt-2">{hospital.isPublished ? "공개중" : "비공개"}</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-stone-500">등급</div>
          <div className="text-lg font-bold text-navy-900 mt-2">{TIER_LABEL[hospital.tier] ?? hospital.tier}</div>
        </Card>
        <Card className="p-5 hover:shadow-[var(--shadow-float)] transition-shadow">
          <Link href="/hospital/bookings?status=NEW" className="block">
            <div className="text-sm text-stone-500">신규 예약</div>
            <div className="text-3xl font-bold text-navy-900 mt-2">{newCount}</div>
          </Link>
        </Card>
        <Card className="p-5 hover:shadow-[var(--shadow-float)] transition-shadow">
          <Link href="/hospital/bookings" className="block">
            <div className="text-sm text-stone-500">전체 예약</div>
            <div className="text-3xl font-bold text-navy-900 mt-2">{totalCount}</div>
          </Link>
        </Card>
      </div>
      <p className="text-sm text-stone-500">
        공개 여부·등급·시술 가격은 플랫폼에서 관리됩니다. 변경이 필요하면 운영팀에 문의하세요.{" "}
        <Link href="/hospital/profile" className="text-teal-600 underline hover:text-teal-700">병원 정보 수정 →</Link>
      </p>
    </div>
  );
}
