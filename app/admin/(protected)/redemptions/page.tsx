import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { processRedemptionAction } from "@/app/admin/stamp-actions";
import { resolveText } from "@/lib/i18n/text";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const TONE: Record<string, "gold" | "teal" | "stone" | "clay"> = {
  REQUESTED: "gold", APPROVED: "teal", FULFILLED: "teal", REJECTED: "clay", CANCELLED: "stone",
};

export default async function AdminRedemptionsPage() {
  await requireRole(["SUPER_ADMIN"]);
  const items = await db.redemption.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { email: true } }, hospital: { select: { name: true } } },
    take: 200,
  });

  return (
    <div className="rounded-xl border border-stone-200 bg-cream p-6">
      <h1 className="mb-4 font-serif text-xl font-bold text-navy-900">무료시술 교환 처리</h1>
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 last:border-0">
            <div>
              <div className="font-medium text-navy-900">
                {resolveText(r.hospital.name, "ko")} · <span className="font-mono text-sm">{r.code}</span>
              </div>
              <div className="text-xs text-stone-500">{r.user.email} · {r.stampCost}장</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={TONE[r.status] ?? "stone"}>{r.status}</Badge>
              {r.status === "REQUESTED" && (
                <>
                  <form action={processRedemptionAction.bind(null, r.id, "approve")}><Button size="sm">승인</Button></form>
                  <form action={processRedemptionAction.bind(null, r.id, "reject")}><Button size="sm" variant="danger">거절</Button></form>
                </>
              )}
              {r.status === "APPROVED" && (
                <>
                  <form action={processRedemptionAction.bind(null, r.id, "fulfill")}><Button size="sm">완료</Button></form>
                  <form action={processRedemptionAction.bind(null, r.id, "reject")}><Button size="sm" variant="danger">거절</Button></form>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
