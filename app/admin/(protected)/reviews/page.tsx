import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { hideReview, unhideReview, deleteReview } from "@/app/admin/review-actions";

export default async function AdminReviewsPage() {
  const reviews = await db.review.findMany({
    include: { hospital: true, _count: { select: { reports: true } } },
    orderBy: [{ reports: { _count: "desc" } }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">후기 관리</h1>
      <p className="text-sm text-gray-500 mb-6">신고가 많은 순으로 표시됩니다. 숨김은 공개·내 후기에서 제외되며 데이터는 보존됩니다.</p>
      <div className="space-y-3">
        {reviews.length === 0 && <p className="text-gray-400">후기가 없습니다.</p>}
        {reviews.map((r) => (
          <div key={r.id} className={`bg-white border rounded-xl p-4 ${r.isHidden ? "opacity-60" : ""}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-sm">
                  {resolveText(r.hospital.name, "ko")} · ★{r.rating} · <span className="text-gray-400">{r.userName}</span>
                  {r._count.reports > 0 && <span className="ml-2 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">신고 {r._count.reports}</span>}
                  {r.isHidden && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">숨김</span>}
                </div>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{r.content}</p>
                <div className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {r.isHidden ? (
                  <form action={unhideReview.bind(null, r.id)}><button className="text-xs bg-gray-100 px-3 py-1 rounded">숨김해제</button></form>
                ) : (
                  <form action={hideReview.bind(null, r.id)}><button className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded">숨김</button></form>
                )}
                <form action={deleteReview.bind(null, r.id)}><button className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded">삭제</button></form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
