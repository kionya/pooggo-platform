import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { requireHospital } from "@/lib/auth/guard";
import Link from "next/link";

const TIER_LABEL: Record<string, string> = { RECOMMENDED: "추천", PARTNER: "제휴", BENEFIT: "베네핏" };

export default async function HospitalDashboard() {
  const session = await requireHospital();
  const hospitalId = session.user.hospitalId as string;
  const [hospital, newCount, totalCount] = await Promise.all([
    db.hospital.findUnique({ where: { id: hospitalId } }),
    db.booking.count({ where: { hospitalId, status: "NEW" } }),
    db.booking.count({ where: { hospitalId } }),
  ]);
  if (!hospital) return <p className="text-gray-400">병원 정보를 찾을 수 없습니다.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{resolveText(hospital.name, "ko")}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border"><div className="text-sm text-gray-500">공개 상태</div><div className="text-lg font-bold mt-2">{hospital.isPublished ? "공개중" : "비공개"}</div></div>
        <div className="bg-white p-5 rounded-xl border"><div className="text-sm text-gray-500">등급</div><div className="text-lg font-bold mt-2">{TIER_LABEL[hospital.tier] ?? hospital.tier}</div></div>
        <Link href="/hospital/bookings?status=NEW" className="bg-white p-5 rounded-xl border hover:shadow-md"><div className="text-sm text-gray-500">신규 예약</div><div className="text-3xl font-bold mt-2">{newCount}</div></Link>
        <Link href="/hospital/bookings" className="bg-white p-5 rounded-xl border hover:shadow-md"><div className="text-sm text-gray-500">전체 예약</div><div className="text-3xl font-bold mt-2">{totalCount}</div></Link>
      </div>
      <p className="text-sm text-gray-500">공개 여부·등급·시술 가격은 플랫폼에서 관리됩니다. 변경이 필요하면 운영팀에 문의하세요. <Link href="/hospital/profile" className="text-blue-600 underline">병원 정보 수정 →</Link></p>
    </div>
  );
}
