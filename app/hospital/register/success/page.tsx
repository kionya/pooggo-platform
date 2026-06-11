export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4 text-center">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">✓</div>
        <h1 className="text-xl font-bold mb-3">입점 신청이 접수되었습니다</h1>
        <p className="text-sm text-gray-500 mb-6">관리자 승인 후 로그인하여 병원 정보를 관리할 수 있습니다. 승인 결과는 별도 안내됩니다.</p>
        <a href="/hospital/login" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">로그인 페이지로</a>
      </div>
    </div>
  );
}
