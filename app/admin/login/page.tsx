import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">RICH DOC 관리자</h1>
        <p className="text-gray-500 mb-6 text-sm text-center">이메일과 비밀번호로 로그인하세요.</p>
        {error && <p className="text-red-500 text-sm mb-4 text-center">이메일 또는 비밀번호가 올바르지 않습니다.</p>}
        <form action={doLogin} className="space-y-4">
          <input name="email" type="email" placeholder="이메일" required autoFocus className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="password" type="password" placeholder="비밀번호" required className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition">접속하기</button>
        </form>
      </div>
    </div>
  );
}
