import { db } from "@/lib/db";
import Link from "next/link";
import { resolveText } from "@/lib/i18n/text";
import { togglePublish } from "@/app/admin/hospital-actions";
import DeleteHospitalButton from "@/components/admin/DeleteHospitalButton";

export default async function HospitalsAdminList() {
  const hospitals = await db.hospital.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-serif text-2xl font-bold text-navy-900">병원 관리</h1>
        <Link href="/admin/hospitals/new" className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-4 py-2 rounded-xl font-bold transition-colors">+ 새 병원</Link>
      </div>
      <div className="bg-cream rounded-2xl border border-stone-200 divide-y divide-stone-200 shadow-[var(--shadow-card)]">
        {hospitals.length === 0 && <p className="p-6 text-stone-400">등록된 병원이 없습니다.</p>}
        {hospitals.map((h) => (
          <div key={h.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-bold text-navy-900">{resolveText(h.name, "ko")} <span className="text-xs text-stone-400">/{h.slug}</span></div>
              <div className="text-sm text-stone-500">{h.city}, {h.district} · {h.category}</div>
            </div>
            <div className="flex items-center gap-2">
              <form action={togglePublish.bind(null, h.id, !h.isPublished)}>
                <button className={`text-xs px-3 py-1 rounded-full border font-bold transition-colors ${h.isPublished ? "bg-teal-600/10 text-teal-700 border-teal-600/30" : "bg-stone-100 text-stone-500 border-stone-200"}`}>
                  {h.isPublished ? "공개중" : "비공개"}
                </button>
              </form>
              <Link href={`/admin/hospitals/${h.id}/edit`} className="text-sm bg-navy-900 hover:bg-navy-700 text-cream px-3 py-1 rounded-lg transition-colors">수정</Link>
              <DeleteHospitalButton id={h.id} name={resolveText(h.name, "ko")} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
