import Link from "next/link";
import { signOut } from "@/auth";
import { requireRole } from "@/lib/auth/guard";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["SUPER_ADMIN"]);
  return (
    <div className="min-h-screen bg-ivory">
      <header className="bg-navy-900 text-cream border-b border-navy-700 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex gap-5 text-sm font-medium text-cream/80">
          <Link href="/admin" className="hover:text-gold-500 transition-colors">대시보드</Link>
          <Link href="/admin/hospitals" className="hover:text-gold-500 transition-colors">병원관리</Link>
          <Link href="/admin/bookings" className="hover:text-gold-500 transition-colors">예약</Link>
          <Link href="/admin/consultations" className="hover:text-gold-500 transition-colors">상담내역</Link>
          <Link href="/admin/accounts" className="hover:text-gold-500 transition-colors">계정승인</Link>
          <Link href="/admin/reviews" className="hover:text-gold-500 transition-colors">후기관리</Link>
          <Link href="/admin/stamps" className="hover:text-gold-500 transition-colors">스탬프</Link>
          <Link href="/admin/redemptions" className="hover:text-gold-500 transition-colors">교환</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-cream/60 hover:text-cream transition-colors">홈페이지 →</Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/admin/login" }); }}>
            <button className="text-sm text-cream/60 hover:text-cream transition-colors">로그아웃</button>
          </form>
        </div>
      </header>
      <main className="p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
