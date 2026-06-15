import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { inputClass } from "@/components/ui/Field";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  async function doLogin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/admin",
      });
    } catch (e) {
      if (e instanceof AuthError) redirect("/admin/login?error=1");
      throw e;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory">
      <div className="bg-cream border border-stone-200 rounded-2xl shadow-[var(--shadow-card)] p-8 w-full max-w-sm">
        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2 text-center">PooGGo 관리자</h1>
        <p className="text-stone-500 mb-6 text-sm text-center">이메일과 비밀번호로 로그인하세요.</p>
        {error && (
          <p className="bg-clay-600/10 border border-clay-600/30 text-clay-700 text-sm mb-4 text-center rounded-lg px-4 py-2">
            이메일 또는 비밀번호가 올바르지 않습니다.
          </p>
        )}
        <form action={doLogin} className="space-y-4">
          <input name="email" type="email" placeholder="이메일" required autoFocus className={inputClass} />
          <input name="password" type="password" placeholder="비밀번호" required className={inputClass} />
          <button type="submit" className="w-full bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold py-3 rounded-xl transition-colors">접속하기</button>
        </form>
      </div>
    </div>
  );
}
