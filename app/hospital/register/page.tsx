"use client";

import { useState } from "react";
import { registerHospital } from "@/app/hospital/register-actions";
import { inputClass } from "@/components/ui/Field";
import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/Card";

export default function HospitalRegisterPage() {
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const res = await registerHospital(new FormData(e.currentTarget));
    setSaving(false);
    if (res && !res.ok) setErrors(res.errors);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory p-4">
      <Card className="p-8 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2 text-center">병원 입점 신청</h1>
        <p className="text-stone-500 mb-6 text-sm text-center">신청 후 승인되면 병원 정보를 직접 관리할 수 있습니다.</p>
        {errors.length > 0 && (
          <div className="bg-clay-600/10 border border-clay-600/30 text-clay-700 p-3 rounded-lg text-sm mb-4">
            {errors.map((er, i) => <div key={i}>• {er}</div>)}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <input name="hospitalName" placeholder="병원명" required className={inputClass} />
          <input name="email" type="email" placeholder="이메일" required className={inputClass} />
          <input name="password" type="password" placeholder="비밀번호 (8자 이상)" required className={inputClass} />
          <input name="passwordConfirm" type="password" placeholder="비밀번호 확인" required className={inputClass} />
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? "신청 중..." : "입점 신청"}
          </button>
        </form>
        <p className="text-center text-sm text-stone-400 mt-4">
          <a href="/hospital/login" className="hover:text-teal-600 hover:underline transition-colors">이미 계정이 있으신가요? 로그인</a>
        </p>
      </Card>
    </div>
  );
}
