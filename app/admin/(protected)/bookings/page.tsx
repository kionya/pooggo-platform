import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { canTransition, BOOKING_STATUSES } from "@/lib/booking/status";
import { updateBookingStatus } from "@/app/admin/booking-actions";

const STATUS_LABEL: Record<string, string> = { NEW: "접수", CONFIRMED: "상담확정", VISITED: "내원", DONE: "완료", CANCELLED: "취소" };

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const where = status && (BOOKING_STATUSES as readonly string[]).includes(status) ? { status } : {};
  const bookings = await db.booking.findMany({ where, orderBy: { createdAt: "desc" }, include: { hospital: true } });

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-navy-900 mb-4">예약 관리</h1>
      <div className="flex gap-2 mb-6 text-sm flex-wrap">
        <a href="/admin/bookings" className={`px-3 py-1 rounded-full border font-bold transition-colors ${!status ? "bg-navy-900 text-cream border-navy-900" : "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200"}`}>전체</a>
        {BOOKING_STATUSES.map((s) => (
          <a key={s} href={`/admin/bookings?status=${s}`} className={`px-3 py-1 rounded-full border font-bold transition-colors ${status === s ? "bg-navy-900 text-cream border-navy-900" : "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200"}`}>{STATUS_LABEL[s]}</a>
        ))}
      </div>
      <div className="space-y-3">
        {bookings.length === 0 && <p className="text-stone-400">예약이 없습니다.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="bg-cream border border-stone-200 rounded-2xl shadow-[var(--shadow-card)] p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-navy-900">{b.name} <span className="text-xs text-stone-400">{b.nationality} · {b.code}</span></div>
                <div className="text-sm text-stone-500">{resolveText(b.hospital.name, "ko")} · {STATUS_LABEL[b.status] ?? b.status}</div>
                <div className="text-sm text-stone-500">희망: {new Date(b.preferredDate1).toLocaleDateString()}{b.preferredDate2 ? ` / ${new Date(b.preferredDate2).toLocaleDateString()}` : ""} ({b.timeOfDay})</div>
                <div className="text-sm text-stone-500">연락: {b.phone}{b.messengerChannel ? ` · ${b.messengerChannel}:${b.messengerHandle ?? ""}` : ""}{b.email ? ` · ${b.email}` : ""}</div>
                {b.treatmentInterest && <div className="text-sm text-navy-900 mt-1">관심: {b.treatmentInterest}</div>}
                {b.memo && <div className="text-sm text-navy-900">메모: {b.memo}</div>}
                {b.photo && <a href={b.photo} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-600 underline">첨부사진</a>}
                {b.groupId && <span className="text-xs text-stone-400 ml-2">[묶음]</span>}
              </div>
              <div className="flex flex-col gap-1">
                {BOOKING_STATUSES.filter((s) => canTransition(b.status, s)).map((s) => (
                  <form key={s} action={updateBookingStatus.bind(null, b.id, s)}>
                    <button className="text-xs px-3 py-1 rounded-lg bg-teal-600/10 text-teal-700 border border-teal-600/30 w-full hover:bg-teal-600/20 transition-colors">{STATUS_LABEL[s]}</button>
                  </form>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
