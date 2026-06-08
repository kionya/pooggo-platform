import { db } from "@/lib/db";

export default async function ConsultationsPage() {
  const consultations = await db.consultation.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">상담 신청 내역</h1>
      <div className="grid gap-4">
        {consultations.length === 0 ? (
          <p className="text-gray-500 text-center py-10">아직 들어온 상담이 없습니다.</p>
        ) : (
          consultations.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-xl border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-800">{item.customerName || "이름 없음"}</h3>
                  <p className="text-gray-500 text-sm">{item.phone}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">{item.content}</p>
              {item.imageUrl && <img src={item.imageUrl} alt="첨부" className="w-32 h-32 object-cover rounded-lg border mt-2" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
