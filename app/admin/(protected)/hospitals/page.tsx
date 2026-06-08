import { db } from "@/lib/db";
import Link from "next/link";
import { resolveText } from "@/lib/i18n/text";
import { deleteHospital, togglePublish } from "@/app/admin/hospital-actions";

export default async function HospitalsAdminList() {
  const hospitals = await db.hospital.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">병원 관리</h1>
        <Link href="/admin/hospitals/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">+ 새 병원</Link>
      </div>
      <div className="bg-white rounded-xl border divide-y">
        {hospitals.length === 0 && <p className="p-6 text-gray-400">등록된 병원이 없습니다.</p>}
        {hospitals.map((h) => (
          <div key={h.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-bold">{resolveText(h.name, "ko")} <span className="text-xs text-gray-400">/{h.slug}</span></div>
              <div className="text-sm text-gray-500">{h.city}, {h.district} · {h.category}</div>
            </div>
            <div className="flex items-center gap-2">
              <form action={togglePublish.bind(null, h.id, !h.isPublished)}>
                <button className={`text-xs px-3 py-1 rounded-full ${h.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {h.isPublished ? "공개중" : "비공개"}
                </button>
              </form>
              <Link href={`/admin/hospitals/${h.id}/edit`} className="text-sm bg-gray-900 text-white px-3 py-1 rounded">수정</Link>
              <form action={deleteHospital.bind(null, h.id)}>
                <button className="text-sm text-red-500 px-2">삭제</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
