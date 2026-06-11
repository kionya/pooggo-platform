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
      <h1 className="text-2xl font-bold mb-4">병원 계정 승인</h1>
      <div className="flex gap-2 mb-6 text-sm">
        <a href="/admin/accounts" className={`px-3 py-1 rounded-full ${!status ? "bg-gray-900 text-white" : "bg-gray-100"}`}>전체</a>
        {["PENDING", "ACTIVE", "SUSPENDED"].map((s) => (
          <a key={s} href={`/admin/accounts?status=${s}`} className={`px-3 py-1 rounded-full ${status === s ? "bg-gray-900 text-white" : "bg-gray-100"}`}>{STATUS_LABEL[s]}</a>
        ))}
      </div>
      <div className="space-y-3">
        {accounts.length === 0 && <p className="text-gray-400">계정이 없습니다.</p>}
        {accounts.map((a) => (
          <div key={a.id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
            <div>
              <div className="font-bold">{a.hospital ? resolveText(a.hospital.name, "ko") : "(병원 없음)"} <span className="text-xs text-gray-400">{a.email}</span></div>
              <div className="text-sm text-gray-500">{STATUS_LABEL[a.status] ?? a.status} · {new Date(a.createdAt).toLocaleDateString()}</div>
            </div>
            <div className="flex gap-2">
              {a.status !== "ACTIVE" && (
                <form action={approveHospitalAccount.bind(null, a.id)}><button className="text-xs bg-blue-600 text-white px-3 py-1 rounded">승인</button></form>
              )}
              {a.status !== "SUSPENDED" && (
                <form action={rejectHospitalAccount.bind(null, a.id)}><button className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded">정지</button></form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
