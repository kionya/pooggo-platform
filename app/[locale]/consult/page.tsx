import { createConsultation } from "@/app/actions";
import { inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

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
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy-900 mb-1.5">연락처 (필수)</label>
            <input
              name="phone"
              type="text"
              placeholder="010-1234-5678"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy-900 mb-1.5">상담 내용</label>
            <textarea
              name="content"
              placeholder="무엇이 궁금하신가요?"
              required
              className={`${inputClass} h-24`}
            ></textarea>
          </div>

          <Button type="submit" variant="primary" className="w-full py-3">
            신청서 제출하기
          </Button>
        </form>
      </div>
    </div>
  );
}
