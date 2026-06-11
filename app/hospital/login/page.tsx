import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">병원 포털 로그인</h1>
        <p className="text-gray-500 mb-6 text-sm text-center">승인된 병원 계정으로 로그인하세요.</p>
        {error && <p className="text-red-500 text-sm mb-4 text-center">로그인 실패(미승인이거나 정보 불일치).</p>}
        <form action={doLogin} className="space-y-4">
          <input name="email" type="email" placeholder="이메일" required autoFocus className="w-full border border-gray-300 px-4 py-3 rounded-lg" />
          <input name="password" type="password" placeholder="비밀번호" required className="w-full border border-gray-300 px-4 py-3 rounded-lg" />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">로그인</button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4"><a href="/hospital/register" className="hover:underline">입점 신청하기</a></p>
      </div>
    </div>
  );
}
