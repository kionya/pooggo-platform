import { createConsultation } from "@/app/actions";

export default function ConsultPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">상담 신청 테스트</h1>
        
        {/* 👇 여기가 핵심! 아까 만든 배달원(actions)과 직접 연결된 폼입니다 */}
        <form action={createConsultation} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-gray-700">고객 이름</label>
            <input 
              name="customerName" 
              type="text" 
              placeholder="홍길동" 
              className="w-full border p-2 rounded" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">연락처 (필수)</label>
            <input 
              name="phone" 
              type="text" 
              placeholder="010-1234-5678" 
              required 
              className="w-full border p-2 rounded" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">상담 내용</label>
            <textarea 
              name="content" 
              placeholder="무엇이 궁금하신가요?" 
              required 
              className="w-full border p-2 rounded h-24" 
            ></textarea>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700"
          >
            신청서 제출하기
          </button>
        </form>
      </div>
    </div>
  );
}