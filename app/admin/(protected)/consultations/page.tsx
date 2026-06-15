import { db } from "@/lib/db";

export default async function ConsultationsPage() {
  const consultations = await db.consultation.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-navy-900 mb-6">상담 신청 내역</h1>
      <div className="grid gap-4">
        {consultations.length === 0 ? (
          <p className="text-stone-500 text-center py-10">아직 들어온 상담이 없습니다.</p>
        ) : (
          consultations.map((item) => (
            <div key={item.id} className="bg-cream border border-stone-200 rounded-2xl shadow-[var(--shadow-card)] p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-navy-900">{item.customerName || "이름 없음"}</h3>
                  <p className="text-stone-500 text-sm">{item.phone}</p>
                </div>
                <span className="text-xs text-stone-400">{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-navy-900 bg-ivory border border-stone-200 p-3 rounded-lg text-sm">{item.content}</p>
              {item.imageUrl && <img src={item.imageUrl} alt="첨부" className="w-32 h-32 object-cover rounded-lg border border-stone-200 mt-2" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
