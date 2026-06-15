"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import I18nField from "./I18nField";
import { EMPTY_I18N } from "@/lib/i18n/types";
import { HOSPITAL_CATEGORIES } from "@/lib/hospital/validation";
import type { HospitalInput, OperatingHours, Messengers, DoctorInput, MenuInput } from "@/lib/hospital/types";
import { createHospital, updateHospital } from "@/app/admin/hospital-actions";
import { updateHospitalProfile } from "@/app/hospital/actions";
import { inputClass } from "@/components/ui/Field";

const DAYS: (keyof Omit<OperatingHours, "note">)[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABEL: Record<string, string> = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };

export default function HospitalForm({
  mode, hospitalId, initial, scope = "admin",
}: {
  mode: "create" | "edit";
  hospitalId?: string;
  initial: HospitalInput;
  scope?: "admin" | "hospital";
}) {
  const router = useRouter();
  const [form, setForm] = useState<HospitalInput>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof HospitalInput>(k: K, v: HospitalInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    let res: { ok: boolean; errors: string[] };
    if (scope === "hospital") {
      res = await updateHospitalProfile(form);
    } else {
      res = mode === "create" ? await createHospital(form) : await updateHospital(hospitalId!, form);
    }
    setSaving(false);
    if (res.ok) router.push(scope === "hospital" ? "/hospital" : "/admin/hospitals");
    else setErrors(res.errors);
  }

  const addDoctor = () => setForm((f) => ({ ...f, doctors: [...f.doctors, { name: { ...EMPTY_I18N }, specialty: { ...EMPTY_I18N }, image: "", order: f.doctors.length }] }));
  const addMenu = () => setForm((f) => ({ ...f, menus: [...f.menus, { name: { ...EMPTY_I18N }, category: "ETC", price: null, priceText: { ...EMPTY_I18N }, currency: "KRW", order: f.menus.length }] }));
  const setDoctor = (i: number, d: DoctorInput) => setForm((f) => ({ ...f, doctors: f.doctors.map((x, idx) => (idx === i ? d : x)) }));
  const setMenu = (i: number, m: MenuInput) => setForm((f) => ({ ...f, menus: f.menus.map((x, idx) => (idx === i ? m : x)) }));

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {errors.length > 0 && (
        <div className="bg-clay-600/10 border border-clay-600/30 text-clay-700 p-4 rounded-lg text-sm">
          {errors.map((e, i) => <div key={i}>• {e}</div>)}
        </div>
      )}

      <section className="bg-cream border border-stone-200 rounded-2xl shadow-[var(--shadow-card)] p-5">
        <h3 className="font-bold text-navy-900 mb-3">기본 정보</h3>
        {scope === "admin" && (
          <>
            <label htmlFor="hf-slug" className="text-sm font-bold text-navy-900 block mb-1">slug (URL용, 영문)</label>
            <input id="hf-slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="rejuel-gangnam" className={`${inputClass} mb-3`} />
          </>
        )}
        <I18nField label="병원명" value={form.name} onChange={(v) => set("name", v)} />
        <I18nField label="한 줄 소개" value={form.intro} onChange={(v) => set("intro", v)} />
        <I18nField label="상세 소개" value={form.about} onChange={(v) => set("about", v)} multiline />
        <I18nField label="주소" value={form.address} onChange={(v) => set("address", v)} />
        <I18nField label="부작용·주의사항(의무)" value={form.cautions} onChange={(v) => set("cautions", v)} multiline />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-bold text-navy-900 block mb-1">City</label>
            <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-bold text-navy-900 block mb-1">District</label>
            <input value={form.district} onChange={(e) => set("district", e.target.value)} placeholder="Gangnam-gu" className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-sm font-bold text-navy-900 block mb-1">진료과</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass}>
              {HOSPITAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <I18nField label="태그 (콤마로 구분)" value={form.tags} onChange={(v) => set("tags", v)} />
        <label htmlFor="hf-image" className="text-sm font-bold text-navy-900 mt-3 block mb-1">대표 이미지 URL</label>
        <input id="hf-image" value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="https://..." className={inputClass} />
        {scope === "admin" && (
          <>
            <div className="mt-3">
              <label className="text-sm font-bold text-navy-900 block mb-1">등급</label>
              <select value={form.tier} onChange={(e) => set("tier", e.target.value)} className={inputClass}>
                <option value="RECOMMENDED">추천</option>
                <option value="PARTNER">제휴</option>
                <option value="BENEFIT">베네핏(추가혜택)</option>
              </select>
            </div>
            {form.tier === "BENEFIT" && (
              <I18nField label="추가혜택(베네핏 — 4언어 필수)" value={form.benefits} onChange={(v) => set("benefits", v)} multiline />
            )}
            <label className="flex items-center gap-2 mt-3 text-sm font-bold text-navy-900">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => set("isPublished", e.target.checked)} /> 공개(환자화면 노출)
            </label>
          </>
        )}
      </section>

      <section className="bg-cream border border-stone-200 rounded-2xl shadow-[var(--shadow-card)] p-5">
        <h3 className="font-bold text-navy-900 mb-3">운영시간</h3>
        {DAYS.map((day) => {
          const dh = form.operatingHours[day];
          const upd = (patch: Partial<typeof dh>) => set("operatingHours", { ...form.operatingHours, [day]: { ...dh, ...patch } });
          return (
            <div key={day} className="flex items-center gap-2 mb-2">
              <span className="w-8 font-bold text-navy-900">{DAY_LABEL[day]}</span>
              <input type="time" value={dh.open} disabled={dh.closed} onChange={(e) => upd({ open: e.target.value })} className="border border-stone-300 bg-cream rounded-lg p-2 text-navy-900 disabled:opacity-50" />
              <span className="text-stone-500">~</span>
              <input type="time" value={dh.close} disabled={dh.closed} onChange={(e) => upd({ close: e.target.value })} className="border border-stone-300 bg-cream rounded-lg p-2 text-navy-900 disabled:opacity-50" />
              <label className="flex items-center gap-1 text-sm text-stone-600"><input type="checkbox" checked={dh.closed} onChange={(e) => upd({ closed: e.target.checked })} /> 휴무</label>
            </div>
          );
        })}
        <I18nField label="운영시간 비고" value={form.operatingHours.note} onChange={(v) => set("operatingHours", { ...form.operatingHours, note: v })} />
      </section>

      <section className="bg-cream border border-stone-200 rounded-2xl shadow-[var(--shadow-card)] p-5">
        <h3 className="font-bold text-navy-900 mb-3">메신저</h3>
        {(["whatsapp", "line", "wechat", "kakao", "messenger", "phone", "email"] as (keyof Messengers)[]).map((k) => (
          <div key={k} className="flex items-center gap-2 mb-2">
            <span className="w-24 text-sm font-bold text-navy-900 capitalize">{k}</span>
            <input value={form.messengers[k]} onChange={(e) => set("messengers", { ...form.messengers, [k]: e.target.value })} className="flex-1 border border-stone-300 bg-cream rounded-lg px-3 py-2 text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-600/40" />
          </div>
        ))}
      </section>

      <section className="bg-cream border border-stone-200 rounded-2xl shadow-[var(--shadow-card)] p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-navy-900">의료진</h3>
          <button type="button" onClick={addDoctor} className="text-sm bg-navy-900 hover:bg-navy-700 text-cream px-3 py-1 rounded-lg transition-colors">+ 추가</button>
        </div>
        {/* key=index 의도적: 행 데이터는 모두 form state에 있어 삭제 시 데이터 꼬임 없음(탭 표시만 cosmetic) */}
        {form.doctors.map((d, i) => (
          <div key={i} className="border border-stone-200 rounded-xl p-3 mb-3 bg-ivory">
            <div className="flex justify-end">
              <button type="button" onClick={() => setForm((f) => ({ ...f, doctors: f.doctors.filter((_, idx) => idx !== i) }))} className="text-clay-600 text-sm hover:text-clay-700 transition-colors">삭제</button>
            </div>
            <I18nField label={`의료진 ${i + 1} 이름`} value={d.name} onChange={(v) => setDoctor(i, { ...d, name: v })} />
            <I18nField label="전문분야" value={d.specialty} onChange={(v) => setDoctor(i, { ...d, specialty: v })} />
            <input value={d.image} onChange={(e) => setDoctor(i, { ...d, image: e.target.value })} placeholder="사진 URL(선택)" className={inputClass} />
          </div>
        ))}
      </section>

      {scope === "admin" && (
        <section className="bg-cream border border-stone-200 rounded-2xl shadow-[var(--shadow-card)] p-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-navy-900">시술/가격</h3>
            <button type="button" onClick={addMenu} className="text-sm bg-navy-900 hover:bg-navy-700 text-cream px-3 py-1 rounded-lg transition-colors">+ 추가</button>
          </div>
          {/* key=index 의도적: 행 데이터는 모두 form state에 있어 삭제 시 데이터 꼬임 없음(탭 표시만 cosmetic) */}
          {form.menus.map((m, i) => (
            <div key={i} className="border border-stone-200 rounded-xl p-3 mb-3 bg-ivory">
              <div className="flex justify-end">
                <button type="button" onClick={() => setForm((f) => ({ ...f, menus: f.menus.filter((_, idx) => idx !== i) }))} className="text-clay-600 text-sm hover:text-clay-700 transition-colors">삭제</button>
              </div>
              <I18nField label={`시술 ${i + 1} 명`} value={m.name} onChange={(v) => setMenu(i, { ...m, name: v })} />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-xs font-bold text-navy-900 block mb-1">비교 카테고리</label>
                  <input value={m.category} onChange={(e) => setMenu(i, { ...m, category: e.target.value })} placeholder="LIFTING" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-bold text-navy-900 block mb-1">가격(숫자, KRW)</label>
                  <input type="number" value={m.price ?? ""} onChange={(e) => setMenu(i, { ...m, price: e.target.value === "" ? null : Number(e.target.value) })} className={inputClass} />
                </div>
              </div>
              <I18nField label="가격 표기" value={m.priceText} onChange={(v) => setMenu(i, { ...m, priceText: v })} />
            </div>
          ))}
        </section>
      )}

      <button type="submit" disabled={saving} className="w-full bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold py-4 rounded-xl transition-colors disabled:opacity-50">
        {saving ? "저장 중..." : mode === "create" ? "병원 등록" : "수정 저장"}
      </button>
    </form>
  );
}
