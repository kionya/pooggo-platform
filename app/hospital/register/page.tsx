"use client";

import { useState } from "react";
import { registerHospital } from "@/app/hospital/register-actions";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center">병원 입점 신청</h1>
        <p className="text-gray-500 mb-6 text-sm text-center">신청 후 승인되면 병원 정보를 직접 관리할 수 있습니다.</p>
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-4">
            {errors.map((er, i) => <div key={i}>• {er}</div>)}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <input name="hospitalName" placeholder="병원명" required className="w-full border p-3 rounded-lg" />
          <input name="email" type="email" placeholder="이메일" required className="w-full border p-3 rounded-lg" />
          <input name="password" type="password" placeholder="비밀번호 (8자 이상)" required className="w-full border p-3 rounded-lg" />
          <input name="passwordConfirm" type="password" placeholder="비밀번호 확인" required className="w-full border p-3 rounded-lg" />
          <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg disabled:opacity-50">{saving ? "신청 중..." : "입점 신청"}</button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4"><a href="/hospital/login" className="hover:underline">이미 계정이 있으신가요? 로그인</a></p>
      </div>
    </div>
  );
}
