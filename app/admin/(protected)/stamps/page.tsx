import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { grantStampsAction } from "@/app/admin/stamp-actions";
import { Field, inputClass } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function AdminStampsPage() {
  await requireRole(["SUPER_ADMIN"]);
  const recent = await db.stampEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { email: true } } },
  });

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="mb-4 font-serif text-xl font-bold text-navy-900">스탬프 발급 / 보정</h1>
        <form action={grantStampsAction} className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end">
          <Field label="환자 이메일" htmlFor="stamp-email" required>
            <input id="stamp-email" name="email" type="email" placeholder="환자 이메일" className={inputClass} />
          </Field>
          <Field label="수량(+/-)" htmlFor="stamp-delta" required>
            <input id="stamp-delta" name="delta" type="number" placeholder="수량(+/-)" className={inputClass} />
          </Field>
          <Field label="메모" htmlFor="stamp-note">
            <input id="stamp-note" name="note" type="text" placeholder="메모(선택)" className={inputClass} />
          </Field>
          <Button type="submit">발급</Button>
        </form>
        <p className="mt-2 text-xs text-stone-400">양수=적립(ADMIN_GRANT), 음수=보정(ADJUST). ⚠️ 금액·규칙 추후 확정.</p>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-bold text-navy-900">최근 적립 내역</h2>
        <ul className="space-y-2 text-sm">
          {recent.map((e) => (
            <li key={e.id} className="flex justify-between border-b border-stone-100 pb-2 last:border-0">
              <span className="text-stone-600">{e.user.email} · {e.reason}</span>
              <span className={e.delta >= 0 ? "font-bold text-teal-700" : "font-bold text-clay-700"}>
                {e.delta >= 0 ? `+${e.delta}` : e.delta}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
