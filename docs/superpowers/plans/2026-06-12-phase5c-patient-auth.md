# Phase 5C — 환자 인증 + 후기 로그인 게이팅 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 환자가 자가 가입/로그인(role PATIENT, 즉시 ACTIVE)하고, Phase 4에서 UI에서 가렸던 후기를 로그인 게이팅으로 복원하며, 신규 후기를 로그인 계정에 귀속시킨다.

**Architecture:** 5A/5B의 NextAuth(Credentials+JWT) 토대를 재사용한다. 순수 검증 로직은 `lib/`에 두고 콜로케이트 vitest로 TDD, 서버액션은 `app/`에서 순수 로직을 호출한 뒤 DB. 환자 인증 라우트는 로케일 하위 `app/[locale]/account/`에 두어 next-intl 로케일 처리를 자동으로 받는다. 후기 게이팅은 스키마 플래그가 아니라 런타임 세션 역할 체크(`canViewReviews`/`canWriteReview`)로 한다.

**Tech Stack:** Next.js 15(App Router) · NextAuth(Auth.js v5, next-auth@5 beta) · Prisma(PostgreSQL/Neon) · next-intl v4(ko/en/zh/ja) · bcryptjs · vitest v4 · Tailwind.

**스펙:** `docs/superpowers/specs/2026-06-12-richdoc-phase5c-patient-auth-design.md`

---

## File Structure

**생성:**
- `lib/auth/patient-registration.ts` (+ `.test.ts`) — 가입 입력 순수 검증
- `lib/reviews/access.ts` (+ `.test.ts`) — 후기 열람/작성 권한 순수 판정
- `lib/reviews/validation.ts` (+ `.test.ts`) — 후기 입력 검증 + 금지어 스캐너 연동
- `prisma/migrations/20260612000001_review_author/migration.sql` — Review.authorUserId
- `app/[locale]/account/signup-actions.ts` — registerPatient 서버액션
- `app/[locale]/account/signup/page.tsx` — 가입 폼(client)
- `app/[locale]/account/login/page.tsx` — 로그인 폼(server)
- `app/[locale]/account/(protected)/layout.tsx` — requirePatient 가드 + 로그아웃
- `app/[locale]/account/(protected)/page.tsx` — 계정 홈(내 후기)
- `components/hospitals/ReviewForm.tsx` — 후기 작성 폼(client)
- `components/AccountNav.tsx` — 헤더 로그인/내 계정 링크(server)

**수정:**
- `prisma/schema.prisma` — Review 모델 authorUserId/author, User.reviews 역관계
- `lib/auth/guard.ts` — requirePatient() 추가
- `app/actions.ts` — addReview() 인증 게이팅 + FormData 시그니처로 재작성
- `app/[locale]/hospitals/[id]/page.tsx` — 후기 섹션 복원 + 게이팅 + 헤더에 AccountNav
- `app/[locale]/page.tsx` — 홈 헤더에 AccountNav
- `messages/{ko,en,zh,ja}.json` — Account 네임스페이스 + Detail.reviewsLoginRequired

---

## Task 1: Review 스키마 + 마이그레이션 (authorUserId)

**Files:**
- Modify: `prisma/schema.prisma:114-123` (Review), `prisma/schema.prisma:27` (User.leads 아래 reviews 추가)
- Create: `prisma/migrations/20260612000001_review_author/migration.sql`

- [ ] **Step 1: Review 모델에 authorUserId/author 추가**

`prisma/schema.prisma`의 Review 모델(114~123행)을 아래로 교체:

```prisma
// ⭐ 후기(리뷰) 시스템
model Review {
  id           String   @id @default(uuid())
  userName     String   // 작성자 이름 (익명 레거시 보존; 신규는 계정명)
  rating       Int      // 1~5점
  content      String   // 후기 내용
  hospitalId   String
  hospital     Hospital @relation(fields: [hospitalId], references: [id])
  authorUserId String?  // 신규: 로그인 작성자 (nullable, 기존 익명 후기 보존)
  author       User?    @relation(fields: [authorUserId], references: [id], onDelete: SetNull)
  createdAt    DateTime @default(now())

  @@index([authorUserId])
}
```

- [ ] **Step 2: User 모델에 reviews 역관계 추가**

`prisma/schema.prisma`의 User 모델에서 `leads Lead[]`(27행) 바로 아래에 추가:

```prisma
  leads         Lead[]
  reviews       Review[]
```

- [ ] **Step 3: 마이그레이션 SQL 작성**

`prisma/migrations/20260612000001_review_author/migration.sql` 생성:

```sql
-- Review에 작성자 계정 연결(authorUserId) 추가 — 기존 익명 후기는 NULL 유지(하위호환)

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "authorUserId" TEXT;

-- CreateIndex
CREATE INDEX "Review_authorUserId_idx" ON "Review"("authorUserId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 4: Prisma Client 재생성·검증**

Run: `npx prisma validate && npx prisma generate`
Expected: `The schema at prisma/schema.prisma is valid` + Client 재생성 성공.

> 참고: 운영 Neon 적용(`prisma migrate deploy`)은 배포 시 사람이 실행. 로컬 검증만 여기서.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260612000001_review_author/migration.sql
git commit -m "feat(patient-auth): Review.authorUserId 추가(계정 연결, 하위호환 마이그레이션)"
```

---

## Task 2: validatePatientSignup (순수 검증, TDD)

**Files:**
- Create: `lib/auth/patient-registration.ts`
- Test: `lib/auth/patient-registration.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`lib/auth/patient-registration.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validatePatientSignup } from "./patient-registration";

function valid() {
  return { email: "patient@x.com", password: "secret123", passwordConfirm: "secret123", name: "홍길동" };
}

describe("validatePatientSignup", () => {
  it("완전 입력은 에러 없음", () => expect(validatePatientSignup(valid())).toEqual([]));
  it("이메일 형식 오류", () => {
    const v = valid(); v.email = "bad";
    expect(validatePatientSignup(v).some((e) => e.includes("email"))).toBe(true);
  });
  it("비밀번호 8자 미만", () => {
    const v = valid(); v.password = "1234"; v.passwordConfirm = "1234";
    expect(validatePatientSignup(v).some((e) => e.includes("password"))).toBe(true);
  });
  it("비밀번호 불일치", () => {
    const v = valid(); v.passwordConfirm = "different1";
    expect(validatePatientSignup(v).some((e) => e.includes("passwordConfirm"))).toBe(true);
  });
  it("이름 누락", () => {
    const v = valid(); v.name = "  ";
    expect(validatePatientSignup(v).some((e) => e.includes("name"))).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- patient-registration`
Expected: FAIL — `validatePatientSignup` is not defined / 모듈 없음.

- [ ] **Step 3: 최소 구현**

`lib/auth/patient-registration.ts`:

```typescript
export type PatientSignupInput = {
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
};

export function validatePatientSignup(input: PatientSignupInput): string[] {
  const errors: string[] = [];
  const email = input.email.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email: 올바른 이메일을 입력하세요.");
  if (input.password.length < 8) errors.push("password: 비밀번호는 8자 이상이어야 합니다.");
  if (input.password !== input.passwordConfirm) errors.push("passwordConfirm: 비밀번호가 일치하지 않습니다.");
  if (!input.name.trim()) errors.push("name: 이름은 필수입니다.");
  return errors;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- patient-registration`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/patient-registration.ts lib/auth/patient-registration.test.ts
git commit -m "feat(patient-auth): 환자 가입 입력 검증(TDD)"
```

---

## Task 3: canViewReviews / canWriteReview (순수 권한, TDD)

**Files:**
- Create: `lib/reviews/access.ts`
- Test: `lib/reviews/access.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`lib/reviews/access.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { canViewReviews, canWriteReview } from "./access";

describe("canViewReviews", () => {
  it("환자는 후기 열람 가능", () => expect(canViewReviews("PATIENT")).toBe(true));
  it("병원도 열람 가능", () => expect(canViewReviews("HOSPITAL")).toBe(true));
  it("슈퍼관리자도 열람 가능", () => expect(canViewReviews("SUPER_ADMIN")).toBe(true));
  it("비로그인(undefined)은 불가", () => expect(canViewReviews(undefined)).toBe(false));
  it("알 수 없는 역할은 불가", () => expect(canViewReviews("GUEST")).toBe(false));
});

describe("canWriteReview", () => {
  it("환자는 작성 가능", () => expect(canWriteReview("PATIENT")).toBe(true));
  it("비로그인은 불가", () => expect(canWriteReview(null)).toBe(false));
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- reviews/access`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

`lib/reviews/access.ts`:

```typescript
import { hasRole } from "@/lib/auth/roles";

const LOGGED_IN_ROLES = ["PATIENT", "HOSPITAL", "SUPER_ADMIN"];

export function canViewReviews(role?: string | null): boolean {
  return hasRole(role, LOGGED_IN_ROLES);
}

export function canWriteReview(role?: string | null): boolean {
  return hasRole(role, LOGGED_IN_ROLES);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- reviews/access`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/reviews/access.ts lib/reviews/access.test.ts
git commit -m "feat(patient-auth): 후기 열람·작성 권한 판정(TDD)"
```

---

## Task 4: validateReviewInput (후기 검증 + 금지어, TDD)

**Files:**
- Create: `lib/reviews/validation.ts`
- Test: `lib/reviews/validation.test.ts`
- 참고(읽기): `lib/compliance/forbidden.ts` (`scanForbidden(text): string[]` 재사용)

- [ ] **Step 1: 실패 테스트 작성**

`lib/reviews/validation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateReviewInput } from "./validation";

function valid() {
  return { rating: 5, content: "친절하게 상담해주셔서 만족스러웠습니다." };
}

describe("validateReviewInput", () => {
  it("정상 입력은 에러 없음", () => expect(validateReviewInput(valid())).toEqual([]));
  it("평점 범위 밖(0)", () => {
    const v = valid(); v.rating = 0;
    expect(validateReviewInput(v).some((e) => e.includes("rating"))).toBe(true);
  });
  it("평점 범위 밖(6)", () => {
    const v = valid(); v.rating = 6;
    expect(validateReviewInput(v).some((e) => e.includes("rating"))).toBe(true);
  });
  it("내용 너무 짧음", () => {
    const v = valid(); v.content = "굿";
    expect(validateReviewInput(v).some((e) => e.includes("content"))).toBe(true);
  });
  it("금지어(보장) 포함 시 거부", () => {
    const v = valid(); v.content = "효과를 100% 보장합니다 정말 좋아요";
    expect(validateReviewInput(v).some((e) => e.includes("content"))).toBe(true);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- reviews/validation`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현**

`lib/reviews/validation.ts`:

```typescript
import { scanForbidden } from "@/lib/compliance/forbidden";

export type ReviewInput = { rating: number; content: string };

export function validateReviewInput(input: ReviewInput): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    errors.push("rating: 평점은 1~5점이어야 합니다.");
  }
  const content = input.content.trim();
  if (content.length < 5) errors.push("content: 후기는 5자 이상이어야 합니다.");
  if (content.length > 1000) errors.push("content: 후기는 1000자 이하여야 합니다.");
  const forbidden = scanForbidden(content);
  if (forbidden.length) errors.push(`content: 사용할 수 없는 표현이 포함되어 있습니다(${forbidden.join(", ")}).`);
  return errors;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- reviews/validation`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/reviews/validation.ts lib/reviews/validation.test.ts
git commit -m "feat(patient-auth): 후기 입력 검증 + 금지어 스캐너 연동(TDD)"
```

---

## Task 5: requirePatient 가드

**Files:**
- Modify: `lib/auth/guard.ts` (끝에 함수 추가, import 추가)

- [ ] **Step 1: requirePatient 추가**

`lib/auth/guard.ts` 상단 import에 `getLocale`를 추가하고, 파일 끝에 함수를 추가한다. 최종 파일:

```typescript
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { hasRole } from "./roles";

// 세션 + 역할 가드. 불충족 시 /admin/login 으로 리다이렉트.
export async function requireRole(allowed: string[]) {
  const session = await auth();
  if (!session || !hasRole(session.user?.role, allowed)) {
    redirect("/admin/login");
  }
  return session;
}

// 병원 포털 가드: HOSPITAL 역할 + hospitalId 보유. 불충족 시 /hospital/login.
export async function requireHospital() {
  const session = await auth();
  if (!session || !hasRole(session.user?.role, ["HOSPITAL"]) || !session.user?.hospitalId) {
    redirect("/hospital/login");
  }
  return session;
}

// 환자 가드: PATIENT 역할. 불충족 시 현재 로케일의 /account/login 으로 리다이렉트.
export async function requirePatient() {
  const session = await auth();
  if (!session || !hasRole(session.user?.role, ["PATIENT"])) {
    const locale = await getLocale();
    redirect(`/${locale}/account/login`);
  }
  return session;
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음(기존 통과 상태 유지).

- [ ] **Step 3: Commit**

```bash
git add lib/auth/guard.ts
git commit -m "feat(patient-auth): requirePatient 가드(로케일 인식 리다이렉트)"
```

---

## Task 6: i18n Account 네임스페이스 + Detail.reviewsLoginRequired (4개 로케일)

**Files:**
- Modify: `messages/ko.json`, `messages/en.json`, `messages/zh.json`, `messages/ja.json`

> 4개 파일 모두 동일 키를 추가해야 한다(next-intl은 누락 키에서 런타임 에러). 각 파일의 최상위 객체에 `"Account"` 블록을 추가하고, 기존 `"Detail"` 블록에 `"reviewsLoginRequired"` 키를 추가한다.

- [ ] **Step 1: ko.json 수정**

`messages/ko.json`의 `"Detail"` 객체 안 `"reviewsComingSoon"` 항목 뒤에 추가:

```json
      "reviewsLoginRequired": "로그인 후 후기를 확인하고 작성할 수 있습니다."
```

그리고 최상위에 `"Compliance"` 블록 뒤(마지막 `}` 앞)에 추가:

```json
  ,"Account": {
    "loginTitle": "로그인",
    "signupTitle": "회원가입",
    "login": "로그인",
    "signup": "회원가입",
    "logout": "로그아웃",
    "myAccount": "내 계정",
    "myReviews": "내 후기",
    "email": "이메일",
    "password": "비밀번호",
    "passwordConfirm": "비밀번호 확인",
    "name": "이름",
    "loginSubmit": "로그인",
    "signupSubmit": "회원가입",
    "alreadyHaveAccount": "이미 계정이 있으신가요? 로그인",
    "noAccount": "계정이 없으신가요? 회원가입",
    "loginFailed": "로그인 실패: 이메일 또는 비밀번호를 확인하세요.",
    "noReviews": "작성한 후기가 없습니다.",
    "saving": "처리 중..."
  }
```

- [ ] **Step 2: en.json 수정**

`"Detail"`에 추가: `"reviewsLoginRequired": "Log in to view and write reviews."`
최상위에 추가:

```json
  ,"Account": {
    "loginTitle": "Log in",
    "signupTitle": "Sign up",
    "login": "Log in",
    "signup": "Sign up",
    "logout": "Log out",
    "myAccount": "My Account",
    "myReviews": "My Reviews",
    "email": "Email",
    "password": "Password",
    "passwordConfirm": "Confirm password",
    "name": "Name",
    "loginSubmit": "Log in",
    "signupSubmit": "Sign up",
    "alreadyHaveAccount": "Already have an account? Log in",
    "noAccount": "No account? Sign up",
    "loginFailed": "Login failed: check your email or password.",
    "noReviews": "You haven't written any reviews.",
    "saving": "Processing..."
  }
```

- [ ] **Step 3: zh.json 수정**

`"Detail"`에 추가: `"reviewsLoginRequired": "登录后即可查看和撰写评价。"`
최상위에 추가:

```json
  ,"Account": {
    "loginTitle": "登录",
    "signupTitle": "注册",
    "login": "登录",
    "signup": "注册",
    "logout": "退出登录",
    "myAccount": "我的账户",
    "myReviews": "我的评价",
    "email": "邮箱",
    "password": "密码",
    "passwordConfirm": "确认密码",
    "name": "姓名",
    "loginSubmit": "登录",
    "signupSubmit": "注册",
    "alreadyHaveAccount": "已有账户？登录",
    "noAccount": "没有账户？注册",
    "loginFailed": "登录失败：请检查邮箱或密码。",
    "noReviews": "您还没有写过评价。",
    "saving": "处理中..."
  }
```

- [ ] **Step 4: ja.json 수정**

`"Detail"`에 추가: `"reviewsLoginRequired": "ログインすると口コミの閲覧・投稿ができます。"`
최상위에 추가:

```json
  ,"Account": {
    "loginTitle": "ログイン",
    "signupTitle": "新規登録",
    "login": "ログイン",
    "signup": "新規登録",
    "logout": "ログアウト",
    "myAccount": "マイアカウント",
    "myReviews": "マイ口コミ",
    "email": "メールアドレス",
    "password": "パスワード",
    "passwordConfirm": "パスワード確認",
    "name": "お名前",
    "loginSubmit": "ログイン",
    "signupSubmit": "新規登録",
    "alreadyHaveAccount": "すでにアカウントをお持ちですか？ログイン",
    "noAccount": "アカウントをお持ちでないですか？新規登録",
    "loginFailed": "ログインに失敗しました：メールアドレスまたはパスワードをご確認ください。",
    "noReviews": "投稿した口コミはありません。",
    "saving": "処理中..."
  }
```

- [ ] **Step 5: JSON 유효성 확인**

Run: `node -e "for (const l of ['ko','en','zh','ja']) { JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8')); console.log(l,'OK'); }"`
Expected: `ko OK / en OK / zh OK / ja OK` (구문 오류 없음).

> 주의: `,"Account"` 앞 콤마는 직전 블록 뒤에 붙이는 형식 예시다. 실제 편집 시 마지막 키 뒤 콤마 위치가 유효한 JSON이 되도록 맞춘다(위 node 검증으로 보장).

- [ ] **Step 6: Commit**

```bash
git add messages/ko.json messages/en.json messages/zh.json messages/ja.json
git commit -m "feat(patient-auth): i18n Account 네임스페이스 + 후기 로그인 안내(4개 로케일)"
```

---

## Task 7: registerPatient 서버액션

**Files:**
- Create: `app/[locale]/account/signup-actions.ts`
- 참고: `lib/auth/password.ts`(`hashPassword`), `lib/auth/patient-registration.ts`, `auth.ts`(`signIn`)

- [ ] **Step 1: 구현**

`app/[locale]/account/signup-actions.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { hashPassword } from "@/lib/auth/password";
import { validatePatientSignup } from "@/lib/auth/patient-registration";

export async function registerPatient(formData: FormData): Promise<{ ok: boolean; errors: string[] }> {
  const input = {
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    passwordConfirm: String(formData.get("passwordConfirm") || ""),
    name: String(formData.get("name") || ""),
  };
  const locale = String(formData.get("locale") || "ko");

  const errors = validatePatientSignup(input);
  if (errors.length) return { ok: false, errors };

  const email = input.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { ok: false, errors: ["email: 이미 가입된 이메일입니다."] };

  const passwordHash = await hashPassword(input.password);
  try {
    await db.user.create({
      data: { email, passwordHash, name: input.name.trim(), role: "PATIENT", status: "ACTIVE" },
    });
  } catch (e: any) {
    return { ok: false, errors: ["가입 실패: " + String(e?.message || e)] };
  }

  // 즉시 ACTIVE → 자동 로그인 후 계정 홈으로. signIn은 성공 시 NEXT_REDIRECT를 throw한다.
  try {
    await signIn("credentials", { email, password: input.password, redirectTo: `/${locale}/account` });
  } catch (e) {
    if (e instanceof AuthError) redirect(`/${locale}/account/login`);
    throw e; // NEXT_REDIRECT 통과(성공 리다이렉트)
  }
  return { ok: true, errors: [] };
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/account/signup-actions.ts"
git commit -m "feat(patient-auth): registerPatient 서버액션(즉시 ACTIVE + 자동 로그인)"
```

---

## Task 8: 가입 페이지 (client)

**Files:**
- Create: `app/[locale]/account/signup/page.tsx`

- [ ] **Step 1: 구현**

`app/[locale]/account/signup/page.tsx` — 병원 register 페이지 패턴 미러. `useLocale()`로 locale을 hidden 필드에 담아 서버액션이 로케일을 안다.

```tsx
"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { registerPatient } from "@/app/[locale]/account/signup-actions";

export default function PatientSignupPage() {
  const t = useTranslations("Account");
  const locale = useLocale();
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const fd = new FormData(e.currentTarget);
    fd.set("locale", locale);
    const res = await registerPatient(fd);
    setSaving(false);
    if (res && !res.ok) setErrors(res.errors);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">{t("signupTitle")}</h1>
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm mb-4">
            {errors.map((er, i) => <div key={i}>• {er}</div>)}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <input name="name" placeholder={t("name")} required className="w-full border p-3 rounded-lg" />
          <input name="email" type="email" placeholder={t("email")} required className="w-full border p-3 rounded-lg" />
          <input name="password" type="password" placeholder={t("password")} required className="w-full border p-3 rounded-lg" />
          <input name="passwordConfirm" type="password" placeholder={t("passwordConfirm")} required className="w-full border p-3 rounded-lg" />
          <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg disabled:opacity-50">
            {saving ? t("saving") : t("signupSubmit")}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4">
          <Link href="/account/login" className="hover:underline">{t("alreadyHaveAccount")}</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/account/signup/page.tsx"
git commit -m "feat(patient-auth): 환자 가입 페이지"
```

---

## Task 9: 로그인 페이지 (server)

**Files:**
- Create: `app/[locale]/account/login/page.tsx`

- [ ] **Step 1: 구현**

`app/[locale]/account/login/page.tsx` — 병원 login 패턴 미러 + 로케일 인식 redirectTo + i18n.

```tsx
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function PatientLoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error } = await searchParams;
  const t = await getTranslations("Account");

  async function doLogin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: `/${locale}/account`,
      });
    } catch (e) {
      if (e instanceof AuthError) redirect(`/${locale}/account/login?error=1`);
      throw e;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t("loginTitle")}</h1>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{t("loginFailed")}</p>}
        <form action={doLogin} className="space-y-4">
          <input name="email" type="email" placeholder={t("email")} required autoFocus className="w-full border border-gray-300 px-4 py-3 rounded-lg" />
          <input name="password" type="password" placeholder={t("password")} required className="w-full border border-gray-300 px-4 py-3 rounded-lg" />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">{t("loginSubmit")}</button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4">
          <Link href="/account/signup" className="hover:underline">{t("noAccount")}</Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/account/login/page.tsx"
git commit -m "feat(patient-auth): 환자 로그인 페이지(로케일 인식)"
```

---

## Task 10: 보호 레이아웃 (requirePatient + 로그아웃)

**Files:**
- Create: `app/[locale]/account/(protected)/layout.tsx`

- [ ] **Step 1: 구현**

```tsx
import { signOut } from "@/auth";
import { requirePatient } from "@/lib/auth/guard";
import { Link } from "@/i18n/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export default async function AccountLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePatient();
  const t = await getTranslations("Account");

  async function logout() {
    "use server";
    await signOut({ redirectTo: `/${locale}/account/login` });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex gap-5 text-sm font-medium text-gray-700">
          <Link href="/account" className="hover:text-blue-600">{t("myAccount")}</Link>
        </nav>
        <form action={logout}>
          <button className="text-sm text-gray-400 hover:text-gray-700">{t("logout")}</button>
        </form>
      </header>
      <main className="p-6 max-w-3xl mx-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/account/(protected)/layout.tsx"
git commit -m "feat(patient-auth): 환자 보호 레이아웃(requirePatient + 로그아웃)"
```

---

## Task 11: 계정 홈 (내 후기)

**Files:**
- Create: `app/[locale]/account/(protected)/page.tsx`
- 참고: `lib/i18n/text.ts`(`resolveText`)

- [ ] **Step 1: 구현**

```tsx
import { requirePatient } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { Star } from "lucide-react";
import { setRequestLocale, getTranslations } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function AccountHome({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePatient();
  const t = await getTranslations("Account");

  const reviews = await db.review.findMany({
    where: { authorUserId: session.user.id },
    include: { hospital: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="text-lg font-bold text-gray-900">{session.user.name || t("myAccount")}</div>
        <div className="text-sm text-gray-500">{session.user.email}</div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="font-bold text-lg mb-4">{t("myReviews")}</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">{t("noReviews")}</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-gray-50 pb-4 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">{resolveText(r.hospital.name, locale)}</span>
                  <span className="flex items-center text-yellow-500 text-sm font-bold">
                    <Star className="w-4 h-4 fill-current mr-1" /> {r.rating}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{r.content}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/account/(protected)/page.tsx"
git commit -m "feat(patient-auth): 계정 홈 + 내 후기 목록"
```

---

## Task 12: addReview 인증 게이팅 재작성

**Files:**
- Modify: `app/actions.ts:1-7`(import 추가), `app/actions.ts:78-93`(addReview 교체)

- [ ] **Step 1: import 추가**

`app/actions.ts` 상단 import 블록(1~7행)을 아래로 교체:

```typescript
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveText } from "@/lib/i18n/text";
import { compareHospitalsByTier } from "@/lib/hospital/tier";
import { auth } from "@/auth";
import { canWriteReview } from "@/lib/reviews/access";
import { validateReviewInput } from "@/lib/reviews/validation";
```

- [ ] **Step 2: addReview 교체**

`app/actions.ts`의 기존 `addReview`(78~93행, "// 4. 리뷰 작성하기" 주석 포함)를 아래로 교체:

```typescript
// 4. 리뷰 작성하기 (로그인 필수, 계정 귀속)
export async function addReview(formData: FormData): Promise<{ ok: boolean; errors: string[] }> {
  const session = await auth();
  if (!canWriteReview(session?.user?.role)) {
    return { ok: false, errors: ["로그인이 필요합니다."] };
  }

  const hospitalId = String(formData.get("hospitalId") || "");
  const rating = Number(formData.get("rating") || 0);
  const content = String(formData.get("content") || "");

  const errors = validateReviewInput({ rating, content });
  if (errors.length) return { ok: false, errors };

  const userName = session!.user.name || session!.user.email?.split("@")[0] || "회원";

  try {
    await db.review.create({
      data: { hospitalId, userName, rating, content: content.trim(), authorUserId: session!.user.id },
    });
    revalidatePath(`/hospitals/${hospitalId}`);
  } catch (error) {
    console.error("리뷰 작성 실패:", error);
    return { ok: false, errors: ["후기 등록에 실패했습니다."] };
  }
  return { ok: true, errors: [] };
}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음(기존 addReview 호출처 없음 — Task 사전조사로 확인됨).

- [ ] **Step 4: Commit**

```bash
git add app/actions.ts
git commit -m "feat(patient-auth): addReview 로그인 게이팅 + 계정 귀속 + 금지어 검증"
```

---

## Task 13: ReviewForm (client)

**Files:**
- Create: `components/hospitals/ReviewForm.tsx`

- [ ] **Step 1: 구현**

별점 select + 내용 입력. 제출 시 addReview 호출, 에러 표시, 성공 시 폼 리셋 + `router.refresh()`로 목록 갱신.

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addReview } from "@/app/actions";

export default function ReviewForm({ hospitalId }: { hospitalId: string }) {
  const t = useTranslations("Detail");
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(5);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSaving(true);
    setErrors([]);
    const fd = new FormData(form);
    fd.set("hospitalId", hospitalId);
    fd.set("rating", String(rating));
    const res = await addReview(fd);
    setSaving(false);
    if (res && !res.ok) { setErrors(res.errors); return; }
    form.reset();
    setRating(5);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
          {errors.map((er, i) => <div key={i}>• {er}</div>)}
        </div>
      )}
      <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border p-2 rounded-lg text-sm">
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
      </select>
      <textarea name="content" placeholder={t("reviewContent")} required rows={3} className="w-full border p-3 rounded-lg text-sm" />
      <button type="submit" disabled={saving} className="bg-blue-600 text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50">
        {t("reviewSubmit")}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add "components/hospitals/ReviewForm.tsx"
git commit -m "feat(patient-auth): 후기 작성 폼 컴포넌트"
```

---

## Task 14: 병원 상세 페이지 후기 게이팅 복원

**Files:**
- Modify: `app/[locale]/hospitals/[id]/page.tsx` (import 추가, 73행 배지, 137~140행 후기 섹션)

- [ ] **Step 1: import 추가**

`app/[locale]/hospitals/[id]/page.tsx` 상단 import 블록 끝(9행 `ComplianceNotice` 아래)에 추가:

```tsx
import { auth } from "@/auth";
import { canViewReviews } from "@/lib/reviews/access";
import ReviewForm from "@/components/hospitals/ReviewForm";
```

- [ ] **Step 2: 세션 로드 + 권한 계산**

`const hospital = await getHospitalById(hospitalId);`(25행) 바로 아래에 추가:

```tsx
  const session = await auth();
  const canView = canViewReviews(session?.user?.role);
```

- [ ] **Step 3: 리뷰 수 배지 게이팅**

73행 `<span className="text-gray-400 text-sm">리뷰 {hospital.userReviews?.length || 0}개</span>` 를 아래로 교체:

```tsx
            <span className="text-gray-400 text-sm">{canView ? `리뷰 ${hospital.userReviews?.length || 0}개` : ""}</span>
```

- [ ] **Step 4: 후기 섹션 복원 + 게이팅**

137~140행의 후기 박스(`<div className="bg-white rounded-xl p-6 shadow-sm mb-20"> ... </div>`)를 아래로 교체:

```tsx
        <div className="bg-white rounded-xl p-6 shadow-sm mb-20">
          <h3 className="font-bold text-lg mb-4 flex items-center"><MessageSquare className="w-5 h-5 mr-2 text-blue-600"/> {tDetail("reviewsTitle")}</h3>
          {canView ? (
            <>
              {hospital.userReviews && hospital.userReviews.length > 0 ? (
                <ul className="space-y-4">
                  {hospital.userReviews.map((rv) => (
                    <li key={rv.id} className="border-b border-gray-50 pb-4 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{rv.userName}</span>
                        <span className="flex items-center text-yellow-500 text-sm font-bold">
                          <Star className="w-4 h-4 fill-current mr-1" /> {rv.rating}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{rv.content}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">{tDetail("noReviews")}</p>
              )}
              <ReviewForm hospitalId={hospital.id} />
              <ComplianceNotice k="reviewDisclaimer" className="mt-3" />
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-3">{tDetail("reviewsLoginRequired")}</p>
              <Link href="/account/login" className="inline-block bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold">
                {tDetail("reviewsTitle")}
              </Link>
            </div>
          )}
        </div>
```

> 참고: 게이트 버튼 라벨로 `reviewsTitle`(후기) 재사용. 별도 라벨이 필요하면 Account.login 사용 가능하나, Detail 네임스페이스 일관성을 위해 reviewsTitle 사용.

- [ ] **Step 5: 타입체크 + 빌드**

Run: `npx tsc --noEmit && npm run build`
Expected: 타입·빌드 에러 없음.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/hospitals/[id]/page.tsx"
git commit -m "feat(patient-auth): 병원 상세 후기 로그인 게이팅 복원(읽기·쓰기)"
```

---

## Task 15: AccountNav + 헤더 배치

**Files:**
- Create: `components/AccountNav.tsx`
- Modify: `app/[locale]/page.tsx`(홈 헤더), `app/[locale]/hospitals/[id]/page.tsx`(상세 헤더)

- [ ] **Step 1: AccountNav 구현**

`components/AccountNav.tsx` — 서버 컴포넌트, 세션 유무로 분기.

```tsx
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function AccountNav() {
  const session = await auth();
  const t = await getTranslations("Account");
  if (session?.user) {
    return (
      <Link href="/account" className="text-sm font-medium text-gray-700 hover:text-blue-600">
        {t("myAccount")}
      </Link>
    );
  }
  return (
    <Link href="/account/login" className="text-sm font-medium text-gray-700 hover:text-blue-600">
      {t("login")}
    </Link>
  );
}
```

> 엣지: 로그인한 HOSPITAL/SUPER_ADMIN이 환자 사이트를 보면 "내 계정"이 보이고 클릭 시 requirePatient가 account/login으로 보낸다(MVP 허용 범위).

- [ ] **Step 2: 홈 헤더에 배치**

`app/[locale]/page.tsx` 2행 import 아래에 추가:

```tsx
import AccountNav from "@/components/AccountNav";
```

27~30행의 헤더 우측 묶음을 아래로 교체(LocaleSwitcher와 CTA 사이에 AccountNav 삽입):

```tsx
          <div className="flex items-center gap-4">
            <div className="hidden md:flex"><LocaleSwitcher /></div>
            <AccountNav />
            <a href="#hospitals" className="bg-gray-900 text-white px-5 py-2 rounded-full font-bold text-sm hover:bg-gray-800 transition">{t("bookConsultation")}</a>
          </div>
```

- [ ] **Step 3: 상세 헤더에 배치**

`app/[locale]/hospitals/[id]/page.tsx`의 상세 헤더(51~54행)를 아래로 교체(제목 우측에 AccountNav):

```tsx
      <div className="bg-white sticky top-0 z-10 px-4 h-14 flex items-center shadow-sm">
        <Link href="/hospitals" className="mr-4"><ArrowLeft className="w-6 h-6" /></Link>
        <h1 className="font-bold text-lg truncate flex-1">{resolveText(hospital.name, locale)}</h1>
        <AccountNav />
      </div>
```

그리고 상세 페이지 import에 추가(Task 14 import 블록 옆):

```tsx
import AccountNav from "@/components/AccountNav";
```

- [ ] **Step 4: 타입체크 + 빌드**

Run: `npx tsc --noEmit && npm run build`
Expected: 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add "components/AccountNav.tsx" "app/[locale]/page.tsx" "app/[locale]/hospitals/[id]/page.tsx"
git commit -m "feat(patient-auth): AccountNav(로그인/내 계정) 홈·상세 헤더 배치"
```

---

## Task 16: 전체 검증 + 컴플라이언스 최종 게이트

**Files:** (없음 — 검증·문서)

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 기존 122 + 신규 17(patient-registration 5, reviews/access 7, reviews/validation 5) = 139 통과.

- [ ] **Step 2: 전체 빌드**

Run: `npm run build`
Expected: 빌드 성공, 타입 에러 없음.

- [ ] **Step 3: 수동 UAT 체크리스트(사람이 `npm run dev`)**

운영DB 쓰기 차단 환경이므로 사람이 로컬에서 확인:
- [ ] `/ko/account/signup` 가입 → 자동 로그인 → `/ko/account` 도착, 이름·이메일 표시.
- [ ] 로그아웃 → `/ko/account/login` → 재로그인 성공.
- [ ] 비로그인으로 병원 상세 → 후기 목록·작성폼 숨김, "로그인 후 후기" 안내 노출, 리뷰 수 배지 숨김.
- [ ] 로그인 후 병원 상세 → 후기 목록·작성폼·disclaimer 노출. 후기 작성 → 목록에 계정명으로 표시.
- [ ] 금지어("100% 보장") 후기 제출 → 거부 에러.
- [ ] 계정 홈 "내 후기"에 방금 쓴 후기 표시.
- [ ] 비회원 병원 탐색·예약 흐름, 병원 포털(/hospital), admin(/admin) 정상(비회귀).

- [ ] **Step 4: 의료광고법 최종 게이트**

`medical_compliance_checker` 스킬로 산출 문구 교차검증:
- 게이트 안내(`reviewsLoginRequired`), 면책(`reviewDisclaimer`), 금지어 스캐너 동작, 작성폼에 효과 보장 유도 문구 없음.
- 4개 로케일의 Account/Detail 신규 문구에 단정·보장·유인 표현 없음.
- 결과를 운영 매뉴얼 섹션 2 체크리스트와 대조, 위반 시 수정 후 재검.

- [ ] **Step 5: 메모리 업데이트**

`phase5-auth-progress.md`에 5C 완료 기록, MEMORY.md 인덱스 갱신, `phase4-compliance-followups.md` #1(후기 비로그인 노출) 해소 표기.

---

## Self-Review (작성자 점검 결과)

**1. 스펙 커버리지:** 스펙 §2 스키마→Task 1, §3 순수로직→Task 2~4, §4 가드→Task 5, §5 라우팅→Task 8~11, §6 가입액션→Task 7, §7 후기게이팅→Task 12~14, §8 i18n·헤더→Task 6·15, §9 컴플라이언스→Task 4·14·16, §11 성공기준→Task 16. 누락 없음.

**2. 플레이스홀더:** 없음. 모든 코드 스텝에 완전한 코드 포함.

**3. 타입/시그니처 일관성:**
- `validatePatientSignup(PatientSignupInput): string[]` — Task 2 정의 = Task 7 사용 일치.
- `canViewReviews/canWriteReview(role?): boolean` — Task 3 정의 = Task 12·14 사용 일치.
- `validateReviewInput({rating,content}): string[]` — Task 4 정의 = Task 12 사용 일치.
- `addReview(formData: FormData): {ok,errors}` — Task 12 정의 = Task 13 사용 일치(이전 위치인자 시그니처 폐기, 호출처 없음 확인됨).
- `requirePatient()` — Task 5 정의 = Task 10·11 사용 일치.
- `registerPatient(formData)` — Task 7 정의 = Task 8 사용 일치.
- i18n 키: Task 6에서 추가한 `Account.*`/`Detail.reviewsLoginRequired`만 Task 8~11·14~15에서 사용.

**주의 가정(붕괴 조건):**
- `signIn`을 서버액션에서 호출 시 성공도 NEXT_REDIRECT throw → Task 7·9에서 AuthError만 catch하고 나머지 rethrow. 만약 next-auth 버전이 redirect를 throw하지 않으면 자동 로그인 후 페이지 이동이 안 될 수 있음 → UAT Step 3에서 확인.
- `getLocale()`(next-intl/server)가 서버액션/가드 컨텍스트에서 현재 로케일 반환 가정. 미해석 시 redirect 경로가 깨질 수 있음 → 빌드/UAT에서 확인, 필요 시 locale을 인자로 전달하도록 보강.
