import { db } from "@/lib/db";
import { requireHospital } from "@/lib/auth/guard";
import { canTransition, BOOKING_STATUSES } from "@/lib/booking/status";
import { updateOwnBookingStatus } from "@/app/hospital/actions";

const STATUS_LABEL: Record<string, string> = { NEW: "접수", CONFIRMED: "상담확정", VISITED: "내원", DONE: "완료", CANCELLED: "취소" };

export default async function HospitalBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await requireHospital();
  const hospitalId = session.user.hospitalId as string;
  const { status } = await searchParams;
  const where: Record<string, unknown> = { hospitalId };
  if (status && (BOOKING_STATUSES as readonly string[]).includes(status)) where.status = status;
  const bookings = await db.booking.findMany({ where, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">예약 관리</h1>
      <div className="flex gap-2 mb-6 text-sm">
        <a href="/hospital/bookings" className={`px-3 py-1 rounded-full ${!status ? "bg-gray-900 text-white" : "bg-gray-100"}`}>전체</a>
        {BOOKING_STATUSES.map((s) => (
          <a key={s} href={`/hospital/bookings?status=${s}`} className={`px-3 py-1 rounded-full ${status === s ? "bg-gray-900 text-white" : "bg-gray-100"}`}>{STATUS_LABEL[s]}</a>
        ))}
      </div>
      <div className="space-y-3">
        {bookings.length === 0 && <p className="text-gray-400">예약이 없습니다.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="bg-white border rounded-xl p-4 flex justify-between items-start">
            <div>
              <div className="font-bold">{b.name} <span className="text-xs text-gray-400">{b.nationality} · {b.code}</span></div>
              <div className="text-sm text-gray-500">{STATUS_LABEL[b.status] ?? b.status} · 희망: {new Date(b.preferredDate1).toLocaleDateString()} ({b.timeOfDay})</div>
              <div className="text-sm text-gray-500">연락: {b.phone}{b.email ? ` · ${b.email}` : ""}</div>
              {b.treatmentInterest && <div className="text-sm text-gray-600 mt-1">관심: {b.treatmentInterest}</div>}
            </div>
            <div className="flex flex-col gap-1">
              {BOOKING_STATUSES.filter((s) => canTransition(b.status, s)).map((s) => (
                <form key={s} action={updateOwnBookingStatus.bind(null, b.id, s)}>
                  <button className="text-xs px-3 py-1 rounded bg-blue-50 text-blue-700 w-full">{STATUS_LABEL[s]}</button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
