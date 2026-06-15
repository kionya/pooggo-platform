import { requireHospital } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";

const TONE: Record<string, "gold" | "teal" | "stone" | "clay"> = {
  REQUESTED: "gold", APPROVED: "teal", FULFILLED: "teal", REJECTED: "clay", CANCELLED: "stone",
};

export default async function HospitalRedemptionsPage() {
  const session = await requireHospital();
  const items = await db.redemption.findMany({
    where: { hospitalId: session.user.hospitalId! },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <div className="rounded-xl border border-stone-200 bg-cream p-6">
      <h1 className="mb-1 font-serif text-xl font-bold text-navy-900">무료시술 교환 신청</h1>
      <p className="mb-4 text-xs text-stone-400">교환 코드 확인용(처리는 운영팀). 환자가 제시한 코드와 대조하세요.</p>
      {items.length === 0 ? (
        <p className="text-sm text-stone-400">교환 신청이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0">
              <span className="font-mono text-sm text-navy-900">{r.code}</span>
              <Badge tone={TONE[r.status] ?? "stone"}>{r.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
