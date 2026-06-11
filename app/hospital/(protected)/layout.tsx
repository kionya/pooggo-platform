import Link from "next/link";
import { signOut } from "@/auth";
import { requireHospital } from "@/lib/auth/guard";

export default async function HospitalLayout({ children }: { children: React.ReactNode }) {
  await requireHospital();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex gap-5 text-sm font-medium text-gray-700">
          <Link href="/hospital" className="hover:text-blue-600">대시보드</Link>
          <Link href="/hospital/profile" className="hover:text-blue-600">병원 정보</Link>
          <Link href="/hospital/bookings" className="hover:text-blue-600">예약</Link>
        </nav>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/hospital/login" }); }}>
          <button className="text-sm text-gray-400 hover:text-gray-700">로그아웃</button>
        </form>
      </header>
      <main className="p-6 max-w-4xl mx-auto">{children}</main>
    </div>
  );
}
