import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { approveHospitalAccount, rejectHospitalAccount } from "@/app/admin/account-actions";

const STATUS_LABEL: Record<string, string> = { PENDING: "대기", ACTIVE: "활성", SUSPENDED: "정지" };

export default async function AdminAccountsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const where: Record<string, unknown> = { role: "HOSPITAL" };
  if (status && ["PENDING", "ACTIVE", "SUSPENDED"].includes(status)) where.status = status;
  const accounts = await db.user.findMany({ where, orderBy: { createdAt: "desc" }, include: { hospital: true } });

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-navy-900 mb-4">병원 계정 승인</h1>
      <div className="flex gap-2 mb-6 text-sm flex-wrap">
        <a href="/admin/accounts" className={`px-3 py-1 rounded-full border font-bold transition-colors ${!status ? "bg-navy-900 text-cream border-navy-900" : "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200"}`}>전체</a>
        {["PENDING", "ACTIVE", "SUSPENDED"].map((s) => (
          <a key={s} href={`/admin/accounts?status=${s}`} className={`px-3 py-1 rounded-full border font-bold transition-colors ${status === s ? "bg-navy-900 text-cream border-navy-900" : "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200"}`}>{STATUS_LABEL[s]}</a>
        ))}
      </div>
      <div className="space-y-3">
        {accounts.length === 0 && <p className="text-stone-400">계정이 없습니다.</p>}
        {accounts.map((a) => (
          <div key={a.id} className="bg-cream border border-stone-200 rounded-2xl shadow-[var(--shadow-card)] p-4 flex justify-between items-center">
            <div>
              <div className="font-bold text-navy-900">{a.hospital ? resolveText(a.hospital.name, "ko") : "(병원 없음)"} <span className="text-xs text-stone-400">{a.email}</span></div>
              <div className="text-sm text-stone-500">{STATUS_LABEL[a.status] ?? a.status} · {new Date(a.createdAt).toLocaleDateString()}</div>
            </div>
            <div className="flex gap-2">
              {a.status !== "ACTIVE" && (
                <form action={approveHospitalAccount.bind(null, a.id)}>
                  <button className="text-xs bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold px-3 py-1 rounded-lg transition-colors">승인</button>
                </form>
              )}
              {a.status !== "SUSPENDED" && (
                <form action={rejectHospitalAccount.bind(null, a.id)}>
                  <button className="text-xs bg-clay-600/10 hover:bg-clay-600/20 text-clay-700 border border-clay-600/30 font-bold px-3 py-1 rounded-lg transition-colors">정지</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
