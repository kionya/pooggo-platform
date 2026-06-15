import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { inputClass } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Logo";

export default async function HospitalLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  async function doLogin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirectTo: "/hospital" });
    } catch (e) {
      if (e instanceof AuthError) redirect("/hospital/login?error=1");
      throw e;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory p-4">
      <div className="bg-cream border border-stone-200 rounded-2xl shadow-[var(--shadow-card)] p-8 w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2 text-center">병원 포털 로그인</h1>
        <p className="text-stone-500 mb-6 text-sm text-center">승인된 병원 계정으로 로그인하세요.</p>
        {error && (
          <div className="bg-clay-600/10 border border-clay-600/30 text-clay-700 p-3 rounded-lg text-sm mb-4 text-center">
            로그인 실패(미승인이거나 정보 불일치).
          </div>
        )}
        <form action={doLogin} className="space-y-4">
          <input name="email" type="email" placeholder="이메일" required autoFocus className={inputClass} />
          <input name="password" type="password" placeholder="비밀번호" required className={inputClass} />
          <button type="submit" className="w-full bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold py-3 rounded-xl transition-colors">
            로그인
          </button>
        </form>
        <p className="text-center text-sm text-stone-400 mt-4">
          <a href="/hospital/register" className="hover:text-teal-600 hover:underline transition-colors">입점 신청하기</a>
        </p>
      </div>
    </div>
  );
}
