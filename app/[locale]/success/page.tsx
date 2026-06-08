import { Link } from "@/i18n/navigation";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-3xl font-bold mb-2">접수가 완료되었습니다!</h1>
        <p className="text-gray-600 mb-8">
          예약 코드: <span className="font-mono font-bold text-blue-600">{code}</span>
          <br />
          담당 실장님이 24시간 내로 연락드립니다.
        </p>
        <Link href="/" className="text-blue-500 hover:underline">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}