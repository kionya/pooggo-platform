import { db } from "@/lib/db";
import Link from "next/link";

export default async function AdminDashboard() {
  const [hospitals, published, consultations, newBookings, pendingAccounts, reportedReviews, pendingRedemptions] = await Promise.all([
    db.hospital.count(),
    db.hospital.count({ where: { isPublished: true } }),
    db.consultation.count(),
    db.booking.count({ where: { status: "NEW" } }),
    db.user.count({ where: { role: "HOSPITAL", status: "PENDING" } }),
    db.review.count({ where: { isHidden: false, reports: { some: {} } } }),
    db.redemption.count({ where: { status: "REQUESTED" } }),
  ]);
  const cards = [
    { label: "전체 병원", value: hospitals, href: "/admin/hospitals" },
    { label: "공개 병원", value: published, href: "/admin/hospitals" },
    { label: "상담 신청", value: consultations, href: "/admin/consultations" },
    { label: "신규 예약", value: newBookings, href: "/admin/bookings?status=NEW" },
    { label: "승인 대기", value: pendingAccounts, href: "/admin/accounts?status=PENDING" },
    { label: "신고된 후기", value: reportedReviews, href: "/admin/reviews" },
  ];
  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-navy-900 mb-6">대시보드</h1>
      <div className="grid grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="bg-cream border border-stone-200 rounded-2xl shadow-[var(--shadow-card)] p-6 hover:shadow-[var(--shadow-float)] transition-shadow">
            <div className="text-sm text-stone-500">{c.label}</div>
            <div className="text-3xl font-bold text-navy-900 mt-2">{c.value}</div>
          </Link>
        ))}
        <Link href="/admin/redemptions" className="bg-cream border border-stone-200 rounded-2xl shadow-[var(--shadow-card)] p-6 hover:shadow-[var(--shadow-float)] transition-shadow">
          <div className="text-sm text-stone-500">대기 중 교환 신청</div>
          <div className="text-3xl font-bold text-navy-900 mt-2">{pendingRedemptions}</div>
        </Link>
      </div>
    </div>
  );
}
