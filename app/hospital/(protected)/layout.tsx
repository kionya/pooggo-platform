import Link from "next/link";
import { signOut } from "@/auth";
import { requireHospital } from "@/lib/auth/guard";

export default async function HospitalLayout({ children }: { children: React.ReactNode }) {
  await requireHospital();
  return (
    <div className="min-h-screen bg-ivory">
      <header className="bg-navy-900 border-b border-navy-700 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex gap-5 text-sm font-medium text-cream">
          <Link href="/hospital" className="hover:text-gold-500 transition-colors">대시보드</Link>
          <Link href="/hospital/profile" className="hover:text-gold-500 transition-colors">병원 정보</Link>
          <Link href="/hospital/bookings" className="hover:text-gold-500 transition-colors">예약</Link>
        </nav>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/hospital/login" }); }}>
          <button className="text-sm text-stone-400 hover:text-cream transition-colors">로그아웃</button>
        </form>
      </header>
      <main className="p-6 max-w-4xl mx-auto">{children}</main>
    </div>
  );
}
