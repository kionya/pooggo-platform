import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/Card";

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory p-4 text-center">
      <Card className="p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <div className="w-16 h-16 bg-teal-600/10 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl text-teal-700">✓</div>
        <h1 className="font-serif text-xl font-bold text-navy-900 mb-3">입점 신청이 접수되었습니다</h1>
        <p className="text-sm text-stone-500 mb-6">관리자 승인 후 로그인하여 병원 정보를 관리할 수 있습니다. 승인 결과는 별도 안내됩니다.</p>
        <a
          href="/hospital/login"
          className="inline-block bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold px-6 py-3 rounded-xl transition-colors"
        >
          로그인 페이지로
        </a>
      </Card>
    </div>
  );
}
