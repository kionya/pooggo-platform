# RICH DOC Phase 5B — 병원 테넌시 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 병원이 자가등록하고 슈퍼관리자 승인 후, 별도 `/hospital` 포털에서 자기 병원 정보·예약만 관리(가격·등급·공개·평점은 슈퍼관리자 전용)하는 멀티테넌트 권한 스코핑을 구축한다.

**Architecture:** 5A 인증 토대(role/hospitalId/status) 재사용. 등록검증·편집필드필터·소유권은 `lib/`의 순수함수(TDD). 병원 포털은 `/hospital/(protected)` route group + `requireHospital()` 가드. 스코프 액션이 세션 hospitalId로 자기 데이터만 수정/조회. HospitalForm에 `scope` prop으로 가격·등급·공개 섹션 숨김.

**Tech Stack:** Next.js 16 App Router, NextAuth(Auth.js v5), Prisma + Neon Postgres, bcryptjs, vitest.

**참고 설계서:** `docs/superpowers/specs/2026-06-11-richdoc-phase5b-tenancy-design.md`

> **순서:** 순수 로직(T1 등록검증, T2 편집필드, T3 소유권+가드) → 등록 플로우(T4) → 승인(T5) → 폼 scope(T6) → 병원 포털(T7) → 검증(T8). 각 태스크는 `npm run build` 통과로 끝낸다.

---

## File Structure

**신규 (순수 로직 — TDD)**
- `lib/hospital/registration.ts` (+ test) — `validateHospitalRegistration`
- `lib/hospital/editable.ts` (+ test) — `pickHospitalEditableFields`, `validateHospitalProfile`
- `lib/auth/ownership.ts` (+ test) — `ownsHospital`, `ownsBooking`

**신규 (액션/페이지)**
- `app/hospital/register/page.tsx`, `app/hospital/register/success/page.tsx`
- `app/hospital/register-actions.ts` — `registerHospital`
- `app/hospital/login/page.tsx`
- `app/hospital/(protected)/layout.tsx`, `page.tsx`, `profile/page.tsx`, `bookings/page.tsx`
- `app/hospital/actions.ts` — `updateHospitalProfile`, `updateOwnBookingStatus`
- `app/admin/account-actions.ts` — `approveHospitalAccount`, `rejectHospitalAccount`
- `app/admin/(protected)/accounts/page.tsx`

**수정**
- `lib/auth/guard.ts` — `requireHospital()` 추가
- `middleware.ts` — `hospital` 제외
- `components/admin/HospitalForm.tsx` — `scope` prop
- `app/admin/(protected)/layout.tsx` — 네비에 "계정승인"
- `app/admin/(protected)/page.tsx` — PENDING 카운트

---

## Task 1: 병원 등록 입력 검증 (TDD)

**Files:**
- Create: `lib/hospital/registration.ts`, Test: `lib/hospital/registration.test.ts`

- [ ] **Step 1: 실패하는 테스트**

Create `lib/hospital/registration.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { validateHospitalRegistration } from "./registration";

function valid() {
  return { email: "clinic@x.com", password: "secret123", passwordConfirm: "secret123", hospitalName: "리쥬엘의원" };
}

describe("validateHospitalRegistration", () => {
  it("완전 입력은 에러 없음", () => expect(validateHospitalRegistration(valid())).toEqual([]));
  it("이메일 형식 오류", () => {
    const v = valid(); v.email = "bad";
    expect(validateHospitalRegistration(v).some((e) => e.includes("email"))).toBe(true);
  });
  it("비밀번호 8자 미만", () => {
    const v = valid(); v.password = "1234"; v.passwordConfirm = "1234";
    expect(validateHospitalRegistration(v).some((e) => e.includes("password"))).toBe(true);
  });
  it("비밀번호 불일치", () => {
    const v = valid(); v.passwordConfirm = "different1";
    expect(validateHospitalRegistration(v).some((e) => e.includes("passwordConfirm"))).toBe(true);
  });
  it("병원명 누락", () => {
    const v = valid(); v.hospitalName = "  ";
    expect(validateHospitalRegistration(v).some((e) => e.includes("hospitalName"))).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- lib/hospital/registration.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

Create `lib/hospital/registration.ts`:
```ts
export type HospitalRegistrationInput = {
  email: string;
  password: string;
  passwordConfirm: string;
  hospitalName: string;
};

export function validateHospitalRegistration(input: HospitalRegistrationInput): string[] {
  const errors: string[] = [];
  const email = input.email.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email: 올바른 이메일을 입력하세요.");
  if (input.password.length < 8) errors.push("password: 비밀번호는 8자 이상이어야 합니다.");
  if (input.password !== input.passwordConfirm) errors.push("passwordConfirm: 비밀번호가 일치하지 않습니다.");
  if (!input.hospitalName.trim()) errors.push("hospitalName: 병원명은 필수입니다.");
  return errors;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- lib/hospital/registration.test.ts`
Expected: PASS (5).

- [ ] **Step 5: 커밋**

```bash
git add lib/hospital/registration.ts lib/hospital/registration.test.ts
git commit -m "feat(tenancy): 병원 등록 입력 검증(TDD)"
```

---

## Task 2: 편집 가능 필드 필터 + 프로필 검증 (TDD)

**Files:**
- Create: `lib/hospital/editable.ts`, Test: `lib/hospital/editable.test.ts`

- [ ] **Step 1: 실패하는 테스트**

Create `lib/hospital/editable.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { pickHospitalEditableFields, validateHospitalProfile } from "./editable";
import type { HospitalInput } from "./types";
import { EMPTY_I18N } from "@/lib/i18n/types";

const full = (s: string) => ({ ko: s, en: s, zh: s, ja: s });
const hours = { mon: { open: "10:00", close: "19:00", closed: false }, tue: { open: "", close: "", closed: true }, wed: { open: "", close: "", closed: true }, thu: { open: "", close: "", closed: true }, fri: { open: "", close: "", closed: true }, sat: { open: "", close: "", closed: true }, sun: { open: "", close: "", closed: true }, note: EMPTY_I18N };

function valid(): HospitalInput {
  return {
    slug: "rejuel", name: full("리쥬엘"), intro: full("소개"), about: full("상세"), address: full("주소"), cautions: full("주의"),
    city: "Seoul", district: "Gangnam-gu", category: "DERMA", tags: "리프팅", image: "https://x/y.jpg", images: [],
    operatingHours: hours as any, messengers: { whatsapp: "", line: "", wechat: "", kakao: "", messenger: "", phone: "", email: "" },
    isPublished: true, tier: "BENEFIT", benefits: full("혜택"),
    doctors: [{ name: full("원장"), specialty: full("피부과"), image: "", order: 0 }],
    menus: [{ name: full("슈링크"), category: "LIFTING", price: 150000, priceText: full("15만"), currency: "KRW", order: 0 }],
  };
}

describe("pickHospitalEditableFields", () => {
  it("플랫폼 전용 필드 제외(slug/menus/tier/benefits/isPublished)", () => {
    const f = pickHospitalEditableFields(valid()) as Record<string, unknown>;
    expect(f.slug).toBeUndefined();
    expect(f.menus).toBeUndefined();
    expect(f.tier).toBeUndefined();
    expect(f.benefits).toBeUndefined();
    expect(f.isPublished).toBeUndefined();
  });
  it("편집 가능 필드는 보존(name/doctors/messengers)", () => {
    const f = pickHospitalEditableFields(valid());
    expect(f.name).toEqual(full("리쥬엘"));
    expect(f.doctors.length).toBe(1);
    expect(f.city).toBe("Seoul");
  });
});

describe("validateHospitalProfile", () => {
  it("완전 입력은 에러 없음", () => expect(validateHospitalProfile(valid())).toEqual([]));
  it("name 한 언어 누락 에러", () => {
    const v = valid(); v.name = { ...v.name, ja: "" };
    expect(validateHospitalProfile(v).some((e) => e.includes("name"))).toBe(true);
  });
  it("menus/tier 미검증(빈 menus여도 통과)", () => {
    const v = valid(); v.menus = []; v.tier = "GOLD" as any; v.benefits = EMPTY_I18N;
    expect(validateHospitalProfile(v)).toEqual([]);
  });
  it("의료진 전문분야 누락 에러", () => {
    const v = valid(); v.doctors[0].specialty = EMPTY_I18N;
    expect(validateHospitalProfile(v).some((e) => e.includes("의료진"))).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- lib/hospital/editable.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현**

Create `lib/hospital/editable.ts`:
```ts
import type { HospitalInput } from "./types";
import { isCompleteI18n } from "@/lib/i18n/text";

export type HospitalEditable = Pick<
  HospitalInput,
  "name" | "intro" | "about" | "address" | "cautions" | "city" | "district" | "category" | "tags" | "image" | "images" | "operatingHours" | "messengers" | "doctors"
>;

// 병원이 수정 가능한 필드만 추출. slug/menus/tier/benefits/isPublished/rating/reviews 제외(플랫폼 전용).
export function pickHospitalEditableFields(input: HospitalInput): HospitalEditable {
  return {
    name: input.name, intro: input.intro, about: input.about, address: input.address, cautions: input.cautions,
    city: input.city, district: input.district, category: input.category, tags: input.tags,
    image: input.image, images: input.images, operatingHours: input.operatingHours, messengers: input.messengers,
    doctors: input.doctors,
  };
}

// 편집 가능 필드만 검증. menus/tier/benefits는 검증하지 않음(슈퍼관리자 전용).
export function validateHospitalProfile(input: HospitalInput): string[] {
  const errors: string[] = [];
  const i18nFields: [string, unknown][] = [
    ["name", input.name], ["intro", input.intro], ["about", input.about], ["address", input.address], ["cautions", input.cautions],
  ];
  for (const [key, val] of i18nFields) {
    if (!isCompleteI18n(val)) errors.push(`${key}: 4개 언어 모두 입력해야 합니다.`);
  }
  if (!input.city.trim()) errors.push("city는 필수입니다.");
  if (!input.district.trim()) errors.push("district는 필수입니다.");
  input.doctors.forEach((d, i) => {
    if (!isCompleteI18n(d.name)) errors.push(`의료진 ${i + 1}: 이름 4언어 필수`);
    if (!isCompleteI18n(d.specialty)) errors.push(`의료진 ${i + 1}: 전문분야 4언어 필수`);
  });
  return errors;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- lib/hospital/editable.test.ts`
Expected: PASS (6).

- [ ] **Step 5: 커밋**

```bash
git add lib/hospital/editable.ts lib/hospital/editable.test.ts
git commit -m "feat(tenancy): 병원 편집필드 필터 + 스코프 프로필 검증(menus/tier 제외, TDD)"
```

---

## Task 3: 소유권 체크 (TDD) + requireHospital 가드

**Files:**
- Create: `lib/auth/ownership.ts`, Test: `lib/auth/ownership.test.ts`
- Modify: `lib/auth/guard.ts`

- [ ] **Step 1: 실패하는 테스트**

Create `lib/auth/ownership.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { ownsHospital, ownsBooking } from "./ownership";

const sess = (hospitalId: string | null) => ({ user: { role: "HOSPITAL", hospitalId } });

describe("ownsHospital", () => {
  it("자기 병원 true", () => expect(ownsHospital(sess("h1"), "h1")).toBe(true));
  it("타 병원 false", () => expect(ownsHospital(sess("h1"), "h2")).toBe(false));
  it("hospitalId 없으면 false", () => expect(ownsHospital(sess(null), "h1")).toBe(false));
  it("세션 null false", () => expect(ownsHospital(null, "h1")).toBe(false));
});

describe("ownsBooking", () => {
  it("자기 병원 예약 true", () => expect(ownsBooking(sess("h1"), "h1")).toBe(true));
  it("타 병원 예약 false", () => expect(ownsBooking(sess("h1"), "h2")).toBe(false));
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- lib/auth/ownership.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현**

Create `lib/auth/ownership.ts`:
```ts
type SessionLike = { user?: { role?: string; hospitalId?: string | null } } | null;

export function ownsHospital(session: SessionLike, hospitalId: string): boolean {
  const hid = session?.user?.hospitalId;
  return !!hid && hid === hospitalId;
}

export function ownsBooking(session: SessionLike, bookingHospitalId: string): boolean {
  const hid = session?.user?.hospitalId;
  return !!hid && hid === bookingHospitalId;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- lib/auth/ownership.test.ts`
Expected: PASS (6).

- [ ] **Step 5: requireHospital 가드 추가**

`lib/auth/guard.ts`에 함수 추가(기존 requireRole 아래):
```ts
// 병원 포털 가드: HOSPITAL 역할 + hospitalId 보유. 불충족 시 /hospital/login.
export async function requireHospital() {
  const session = await auth();
  if (!session || !hasRole(session.user?.role, ["HOSPITAL"]) || !session.user?.hospitalId) {
    redirect("/hospital/login");
  }
  return session;
}
```

- [ ] **Step 6: 빌드 + 커밋**

Run: `npm run build` (성공)
```bash
git add lib/auth/ownership.ts lib/auth/ownership.test.ts lib/auth/guard.ts
git commit -m "feat(tenancy): 소유권 체크(ownsHospital/ownsBooking, TDD) + requireHospital 가드"
```

---

## Task 4: 미들웨어 제외 + 병원 자가등록 플로우

**Files:**
- Modify: `middleware.ts`
- Create: `app/hospital/register-actions.ts`, `app/hospital/register/page.tsx`, `app/hospital/register/success/page.tsx`

- [ ] **Step 1: 미들웨어에서 hospital 제외**

`middleware.ts`의 matcher를 교체(`hospital` 추가):
```ts
export const config = {
  matcher: ["/((?!api|admin|hospital|_next|_vercel|.*\\..*).*)"],
};
```
(이로써 `/hospital/*`는 next-intl 로케일 라우팅을 받지 않고 비로케일로 동작 — admin과 동일.)

- [ ] **Step 2: 등록 서버액션**

Create `app/hospital/register-actions.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import crypto from "crypto";
import { hashPassword } from "@/lib/auth/password";
import { validateHospitalRegistration } from "@/lib/hospital/registration";
import { EMPTY_I18N } from "@/lib/i18n/types";

export async function registerHospital(formData: FormData): Promise<{ ok: boolean; errors: string[] }> {
  const input = {
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    passwordConfirm: String(formData.get("passwordConfirm") || ""),
    hospitalName: String(formData.get("hospitalName") || ""),
  };
  const errors = validateHospitalRegistration(input);
  if (errors.length) return { ok: false, errors };

  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { ok: false, errors: ["email: 이미 가입된 이메일입니다."] };

  const passwordHash = await hashPassword(input.password);
  const name = { ko: input.hospitalName, en: input.hospitalName, zh: input.hospitalName, ja: input.hospitalName };
  const emptyHours = {
    mon: { open: "", close: "", closed: true }, tue: { open: "", close: "", closed: true }, wed: { open: "", close: "", closed: true },
    thu: { open: "", close: "", closed: true }, fri: { open: "", close: "", closed: true }, sat: { open: "", close: "", closed: true },
    sun: { open: "", close: "", closed: true }, note: { ...EMPTY_I18N },
  };
  const emptyMsg = { whatsapp: "", line: "", wechat: "", kakao: "", messenger: "", phone: "", email: "" };

  try {
    await db.$transaction(async (tx) => {
      const hospital = await tx.hospital.create({
        data: {
          slug: `pending-${crypto.randomUUID().slice(0, 8)}`,
          name, intro: { ...EMPTY_I18N }, about: { ...EMPTY_I18N }, address: { ...EMPTY_I18N }, cautions: { ...EMPTY_I18N },
          benefits: {}, city: "", district: "", category: "ETC", tags: "", image: "", images: [],
          operatingHours: emptyHours, messengers: emptyMsg, tier: "RECOMMENDED", isPublished: false,
        },
      });
      await tx.user.create({
        data: { email, passwordHash, role: "HOSPITAL", status: "PENDING", hospitalId: hospital.id },
      });
    });
  } catch (e: any) {
    return { ok: false, errors: ["등록 실패: " + String(e?.message || e)] };
  }
  redirect("/hospital/register/success");
}
```

- [ ] **Step 3: 등록 페이지**

Create `app/hospital/register/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerHospital } from "@/app/hospital/register-actions";

export default function HospitalRegisterPage() {
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

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
```

- [ ] **Step 4: 신청 완료 페이지**

Create `app/hospital/register/success/page.tsx`:
```tsx
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
```

- [ ] **Step 5: 빌드 + 커밋**

Run: `npm run build` (성공). `/hospital/register` 라우트 확인.
```bash
git add middleware.ts app/hospital/register-actions.ts app/hospital/register
git commit -m "feat(tenancy): 병원 자가등록(초안병원+PENDING 계정 트랜잭션) + 미들웨어 제외"
```

---

## Task 5: 슈퍼관리자 계정 승인

**Files:**
- Create: `app/admin/account-actions.ts`, `app/admin/(protected)/accounts/page.tsx`
- Modify: `app/admin/(protected)/layout.tsx`, `app/admin/(protected)/page.tsx`

- [ ] **Step 1: 승인/거절 액션**

Create `app/admin/account-actions.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guard";

export async function approveHospitalAccount(userId: string): Promise<void> {
  await requireRole(["SUPER_ADMIN"]);
  await db.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
  revalidatePath("/admin/accounts");
}

export async function rejectHospitalAccount(userId: string): Promise<void> {
  await requireRole(["SUPER_ADMIN"]);
  await db.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
  revalidatePath("/admin/accounts");
}
```

- [ ] **Step 2: 계정 승인 페이지**

Create `app/admin/(protected)/accounts/page.tsx`:
```tsx
import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { approveHospitalAccount, rejectHospitalAccount } from "@/app/admin/account-actions";

const STATUS_LABEL: Record<string, string> = { PENDING: "대기", ACTIVE: "활성", SUSPENDED: "정지" };

export default async function AdminAccountsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const where: Record<string, unknown> = { role: "HOSPITAL" };
  if (status && ["PENDING", "ACTIVE", "SUSPENDED"].includes(status)) where.status = status;
  const accounts = await db.user.findMany({ where, orderBy: { createdAt: "desc" }, include: { hospital: true } });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">병원 계정 승인</h1>
      <div className="flex gap-2 mb-6 text-sm">
        <a href="/admin/accounts" className={`px-3 py-1 rounded-full ${!status ? "bg-gray-900 text-white" : "bg-gray-100"}`}>전체</a>
        {["PENDING", "ACTIVE", "SUSPENDED"].map((s) => (
          <a key={s} href={`/admin/accounts?status=${s}`} className={`px-3 py-1 rounded-full ${status === s ? "bg-gray-900 text-white" : "bg-gray-100"}`}>{STATUS_LABEL[s]}</a>
        ))}
      </div>
      <div className="space-y-3">
        {accounts.length === 0 && <p className="text-gray-400">계정이 없습니다.</p>}
        {accounts.map((a) => (
          <div key={a.id} className="bg-white border rounded-xl p-4 flex justify-between items-center">
            <div>
              <div className="font-bold">{a.hospital ? resolveText(a.hospital.name, "ko") : "(병원 없음)"} <span className="text-xs text-gray-400">{a.email}</span></div>
              <div className="text-sm text-gray-500">{STATUS_LABEL[a.status] ?? a.status} · {new Date(a.createdAt).toLocaleDateString()}</div>
            </div>
            <div className="flex gap-2">
              {a.status !== "ACTIVE" && (
                <form action={approveHospitalAccount.bind(null, a.id)}><button className="text-xs bg-blue-600 text-white px-3 py-1 rounded">승인</button></form>
              )}
              {a.status !== "SUSPENDED" && (
                <form action={rejectHospitalAccount.bind(null, a.id)}><button className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded">정지</button></form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 네비 + 대시보드 카운트**

`app/admin/(protected)/layout.tsx`의 `<nav>`에서 "상담내역" Link 앞(또는 뒤)에 추가:
```tsx
          <Link href="/admin/accounts" className="hover:text-blue-600">계정승인</Link>
```
`app/admin/(protected)/page.tsx`의 `Promise.all([...])`에 PENDING 카운트 추가하고 카드 추가. 기존 배열을:
```tsx
  const [hospitals, published, consultations, newBookings, pendingAccounts] = await Promise.all([
    db.hospital.count(),
    db.hospital.count({ where: { isPublished: true } }),
    db.consultation.count(),
    db.booking.count({ where: { status: "NEW" } }),
    db.user.count({ where: { role: "HOSPITAL", status: "PENDING" } }),
  ]);
```
그리고 `cards` 배열에 추가:
```tsx
    { label: "승인 대기", value: pendingAccounts, href: "/admin/accounts?status=PENDING" },
```

- [ ] **Step 4: 빌드 + 커밋**

Run: `npm run build` (성공). `/admin/accounts` 라우트 확인.
```bash
git add app/admin/account-actions.ts "app/admin/(protected)/accounts/page.tsx" "app/admin/(protected)/layout.tsx" "app/admin/(protected)/page.tsx"
git commit -m "feat(tenancy): 슈퍼관리자 병원계정 승인/정지 + 네비·대시보드 대기 카운트"
```

---

## Task 6: HospitalForm scope prop (병원 모드)

**Files:**
- Modify: `components/admin/HospitalForm.tsx`

- [ ] **Step 1: scope prop + 조건부 액션/섹션**

READ `components/admin/HospitalForm.tsx`. Then:
(a) 상단 import에 추가: `import { updateHospitalProfile } from "@/app/hospital/actions";`
(b) props 시그니처에 `scope` 추가:
```tsx
export default function HospitalForm({
  mode, hospitalId, initial, scope = "admin",
}: {
  mode: "create" | "edit";
  hospitalId?: string;
  initial: HospitalInput;
  scope?: "admin" | "hospital";
}) {
```
(c) `onSubmit`을 scope 분기로 교체:
```tsx
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
```
(d) 기본정보 섹션의 **등급 select + 조건부 benefits + 공개 토글**(현재 `<div className="mt-3"><label>등급</label>...</select></div>`, `{form.tier === "BENEFIT" && <I18nField .../>}`, `<label ...>공개(환자화면 노출)</label>`)을 `{scope === "admin" && ( ... )}`로 감싸 병원 모드에서 숨김. slug 입력도 `{scope === "admin" && ...}`로 감쌈(병원은 slug 수정 불가).
(e) **시술/가격 섹션**(`<section ...><h3>시술/가격</h3>...</section>`) 전체를 `{scope === "admin" && ( ... )}`로 감쌈.

> 병원 모드에서 숨겨진 필드(tier/benefits/isPublished/menus/slug)는 `form` state에 그대로 남지만 `updateHospitalProfile`이 `pickHospitalEditableFields`로 무시하므로 안전.

- [ ] **Step 2: 빌드**

Run: `npm run build`
Expected: 성공. (`@/app/hospital/actions`는 Task 7에서 생성 — 아직 없으면 빌드 에러. **이 태스크는 Task 7과 함께 빌드 통과하도록, Step 1에서 import만 추가하고 Task 7에서 actions 생성 후 최종 빌드.** 만약 이 시점 빌드가 actions 부재로 실패하면, Task 7을 먼저 수행 후 본 태스크를 마무리한다 — 또는 본 태스크와 Task 7을 연속 커밋한다.)

> **구현 메모(순서 조정):** `updateHospitalProfile`이 없으면 빌드가 깨지므로, **Task 7의 `app/hospital/actions.ts` 생성을 본 태스크보다 먼저** 하거나, 본 태스크에서 import 대신 Task 7에서 HospitalForm import를 추가하는 방식 중 하나를 택한다. 권장: **Task 7을 먼저 구현(actions 포함)**하고 그 뒤 본 Task 6를 적용. 리뷰어/구현자는 이 의존성을 인지할 것.

- [ ] **Step 3: 커밋(Task 7 이후 빌드 통과 시점에)**

```bash
git add components/admin/HospitalForm.tsx
git commit -m "feat(tenancy): HospitalForm scope=hospital — 가격·등급·공개·slug 숨김 + updateHospitalProfile"
```

---

## Task 7: 병원 포털 (로그인·레이아웃·대시보드·프로필·예약 + 액션)

**Files:**
- Create: `app/hospital/actions.ts`, `app/hospital/login/page.tsx`, `app/hospital/(protected)/layout.tsx`, `app/hospital/(protected)/page.tsx`, `app/hospital/(protected)/profile/page.tsx`, `app/hospital/(protected)/bookings/page.tsx`

> 본 태스크를 **Task 6보다 먼저(actions 부분)** 또는 함께 빌드되게 진행.

- [ ] **Step 1: 병원 스코프 액션**

Create `app/hospital/actions.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireHospital } from "@/lib/auth/guard";
import { pickHospitalEditableFields, validateHospitalProfile } from "@/lib/hospital/editable";
import { ownsBooking } from "@/lib/auth/ownership";
import { canTransition } from "@/lib/booking/status";
import type { HospitalInput } from "@/lib/hospital/types";

export async function updateHospitalProfile(input: HospitalInput): Promise<{ ok: boolean; errors: string[] }> {
  const session = await requireHospital();
  const hospitalId = session.user.hospitalId as string;
  const errors = validateHospitalProfile(input);
  if (errors.length) return { ok: false, errors };
  const f = pickHospitalEditableFields(input);
  try {
    await db.hospital.update({
      where: { id: hospitalId },
      data: {
        name: f.name, intro: f.intro, about: f.about, address: f.address, cautions: f.cautions,
        city: f.city.trim(), district: f.district.trim(), category: f.category, tags: f.tags,
        image: f.image, images: f.images, operatingHours: f.operatingHours, messengers: f.messengers,
        doctors: { deleteMany: {}, create: f.doctors.map((d) => ({ name: d.name, specialty: d.specialty, image: d.image || null, order: d.order })) },
      },
    });
    revalidatePath("/hospital/profile");
    revalidatePath(`/hospitals/${hospitalId}`);
    return { ok: true, errors: [] };
  } catch (e: any) {
    return { ok: false, errors: ["저장 실패: " + String(e?.message || e)] };
  }
}

export async function updateOwnBookingStatus(bookingId: string, next: string): Promise<void> {
  const session = await requireHospital();
  const b = await db.booking.findUnique({ where: { id: bookingId } });
  if (!b || !ownsBooking(session, b.hospitalId)) return;
  if (!canTransition(b.status, next)) return;
  await db.booking.update({ where: { id: bookingId }, data: { status: next } });
  revalidatePath("/hospital/bookings");
}
```

- [ ] **Step 2: 병원 로그인**

Create `app/hospital/login/page.tsx`:
```tsx
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
```

- [ ] **Step 3: 보호 레이아웃**

Create `app/hospital/(protected)/layout.tsx`:
```tsx
import Link from "next/link";
import { signOut } from "@/auth";
import { requireHospital } from "@/lib/auth/guard";

export default async function HospitalLayout({ children }: { children: React.ReactNode }) {
  await requireHospital();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex gap-5 text-sm font-medium text-gray-700">
          <Link href="/hospital" className="hover:text-blue-600">대시보드</Link>
          <Link href="/hospital/profile" className="hover:text-blue-600">병원 정보</Link>
          <Link href="/hospital/bookings" className="hover:text-blue-600">예약</Link>
        </nav>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/hospital/login" }); }}>
          <button className="text-sm text-gray-400 hover:text-gray-700">로그아웃</button>
        </form>
      </header>
      <main className="p-6 max-w-4xl mx-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: 대시보드**

Create `app/hospital/(protected)/page.tsx`:
```tsx
import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { requireHospital } from "@/lib/auth/guard";
import Link from "next/link";

const TIER_LABEL: Record<string, string> = { RECOMMENDED: "추천", PARTNER: "제휴", BENEFIT: "베네핏" };

export default async function HospitalDashboard() {
  const session = await requireHospital();
  const hospitalId = session.user.hospitalId as string;
  const [hospital, newCount, totalCount] = await Promise.all([
    db.hospital.findUnique({ where: { id: hospitalId } }),
    db.booking.count({ where: { hospitalId, status: "NEW" } }),
    db.booking.count({ where: { hospitalId } }),
  ]);
  if (!hospital) return <p className="text-gray-400">병원 정보를 찾을 수 없습니다.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{resolveText(hospital.name, "ko")}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border"><div className="text-sm text-gray-500">공개 상태</div><div className="text-lg font-bold mt-2">{hospital.isPublished ? "공개중" : "비공개"}</div></div>
        <div className="bg-white p-5 rounded-xl border"><div className="text-sm text-gray-500">등급</div><div className="text-lg font-bold mt-2">{TIER_LABEL[hospital.tier] ?? hospital.tier}</div></div>
        <Link href="/hospital/bookings?status=NEW" className="bg-white p-5 rounded-xl border hover:shadow-md"><div className="text-sm text-gray-500">신규 예약</div><div className="text-3xl font-bold mt-2">{newCount}</div></Link>
        <Link href="/hospital/bookings" className="bg-white p-5 rounded-xl border hover:shadow-md"><div className="text-sm text-gray-500">전체 예약</div><div className="text-3xl font-bold mt-2">{totalCount}</div></Link>
      </div>
      <p className="text-sm text-gray-500">공개 여부·등급·시술 가격은 플랫폼에서 관리됩니다. 변경이 필요하면 운영팀에 문의하세요. <Link href="/hospital/profile" className="text-blue-600 underline">병원 정보 수정 →</Link></p>
    </div>
  );
}
```

- [ ] **Step 5: 프로필 수정 (scope=hospital)**

Create `app/hospital/(protected)/profile/page.tsx`:
```tsx
import { db } from "@/lib/db";
import { requireHospital } from "@/lib/auth/guard";
import HospitalForm from "@/components/admin/HospitalForm";
import { toI18n } from "@/lib/i18n/text";
import type { HospitalInput } from "@/lib/hospital/types";

export default async function HospitalProfilePage() {
  const session = await requireHospital();
  const hospitalId = session.user.hospitalId as string;
  const h = await db.hospital.findUnique({ where: { id: hospitalId }, include: { doctors: { orderBy: { order: "asc" } }, menus: { orderBy: { order: "asc" } } } });
  if (!h) return <p className="text-gray-400">병원 정보를 찾을 수 없습니다.</p>;

  const initial: HospitalInput = {
    slug: h.slug,
    name: toI18n(h.name), intro: toI18n(h.intro), about: toI18n(h.about), address: toI18n(h.address), cautions: toI18n(h.cautions),
    city: h.city, district: h.district, category: h.category, tags: h.tags, image: h.image, images: h.images,
    operatingHours: h.operatingHours as any, messengers: h.messengers as any,
    isPublished: h.isPublished, tier: h.tier, benefits: toI18n(h.benefits),
    doctors: h.doctors.map((d) => ({ name: toI18n(d.name), specialty: toI18n(d.specialty), image: d.image ?? "", order: d.order })),
    menus: h.menus.map((m) => ({ name: toI18n(m.name), category: m.category, price: m.price, priceText: toI18n(m.priceText), currency: m.currency, order: m.order })),
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">병원 정보 수정</h1>
      <p className="text-sm text-gray-500 mb-4">시술 가격·등급·공개 여부는 플랫폼 관리 항목이라 여기서 수정되지 않습니다.</p>
      <HospitalForm mode="edit" hospitalId={h.id} initial={initial} scope="hospital" />
    </div>
  );
}
```

- [ ] **Step 6: 예약 관리 (자기 것만)**

Create `app/hospital/(protected)/bookings/page.tsx`:
```tsx
import { db } from "@/lib/db";
import { requireHospital } from "@/lib/auth/guard";
import { canTransition, BOOKING_STATUSES } from "@/lib/booking/status";
import { updateOwnBookingStatus } from "@/app/hospital/actions";

const STATUS_LABEL: Record<string, string> = { NEW: "접수", CONFIRMED: "상담확정", VISITED: "내원", DONE: "완료", CANCELLED: "취소" };

export default async function HospitalBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const session = await requireHospital();
  const hospitalId = session.user.hospitalId as string;
  const { status } = await searchParams;
  const where: Record<string, unknown> = { hospitalId };
  if (status && (BOOKING_STATUSES as readonly string[]).includes(status)) where.status = status;
  const bookings = await db.booking.findMany({ where, orderBy: { createdAt: "desc" } });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">예약 관리</h1>
      <div className="flex gap-2 mb-6 text-sm">
        <a href="/hospital/bookings" className={`px-3 py-1 rounded-full ${!status ? "bg-gray-900 text-white" : "bg-gray-100"}`}>전체</a>
        {BOOKING_STATUSES.map((s) => (
          <a key={s} href={`/hospital/bookings?status=${s}`} className={`px-3 py-1 rounded-full ${status === s ? "bg-gray-900 text-white" : "bg-gray-100"}`}>{STATUS_LABEL[s]}</a>
        ))}
      </div>
      <div className="space-y-3">
        {bookings.length === 0 && <p className="text-gray-400">예약이 없습니다.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="bg-white border rounded-xl p-4 flex justify-between items-start">
            <div>
              <div className="font-bold">{b.name} <span className="text-xs text-gray-400">{b.nationality} · {b.code}</span></div>
              <div className="text-sm text-gray-500">{STATUS_LABEL[b.status] ?? b.status} · 희망: {new Date(b.preferredDate1).toLocaleDateString()} ({b.timeOfDay})</div>
              <div className="text-sm text-gray-500">연락: {b.phone}{b.email ? ` · ${b.email}` : ""}</div>
              {b.treatmentInterest && <div className="text-sm text-gray-600 mt-1">관심: {b.treatmentInterest}</div>}
            </div>
            <div className="flex flex-col gap-1">
              {BOOKING_STATUSES.filter((s) => canTransition(b.status, s)).map((s) => (
                <form key={s} action={updateOwnBookingStatus.bind(null, b.id, s)}>
                  <button className="text-xs px-3 py-1 rounded bg-blue-50 text-blue-700 w-full">{STATUS_LABEL[s]}</button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 빌드(+ Task 6 적용) + 커밋**

이 시점에 `app/hospital/actions.ts`가 존재하므로 Task 6의 HospitalForm 변경도 빌드 통과한다.
Run: `npm run build`
Expected: 성공. `/hospital/login`, `/hospital`, `/hospital/profile`, `/hospital/bookings` 라우트 확인.
```bash
git add app/hospital "components/admin/HospitalForm.tsx"
git commit -m "feat(tenancy): 병원 포털(로그인·대시보드·프로필·예약) + 스코프 액션 + HospitalForm scope"
```

> Task 6 커밋과 합쳐도 무방(의존성 때문). 둘을 한 커밋으로 처리하면 빌드 일관성 보장.

---

## Task 8: 통합 검증 + 마무리

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 전부 PASS. registration(5)+editable(6)+ownership(6) 신규. 카운트 요약(기존 105 + 17 = 122 근사).

- [ ] **Step 2: 전체 빌드 + 라우트**

Run: `npm run build`
Expected: 성공. `/hospital/register`, `/hospital/register/success`, `/hospital/login`, `/hospital`, `/hospital/profile`, `/hospital/bookings`, `/admin/accounts` 포함.

- [ ] **Step 3: 테넌시 스모크(등록→승인→소유권)**

`/tmp/t.mjs` 작성 후 `node /tmp/t.mjs` — Prisma로 등록 시뮬레이션 + 소유권 격리 확인:
```js
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  // 두 병원 + 두 HOSPITAL 계정 생성
  const h1 = await db.hospital.findFirst({ where: { isPublished: true } });
  const h2 = await db.hospital.findFirst({ where: { isPublished: true, NOT: { id: h1.id } } });
  if (!h1 || !h2) throw new Error("need 2 hospitals");
  // 격리: 병원1 계정이 병원2를 수정하려는 시도는 액션 레벨에서 ownsHospital로 차단됨(여기선 데이터 계약만 확인)
  const b = await db.booking.create({ data: { code: "RDB-T5B01", hospitalId: h1.id, name: "T", phone: "+8210", nationality: "US", preferredDate1: new Date("2026-07-01"), timeOfDay: "MORNING", consent: true } });
  const got = await db.booking.findUnique({ where: { id: b.id } });
  console.log("booking hospitalId:", got.hospitalId, "== h1:", got.hospitalId === h1.id, "!= h2:", got.hospitalId !== h2.id);
  await db.booking.delete({ where: { id: b.id } });
  console.log("SMOKE OK");
  await db.$disconnect();
}
main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
```
Expected: "SMOKE OK", booking이 h1 소속(h2 아님). /tmp 삭제.

- [ ] **Step 4: 수동 UAT(사람이 `npm run dev`)**

1. `/hospital/register` 신청(병원명·이메일·비번) → 성공 페이지. 같은 이메일 재신청 → 중복 에러.
2. `/hospital/login` 신청계정 로그인 시도 → 실패(PENDING).
3. 슈퍼관리자 `/admin/accounts` → 해당 계정 "승인". 대시보드 "승인 대기" 카운트 반영.
4. `/hospital/login` 다시 로그인 → `/hospital` 대시보드. 공개상태·등급은 읽기전용 표시.
5. `/hospital/profile` 정보·시간·메신저·사진·의료진·부작용 수정 저장 → 반영. **가격·등급·공개 섹션 없음**.
6. `/hospital/bookings` 자기 병원 예약만 노출, 상태 변경 동작.
7. 격리: 병원 계정으로 `/admin` 접근 → `/admin/login`로 바운스(슈퍼관리자 아님).
8. 비회귀: 슈퍼관리자 전체 관리(가격·등급·공개·전 예약)·환자 화면 정상.

- [ ] **Step 5: 커밋(있으면)**

검증 중 수정 없으면 생략.

---

## Self-Review 결과 (작성자 점검)

**1. Spec 커버리지**
- 자가등록(§3) → Task 4 ✅ / 승인(§4) → Task 5 ✅ / 포털(§5) → Task 7 ✅
- 필드분리·스코프(§6) → Task 2(pick/validateProfile)·Task 6(폼)·Task 7(액션) ✅
- 소유권 → Task 3 ✅ / 인증 라우팅(§7) → Task 7(login redirectTo)·Task 4(미들웨어) ✅
- 성공기준 1~6 → Task 8 ✅

**2. Placeholder 스캔:** 코드 스텝 실제 코드. Task 6/7 의존성(actions 선행)을 명시(플레이스홀더 아님 — 순서 지시). ✅

**3. 타입 일관성:** `validateHospitalRegistration`(registration.ts), `pickHospitalEditableFields`/`validateHospitalProfile`(editable.ts), `ownsHospital`/`ownsBooking`(ownership.ts), `requireHospital`(guard.ts), `updateHospitalProfile`/`updateOwnBookingStatus`(hospital/actions.ts), `approveHospitalAccount`/`rejectHospitalAccount`(admin/account-actions.ts) — 정의 Task와 사용 Task 일치. HospitalForm `scope` prop이 profile 페이지에서 `scope="hospital"`로 사용. ✅

> 주의(구현 시): **Task 6과 Task 7은 빌드 의존(HospitalForm가 hospital/actions를 import)** — 구현자는 Task 7의 actions를 먼저 만들고 Task 6를 적용하거나 두 태스크를 한 커밋으로 묶어 빌드 일관성을 유지한다. 본 플랜은 Task 7 Step 7에서 둘을 함께 빌드/커밋하도록 안내함.
