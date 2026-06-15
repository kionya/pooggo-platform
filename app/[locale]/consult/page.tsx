import { createConsultation } from "@/app/actions";

export default function ConsultPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ivory p-4">
      <div className="bg-cream p-8 rounded-2xl border border-stone-200 shadow-[var(--shadow-card)] w-full max-w-md">
        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-6 text-center">상담 신청 테스트</h1>

        <form action={createConsultation} className="space-y-4">

          <div>
            <label className="block text-sm font-semibold text-navy-900 mb-1.5">고객 이름</label>
            <input
              name="customerName"
              type="text"
              placeholder="홍길동"
              className="w-full rounded-lg border border-stone-300 bg-cream px-3 py-2.5 text-navy-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-600/40"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy-900 mb-1.5">연락처 (필수)</label>
            <input
              name="phone"
              type="text"
              placeholder="010-1234-5678"
              required
              className="w-full rounded-lg border border-stone-300 bg-cream px-3 py-2.5 text-navy-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-600/40"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy-900 mb-1.5">상담 내용</label>
            <textarea
              name="content"
              placeholder="무엇이 궁금하신가요?"
              required
              className="w-full rounded-lg border border-stone-300 bg-cream px-3 py-2.5 text-navy-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-600/40 h-24"
            ></textarea>
          </div>

          <button
            type="submit"
            className="w-full bg-gold-500 text-navy-900 font-bold py-3 rounded-xl hover:bg-gold-600 transition-colors"
          >
            신청서 제출하기
          </button>
        </form>
      </div>
    </div>
  );
}
