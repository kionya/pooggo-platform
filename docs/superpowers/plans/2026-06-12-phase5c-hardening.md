# Phase 5C 강화 — 후기 모더레이션 + 이메일 인증 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ② 후기 신고·관리자 소프트숨김/삭제 모더레이션과 ③ 이메일 인증(가입 PENDING→링크 인증→ACTIVE, 자동로그인 폐지)을 추가해 의료광고법 자문 결론(큐레이션 회피·게이팅 폐쇄성)을 코드로 반영한다.

**Architecture:** 순수 검증/토큰 로직은 `lib/`(콜로케이트 vitest TDD), 서버액션은 `app/`. 이메일은 기존 `lib/notify`(Resend) 재사용. 인증은 status(PENDING/ACTIVE) 재사용 + User 토큰 2필드. 모더레이션은 Report 모델 + Review.isHidden, 관리자 `/admin/reviews`.

**Tech Stack:** Next.js 16(App Router) · NextAuth(Auth.js v5) · Prisma(PostgreSQL/Neon) · next-intl(ko/en/zh/ja) · Resend(fetch) · vitest · Tailwind.

**스펙:** `docs/superpowers/specs/2026-06-12-pooggo-phase5c-hardening-design.md`
**자문:** `docs/compliance/2026-06-12-medical-ad-prereview-analysis.md`

---

## File Structure

**생성:**
- `lib/auth/verification.ts` (+`.test.ts`) — 토큰 생성·만료 순수로직
- `lib/reviews/report.ts` (+`.test.ts`) — 신고 권한·사유 검증
- `prisma/migrations/20260612000002_review_moderation_email_verify/migration.sql`
- `app/[locale]/account/verify-sent/page.tsx` — 인증메일 안내
- `app/[locale]/account/verify-actions.ts` — resendVerification
- `app/[locale]/account/verify/page.tsx` — 토큰 인증 처리
- `components/hospitals/ReportButton.tsx` — 후기 신고(client)
- `app/admin/(protected)/reviews/page.tsx` — 관리자 후기 모더레이션
- `app/admin/review-actions.ts` — hide/unhide/delete

**수정:**
- `prisma/schema.prisma` — Review.isHidden/reports, Report 모델, User 토큰 2필드/reports
- `lib/notify/templates.ts` — verificationEmail(link, locale)
- `app/[locale]/account/signup-actions.ts` — registerPatient: PENDING+토큰+메일+verify-sent
- `app/[locale]/account/login/page.tsx` — ?verified 배너
- `app/actions.ts` — getHospitalById isHidden 필터, reportReview 액션
- `app/[locale]/hospitals/[id]/page.tsx` — 후기 항목 ReportButton
- `app/[locale]/account/(protected)/page.tsx` — 내후기 숨김 라벨
- `app/admin/(protected)/layout.tsx` — 후기관리 nav
- `app/admin/(protected)/page.tsx` — 신고된 후기 카운트
- `messages/{ko,en,zh,ja}.json` — Account/Detail 키

> 참고: 관리자 승인 큐(`/admin/accounts`·대시보드)는 **이미 `role:"HOSPITAL"`로 스코핑됨**(현 코드 확인) → 추가 보정 불필요.

---

## Task 1: 스키마 + 마이그레이션

**Files:** Modify `prisma/schema.prisma`; Create `prisma/migrations/20260612000002_review_moderation_email_verify/migration.sql`

- [ ] **Step 1: Review 모델에 isHidden·reports 추가**

`prisma/schema.prisma`의 Review 모델을 아래로 교체(기존 authorUserId/author/@@index 유지 + isHidden/reports 추가):

```prisma
model Review {
  id           String   @id @default(uuid())
  userName     String   // 작성자 이름 (익명 레거시 보존; 신규는 계정명)
  rating       Int      // 1~5점
  content      String   // 후기 내용
  hospitalId   String
  hospital     Hospital @relation(fields: [hospitalId], references: [id])
  authorUserId String?  // 로그인 작성자 (nullable, 기존 익명 후기 보존)
  author       User?    @relation(fields: [authorUserId], references: [id], onDelete: SetNull)
  isHidden     Boolean  @default(false) // 관리자 소프트숨김
  reports      Report[]
  createdAt    DateTime @default(now())

  @@index([authorUserId])
}
```

- [ ] **Step 2: Report 모델 추가 + User 확장**

`prisma/schema.prisma`의 Review 모델 바로 아래에 Report 모델을 추가:

```prisma
// 후기 신고
model Report {
  id             String   @id @default(uuid())
  reviewId       String
  review         Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  reporterUserId String?
  reporter       User?    @relation(fields: [reporterUserId], references: [id], onDelete: SetNull)
  reason         String?
  createdAt      DateTime @default(now())

  @@unique([reviewId, reporterUserId])
  @@index([reviewId])
}
```

그리고 User 모델에 토큰 2필드 + reports 역관계를 추가(`reviews Review[]` 아래):

```prisma
  reviews            Review[]
  reports            Report[]
  emailVerifyToken   String?
  emailVerifyExpires DateTime?
```

- [ ] **Step 3: 마이그레이션 SQL 작성**

`prisma/migrations/20260612000002_review_moderation_email_verify/migration.sql`:

```sql
-- 후기 모더레이션(Review.isHidden + Report) + 이메일 인증 토큰(User)

-- AlterTable: Review 소프트숨김
ALTER TABLE "Review" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: User 인증 토큰
ALTER TABLE "User" ADD COLUMN "emailVerifyToken" TEXT,
ADD COLUMN "emailVerifyExpires" TIMESTAMP(3);

-- CreateTable: Report
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reporterUserId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Report_reviewId_reporterUserId_key" ON "Report"("reviewId", "reporterUserId");
CREATE INDEX "Report_reviewId_idx" ON "Report"("reviewId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 4: 검증**

Run: `npx prisma validate && npx prisma generate`
Expected: `valid` + Client 재생성.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260612000002_review_moderation_email_verify/migration.sql
git commit -m "feat(hardening): Review.isHidden + Report 모델 + User 이메일인증 토큰 스키마"
```

---

## Task 2: lib/auth/verification.ts (TDD)

**Files:** Create `lib/auth/verification.ts`, `lib/auth/verification.test.ts`

- [ ] **Step 1: 실패 테스트**

`lib/auth/verification.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateVerifyToken, isVerifyTokenExpired, VERIFY_TOKEN_TTL_MS } from "./verification";

describe("generateVerifyToken", () => {
  it("비어있지 않은 문자열", () => expect(generateVerifyToken().length).toBeGreaterThan(20));
  it("매번 다름", () => expect(generateVerifyToken()).not.toBe(generateVerifyToken()));
});

describe("isVerifyTokenExpired", () => {
  const now = 1_000_000_000_000;
  it("null은 만료 취급", () => expect(isVerifyTokenExpired(null, now)).toBe(true));
  it("과거 만료", () => expect(isVerifyTokenExpired(new Date(now - 1000), now)).toBe(true));
  it("미래 유효", () => expect(isVerifyTokenExpired(new Date(now + 1000), now)).toBe(false));
});

describe("TTL", () => {
  it("24시간", () => expect(VERIFY_TOKEN_TTL_MS).toBe(24 * 60 * 60 * 1000));
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- auth/verification`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현**

`lib/auth/verification.ts`:

```typescript
import crypto from "crypto";

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function generateVerifyToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export function isVerifyTokenExpired(expires: Date | null, now: number): boolean {
  if (!expires) return true;
  return expires.getTime() <= now;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- auth/verification`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/verification.ts lib/auth/verification.test.ts
git commit -m "feat(hardening): 이메일 인증 토큰 생성·만료 순수로직(TDD)"
```

---

## Task 3: verificationEmail 템플릿 (TDD)

**Files:** Modify `lib/notify/templates.ts`; Create `lib/notify/verification-email.test.ts`

- [ ] **Step 1: 실패 테스트**

`lib/notify/verification-email.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { verificationEmail } from "./templates";

describe("verificationEmail", () => {
  const link = "https://pooggo.example/ko/account/verify?token=abc123";
  it("제목에 브랜드, 본문에 링크 포함", () => {
    const r = verificationEmail(link, "ko");
    expect(r.subject).toContain("PooGGo");
    expect(r.html).toContain(link);
  });
  it("로케일별 제목 다름", () => {
    expect(verificationEmail(link, "en").subject).not.toBe(verificationEmail(link, "ja").subject);
  });
  it("알 수 없는 로케일은 ko 폴백", () => {
    expect(verificationEmail(link, "xx").subject).toBe(verificationEmail(link, "ko").subject);
  });
  it("HTML 이스케이프(주입 방지)", () => {
    const r = verificationEmail("https://x/verify?token=<script>", "ko");
    expect(r.html).not.toContain("<script>");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- verification-email`
Expected: FAIL (verificationEmail 없음).

- [ ] **Step 3: 구현 — templates.ts 끝에 추가**

`lib/notify/templates.ts` 파일 끝에 추가(`esc`는 같은 파일에 이미 존재):

```typescript
const VERIFY_I18N: Record<string, { subject: string; heading: string; body: string; cta: string }> = {
  ko: { subject: "[PooGGo] 이메일 인증", heading: "이메일 인증을 완료해주세요", body: "아래 버튼을 눌러 가입을 완료하세요. 링크는 24시간 후 만료됩니다.", cta: "이메일 인증하기" },
  en: { subject: "[PooGGo] Verify your email", heading: "Verify your email", body: "Click the button below to complete signup. This link expires in 24 hours.", cta: "Verify email" },
  zh: { subject: "[PooGGo] 邮箱验证", heading: "请完成邮箱验证", body: "请点击下方按钮完成注册。链接将在24小时后失效。", cta: "验证邮箱" },
  ja: { subject: "[PooGGo] メール認証", heading: "メール認証を完了してください", body: "下のボタンを押して登録を完了してください。リンクは24時間後に失効します。", cta: "メールを認証する" },
};

export function verificationEmail(link: string, locale: string): { subject: string; html: string } {
  const t = VERIFY_I18N[locale] ?? VERIFY_I18N.ko;
  const safe = esc(link);
  return {
    subject: t.subject,
    html: `<h2>${esc(t.heading)}</h2><p>${esc(t.body)}</p><p><a href="${safe}">${esc(t.cta)}</a></p><p style="color:#888;font-size:12px">${safe}</p>`,
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- verification-email`
Expected: PASS (4 tests).

> 참고: 테스트의 "본문에 링크 포함"은 `&`·`<`가 없는 링크라 `esc` 후에도 그대로 포함된다(통과).

- [ ] **Step 5: Commit**

```bash
git add lib/notify/templates.ts lib/notify/verification-email.test.ts
git commit -m "feat(hardening): 인증 이메일 템플릿(4로케일, 이스케이프, TDD)"
```

---

## Task 4: lib/reviews/report.ts (TDD)

**Files:** Create `lib/reviews/report.ts`, `lib/reviews/report.test.ts`

- [ ] **Step 1: 실패 테스트**

`lib/reviews/report.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { canReport, validateReportReason } from "./report";

describe("canReport", () => {
  it("로그인 환자 가능", () => expect(canReport("PATIENT")).toBe(true));
  it("비로그인 불가", () => expect(canReport(undefined)).toBe(false));
});

describe("validateReportReason", () => {
  it("빈 사유 허용", () => expect(validateReportReason("")).toEqual([]));
  it("정상 사유 허용", () => expect(validateReportReason("효과 과장 후기 같습니다")).toEqual([]));
  it("300자 초과 거부", () => expect(validateReportReason("가".repeat(301)).some((e) => e.includes("reason"))).toBe(true));
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- reviews/report`
Expected: FAIL.

- [ ] **Step 3: 구현**

`lib/reviews/report.ts`:

```typescript
import { hasRole } from "@/lib/auth/roles";

export function canReport(role?: string | null): boolean {
  return hasRole(role, ["PATIENT", "HOSPITAL", "SUPER_ADMIN"]);
}

export function validateReportReason(reason: string): string[] {
  const errors: string[] = [];
  if (reason.length > 300) errors.push("reason: 신고 사유는 300자 이하여야 합니다.");
  return errors;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- reviews/report`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/reviews/report.ts lib/reviews/report.test.ts
git commit -m "feat(hardening): 후기 신고 권한·사유 검증(TDD)"
```

---

## Task 5: i18n 키 (Account verify*, Detail report*) — 4 로케일

**Files:** Modify `messages/{ko,en,zh,ja}.json`

> 각 파일의 `Account` 블록과 `Detail` 블록에 키를 추가한다. 추가 후 JSON 유효성 검증.

- [ ] **Step 1: ko.json**

`Account` 블록 안 `"saving": "처리 중..."` 뒤에 추가(콤마 처리 주의):

```json
    , "verifySentTitle": "인증 메일을 보냈습니다",
    "verifySentBody": "받은 메일의 링크를 눌러 가입을 완료하세요. 링크는 24시간 후 만료됩니다.",
    "resend": "인증 메일 재발송",
    "resendDone": "인증 메일을 다시 보냈습니다.",
    "verifiedBanner": "이메일 인증이 완료되었습니다. 로그인하세요.",
    "verifyExpired": "인증 링크가 만료되었거나 유효하지 않습니다. 인증 메일을 다시 받아주세요."
```

`Detail` 블록 안 `"reviewsLoginRequired"` 뒤에 추가:

```json
    , "reportReview": "신고", "reportReason": "신고 사유 (선택)", "reportSubmit": "신고하기", "reported": "신고되었습니다", "reviewHidden": "숨김 처리됨"
```

- [ ] **Step 2: en.json**

`Account`:
```json
    , "verifySentTitle": "Verification email sent",
    "verifySentBody": "Click the link in the email to complete signup. The link expires in 24 hours.",
    "resend": "Resend verification email",
    "resendDone": "Verification email resent.",
    "verifiedBanner": "Email verified. Please log in.",
    "verifyExpired": "The verification link is invalid or expired. Please request a new email."
```
`Detail`:
```json
    , "reportReview": "Report", "reportReason": "Reason (optional)", "reportSubmit": "Submit report", "reported": "Reported", "reviewHidden": "Hidden"
```

- [ ] **Step 3: zh.json**

`Account`:
```json
    , "verifySentTitle": "验证邮件已发送",
    "verifySentBody": "请点击邮件中的链接完成注册。链接将在24小时后失效。",
    "resend": "重新发送验证邮件",
    "resendDone": "已重新发送验证邮件。",
    "verifiedBanner": "邮箱已验证，请登录。",
    "verifyExpired": "验证链接无效或已过期。请重新获取验证邮件。"
```
`Detail`:
```json
    , "reportReview": "举报", "reportReason": "举报理由（可选）", "reportSubmit": "提交举报", "reported": "已举报", "reviewHidden": "已隐藏"
```

- [ ] **Step 4: ja.json**

`Account`:
```json
    , "verifySentTitle": "確認メールを送信しました",
    "verifySentBody": "メール内のリンクをクリックして登録を完了してください。リンクは24時間後に失効します。",
    "resend": "確認メールを再送",
    "resendDone": "確認メールを再送しました。",
    "verifiedBanner": "メール認証が完了しました。ログインしてください。",
    "verifyExpired": "確認リンクが無効または期限切れです。確認メールを再取得してください。"
```
`Detail`:
```json
    , "reportReview": "通報", "reportReason": "通報理由（任意）", "reportSubmit": "通報する", "reported": "通報しました", "reviewHidden": "非表示"
```

- [ ] **Step 5: 유효성 검증**

Run: `node -e "for(const l of ['ko','en','zh','ja']){const m=JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8'));if(!m.Account.verifySentTitle||!m.Detail.reportReview)throw new Error(l);console.log(l,'OK')}"`
Expected: `ko OK / en OK / zh OK / ja OK`.

- [ ] **Step 6: Commit**

```bash
git add messages/ko.json messages/en.json messages/zh.json messages/ja.json
git commit -m "feat(hardening): i18n 인증/신고 키(4로케일)"
```

---

## Task 6: registerPatient → PENDING + 인증메일 + verify-sent

**Files:** Modify `app/[locale]/account/signup-actions.ts` (전체 교체)

- [ ] **Step 1: 전체 교체**

`app/[locale]/account/signup-actions.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { hashPassword } from "@/lib/auth/password";
import { validatePatientSignup } from "@/lib/auth/patient-registration";
import { generateVerifyToken, VERIFY_TOKEN_TTL_MS } from "@/lib/auth/verification";
import { sendEmail } from "@/lib/notify/email";
import { verificationEmail } from "@/lib/notify/templates";

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

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
  const token = generateVerifyToken();
  const expires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
  try {
    await db.user.create({
      data: {
        email, passwordHash, name: input.name.trim(), role: "PATIENT", status: "PENDING",
        emailVerifyToken: token, emailVerifyExpires: expires,
      },
    });
  } catch (e: any) {
    return { ok: false, errors: ["가입 실패: " + String(e?.message || e)] };
  }

  // 인증 메일 발송(키 미설정 시 콘솔 폴백)
  const link = `${await baseUrl()}/${locale}/account/verify?token=${token}`;
  const mail = verificationEmail(link, locale);
  const sent = await sendEmail({ to: email, subject: mail.subject, html: mail.html });
  if (sent.skipped) console.info(`[verify] 인증 링크(이메일 미발송): ${link}`);

  redirect(`/${locale}/account/verify-sent?email=${encodeURIComponent(email)}`);
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit 2>&1 | grep -E "signup-actions" || echo "OK"`
Expected: `OK`(신규 에러 없음).

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/account/signup-actions.ts"
git commit -m "feat(hardening): 가입을 PENDING+이메일 인증으로 전환(자동로그인 폐지)"
```

---

## Task 7: verify-sent 페이지 + resendVerification

**Files:** Create `app/[locale]/account/verify-actions.ts`, `app/[locale]/account/verify-sent/page.tsx`

- [ ] **Step 1: 재발송 액션**

`app/[locale]/account/verify-actions.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { generateVerifyToken, VERIFY_TOKEN_TTL_MS } from "@/lib/auth/verification";
import { sendEmail } from "@/lib/notify/email";
import { verificationEmail } from "@/lib/notify/templates";

async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function resendVerification(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") || "ko");
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const user = email ? await db.user.findUnique({ where: { email } }) : null;
  // 열거 방지: PENDING 환자에게만 실제 재발송, 그 외엔 무시. 항상 동일 결과로 이동.
  if (user && user.role === "PATIENT" && user.status === "PENDING") {
    const token = generateVerifyToken();
    await db.user.update({ where: { id: user.id }, data: { emailVerifyToken: token, emailVerifyExpires: new Date(Date.now() + VERIFY_TOKEN_TTL_MS) } });
    const link = `${await baseUrl()}/${locale}/account/verify?token=${token}`;
    const mail = verificationEmail(link, locale);
    const sent = await sendEmail({ to: email, subject: mail.subject, html: mail.html });
    if (sent.skipped) console.info(`[verify] 재발송 링크(이메일 미발송): ${link}`);
  }
  redirect(`/${locale}/account/verify-sent?email=${encodeURIComponent(email)}&resent=1`);
}
```

- [ ] **Step 2: 안내 페이지**

`app/[locale]/account/verify-sent/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { resendVerification } from "@/app/[locale]/account/verify-actions";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ email?: string; resent?: string }> };

export default async function VerifySentPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { email, resent } = await searchParams;
  const t = await getTranslations("Account");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-3">{t("verifySentTitle")}</h1>
        <p className="text-gray-500 text-sm mb-2">{t("verifySentBody")}</p>
        {email && <p className="text-gray-700 text-sm font-medium mb-4">{email}</p>}
        {resent && <p className="text-green-600 text-sm mb-4">{t("resendDone")}</p>}
        <form action={resendVerification} className="mt-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="email" value={email ?? ""} />
          <button className="text-sm text-blue-600 hover:underline">{t("resend")}</button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 타입체크**

Run: `npx tsc --noEmit 2>&1 | grep -E "verify-sent|verify-actions" || echo "OK"`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/account/verify-actions.ts" "app/[locale]/account/verify-sent/page.tsx"
git commit -m "feat(hardening): 인증메일 안내 페이지 + 재발송(열거 방지)"
```

---

## Task 8: verify 페이지 (토큰 → ACTIVE)

**Files:** Create `app/[locale]/account/verify/page.tsx`

- [ ] **Step 1: 구현**

`app/[locale]/account/verify/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isVerifyTokenExpired } from "@/lib/auth/verification";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> };

export default async function VerifyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token } = await searchParams;
  const t = await getTranslations("Account");

  const user = token ? await db.user.findFirst({ where: { emailVerifyToken: token } }) : null;

  if (user && !isVerifyTokenExpired(user.emailVerifyExpires, Date.now())) {
    await db.user.update({ where: { id: user.id }, data: { status: "ACTIVE", emailVerifyToken: null, emailVerifyExpires: null } });
    redirect(`/${locale}/account/login?verified=1`);
  }

  // 실패(없음/만료)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <p className="text-red-500 text-sm mb-4">{t("verifyExpired")}</p>
        <Link href="/account/signup" className="text-blue-600 text-sm hover:underline">{t("signupTitle")}</Link>
      </div>
    </div>
  );
}
```

> 참고: 성공 시 `redirect`는 NEXT_REDIRECT를 throw하므로 update 후 즉시 이동한다. user가 ACTIVE로 토큰이 이미 제거된 상태에서 재방문하면 `findFirst(token)`이 null → 만료 안내(정상).

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit 2>&1 | grep -E "account/verify/" || echo "OK"`
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/account/verify/page.tsx"
git commit -m "feat(hardening): 이메일 인증 처리 페이지(토큰→ACTIVE)"
```

---

## Task 9: 로그인 ?verified 배너

**Files:** Modify `app/[locale]/account/login/page.tsx`

- [ ] **Step 1: searchParams 타입 + 배너 추가**

`app/[locale]/account/login/page.tsx`에서 Props의 searchParams 타입과 구조분해, 배너를 수정한다.

`type Props` 의 searchParams를 교체:
```tsx
  searchParams: Promise<{ error?: string; verified?: string }>;
```

`const { error } = await searchParams;` 를 교체:
```tsx
  const { error, verified } = await searchParams;
```

`{error && ...}` 줄 **위**에 배너를 추가:
```tsx
        {verified && <p className="text-green-600 text-sm mb-4 text-center">{t("verifiedBanner")}</p>}
```

- [ ] **Step 2: 빌드 확인(로그인 라우트)**

Run: `npx tsc --noEmit 2>&1 | grep -E "account/login" || echo "OK"`
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/account/login/page.tsx"
git commit -m "feat(hardening): 로그인 인증완료 배너(?verified)"
```

---

## Task 10: reportReview 액션 + getHospitalById isHidden 필터

**Files:** Modify `app/actions.ts`

- [ ] **Step 1: import 추가**

`app/actions.ts` 상단 import 블록에 추가(기존 `canWriteReview`/`validateReviewInput` 줄 옆):

```typescript
import { canReport, validateReportReason } from "@/lib/reviews/report";
```

- [ ] **Step 2: getHospitalById에 isHidden 필터**

`getHospitalById`의 `include`에서 `userReviews` 줄을 교체:

```typescript
        userReviews: { where: { isHidden: false }, orderBy: { createdAt: 'desc' } },
```

- [ ] **Step 3: reportReview 액션 추가**

`app/actions.ts` 끝(addReview 아래)에 추가:

```typescript
// 5. 후기 신고하기 (로그인 필수, 1인 1신고)
export async function reportReview(formData: FormData): Promise<{ ok: boolean; errors: string[] }> {
  const session = await auth();
  if (!canReport(session?.user?.role)) return { ok: false, errors: ["로그인이 필요합니다."] };

  const reviewId = String(formData.get("reviewId") || "");
  const reason = String(formData.get("reason") || "");
  const errors = validateReportReason(reason);
  if (errors.length) return { ok: false, errors };

  const review = await db.review.findUnique({ where: { id: reviewId } });
  if (!review) return { ok: false, errors: ["후기를 찾을 수 없습니다."] };
  if (review.authorUserId === session!.user.id) return { ok: false, errors: ["본인 후기는 신고할 수 없습니다."] };

  try {
    await db.report.create({ data: { reviewId, reporterUserId: session!.user.id, reason: reason.trim() || null } });
  } catch {
    return { ok: false, errors: ["이미 신고한 후기입니다."] };
  }
  return { ok: true, errors: [] };
}
```

- [ ] **Step 4: 타입체크**

Run: `npx tsc --noEmit 2>&1 | grep -E "^app/actions.ts" || echo "OK"`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add app/actions.ts
git commit -m "feat(hardening): 후기 신고 액션 + 공개목록 isHidden 필터"
```

---

## Task 11: ReportButton + 상세 페이지 통합

**Files:** Create `components/hospitals/ReportButton.tsx`; Modify `app/[locale]/hospitals/[id]/page.tsx`

- [ ] **Step 1: ReportButton (client)**

`components/hospitals/ReportButton.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { reportReview } from "@/app/actions";

export default function ReportButton({ reviewId }: { reviewId: string }) {
  const t = useTranslations("Detail");
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("reviewId", reviewId);
    const res = await reportReview(fd);
    if (res.ok) { setDone(true); setOpen(false); }
    else setMsg(res.errors[0] ?? "");
  }

  if (done) return <span className="text-xs text-gray-400">{t("reported")}</span>;
  if (!open) return <button onClick={() => setOpen(true)} className="text-xs text-gray-400 hover:text-red-500">{t("reportReview")}</button>;

  return (
    <form onSubmit={onSubmit} className="mt-2 flex flex-col gap-1">
      <input name="reason" placeholder={t("reportReason")} className="border p-1 rounded text-xs" />
      {msg && <span className="text-xs text-red-500">{msg}</span>}
      <button type="submit" className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded self-start">{t("reportSubmit")}</button>
    </form>
  );
}
```

- [ ] **Step 2: 상세 페이지 import + 후기 항목에 버튼**

`app/[locale]/hospitals/[id]/page.tsx` import 블록에 추가:

```tsx
import ReportButton from "@/components/hospitals/ReportButton";
```

후기 목록 `li`에서 작성자/별점 줄 아래(`<p ... whitespace-pre-line>{rv.content}</p>` 다음)에 본인 후기가 아닐 때만 신고 버튼 추가. 해당 `<li>` 블록을 아래로 교체:

```tsx
                    <li key={rv.id} className="border-b border-gray-50 pb-4 last:border-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{rv.userName}</span>
                        <span className="flex items-center text-yellow-500 text-sm font-bold">
                          <Star className="w-4 h-4 fill-current mr-1" /> {rv.rating}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{rv.content}</p>
                      {rv.authorUserId !== session?.user?.id && <div className="mt-1"><ReportButton reviewId={rv.id} /></div>}
                    </li>
```

- [ ] **Step 3: 빌드**

Run: `npm run build 2>&1 | grep -E "Compiled|Failed|Error" | head -3`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add "components/hospitals/ReportButton.tsx" "app/[locale]/hospitals/[id]/page.tsx"
git commit -m "feat(hardening): 후기 신고 버튼(본인 제외)"
```

---

## Task 12: 계정 내후기 숨김 라벨

**Files:** Modify `app/[locale]/account/(protected)/page.tsx`

- [ ] **Step 1: 숨김 라벨 추가**

`app/[locale]/account/(protected)/page.tsx`에서 `getTranslations("Account")`는 이미 `t`로 있다. 후기 `li`의 병원명 span 옆에 숨김 뱃지를 추가. 후기 목록 `li` 내부의 병원명 줄을 교체:

```tsx
                  <span className="font-medium text-gray-800">
                    {resolveText(r.hospital.name, locale)}
                    {r.isHidden && <span className="ml-2 text-xs text-red-500">({t("reviewHidden") || "숨김"})</span>}
                  </span>
```

> 참고: `t("reviewHidden")`는 Account 네임스페이스에 없으므로 Detail에서 가져온다. 페이지 상단에 `const tDetail = await getTranslations("Detail");` 를 추가하고 위 `t("reviewHidden")`를 `tDetail("reviewHidden")`로 사용한다.

수정 반영:
- `const t = await getTranslations("Account");` 아래에 추가: `const tDetail = await getTranslations("Detail");`
- 라벨: `{r.isHidden && <span className="ml-2 text-xs text-red-500">({tDetail("reviewHidden")})</span>}`

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit 2>&1 | grep -E "account/\(protected\)/page" || echo "OK"`
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/account/(protected)/page.tsx"
git commit -m "feat(hardening): 내 후기에 숨김 처리 라벨"
```

---

## Task 13: 관리자 후기 모더레이션 (/admin/reviews + 액션 + nav + 대시보드)

**Files:** Create `app/admin/review-actions.ts`, `app/admin/(protected)/reviews/page.tsx`; Modify `app/admin/(protected)/layout.tsx`, `app/admin/(protected)/page.tsx`

- [ ] **Step 1: 모더레이션 액션**

`app/admin/review-actions.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guard";

export async function hideReview(id: string): Promise<void> {
  await requireRole(["SUPER_ADMIN"]);
  await db.review.update({ where: { id }, data: { isHidden: true } });
  revalidatePath("/admin/reviews");
}

export async function unhideReview(id: string): Promise<void> {
  await requireRole(["SUPER_ADMIN"]);
  await db.review.update({ where: { id }, data: { isHidden: false } });
  revalidatePath("/admin/reviews");
}

export async function deleteReview(id: string): Promise<void> {
  await requireRole(["SUPER_ADMIN"]);
  await db.review.delete({ where: { id } }); // Report는 Cascade 삭제
  revalidatePath("/admin/reviews");
}
```

- [ ] **Step 2: 관리자 후기 페이지**

`app/admin/(protected)/reviews/page.tsx`:

```tsx
import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { hideReview, unhideReview, deleteReview } from "@/app/admin/review-actions";

export default async function AdminReviewsPage() {
  const reviews = await db.review.findMany({
    include: { hospital: true, _count: { select: { reports: true } } },
    orderBy: [{ reports: { _count: "desc" } }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">후기 관리</h1>
      <p className="text-sm text-gray-500 mb-6">신고가 많은 순으로 표시됩니다. 숨김은 공개·내 후기에서 제외되며 데이터는 보존됩니다.</p>
      <div className="space-y-3">
        {reviews.length === 0 && <p className="text-gray-400">후기가 없습니다.</p>}
        {reviews.map((r) => (
          <div key={r.id} className={`bg-white border rounded-xl p-4 ${r.isHidden ? "opacity-60" : ""}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-sm">
                  {resolveText(r.hospital.name, "ko")} · ★{r.rating} · <span className="text-gray-400">{r.userName}</span>
                  {r._count.reports > 0 && <span className="ml-2 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full">신고 {r._count.reports}</span>}
                  {r.isHidden && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">숨김</span>}
                </div>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">{r.content}</p>
                <div className="text-xs text-gray-400 mt-1">{new Date(r.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {r.isHidden ? (
                  <form action={unhideReview.bind(null, r.id)}><button className="text-xs bg-gray-100 px-3 py-1 rounded">숨김해제</button></form>
                ) : (
                  <form action={hideReview.bind(null, r.id)}><button className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded">숨김</button></form>
                )}
                <form action={deleteReview.bind(null, r.id)}><button className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded">삭제</button></form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: nav 링크 추가**

`app/admin/(protected)/layout.tsx`의 nav에서 계정승인 Link 뒤에 추가:

```tsx
          <Link href="/admin/reviews" className="hover:text-blue-600">후기관리</Link>
```

- [ ] **Step 4: 대시보드 신고 카운트**

`app/admin/(protected)/page.tsx`의 `Promise.all` 배열 끝에 추가(`pendingAccounts` 뒤, 콤마 주의):

```typescript
    db.review.count({ where: { isHidden: false, reports: { some: {} } } }),
```

구조분해를 교체:
```typescript
  const [hospitals, published, consultations, newBookings, pendingAccounts, reportedReviews] = await Promise.all([
```

`cards` 배열 끝에 추가:
```typescript
    { label: "신고된 후기", value: reportedReviews, href: "/admin/reviews" },
```

- [ ] **Step 5: 빌드**

Run: `npm run build 2>&1 | grep -E "Compiled|Failed|Error|admin/reviews" | head -5`
Expected: `✓ Compiled successfully` + `/admin/reviews` 라우트.

- [ ] **Step 6: Commit**

```bash
git add "app/admin/review-actions.ts" "app/admin/(protected)/reviews/page.tsx" "app/admin/(protected)/layout.tsx" "app/admin/(protected)/page.tsx"
git commit -m "feat(hardening): 관리자 후기 모더레이션(숨김/삭제) + 대시보드 신고 카운트"
```

---

## Task 14: 전체 검증 + 컴플라이언스 + 메모리

**Files:** (검증·문서)

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 139(5C) + 신규 15(verification 6, verification-email 4, report 5) = **154 통과**.

- [ ] **Step 2: 전체 빌드**

Run: `npm run build`
Expected: 성공. 신규 라우트 `/[locale]/account/verify`, `/verify-sent`, `/admin/reviews`.

- [ ] **Step 3: 수동 UAT(사람, `npm run dev`)**

Resend 키 없으면 **서버 콘솔의 `[verify] 인증 링크`** 로 인증 진행:
- [ ] 가입 → `/account/verify-sent` 도착, **로그인 시도 실패**(PENDING).
- [ ] 콘솔/메일 링크 → `/account/verify` → `/account/login?verified=1`(인증완료 배너) → 로그인 성공.
- [ ] verify-sent에서 재발송 → resendDone 안내.
- [ ] 만료/잘못된 토큰 → verifyExpired 안내.
- [ ] 로그인 후 타인 후기 "신고" → 신고됨. 재신고 → "이미 신고". 본인 후기엔 신고 버튼 없음.
- [ ] `/admin/reviews`에서 숨김 → 공개 상세·내후기(라벨)에서 제외. 숨김해제·삭제 동작.
- [ ] 대시보드 "신고된 후기" 카운트 표시.

- [ ] **Step 4: 의료광고법 게이트**

`medical_compliance_checker`로 신규 문구(인증 안내·신고 UI·이메일 템플릿 4로케일) 점검: 효과보장·유인 표현 없음, 공개 후기 시간순 중립(큐레이션 없음) 확인. 자문서 §8 권고 일치 확인.

- [ ] **Step 5: 메모리 업데이트**

`phase5-auth-progress.md`에 5C 강화(②③) 완료 기록, `phase4-compliance-followups.md` #1 보강(사후 모더레이션), 배포 env(RESEND_API_KEY/RESEND_FROM) 명시.

---

## Self-Review (작성자 점검)

**1. 스펙 커버리지:** 스펙 §2 스키마→T1, §3 인증(순수 T2·템플릿 T3·가입 T6·안내 T7·인증 T8·배너 T9)→완비, §4 모더레이션(순수 T4·액션 T10·버튼 T11·내후기 T12·관리자 T13)→완비, §5 i18n→T5, §7 성공기준→T14. 관리자 큐 스코핑은 기존 코드가 이미 충족(보정 불요).

**2. 플레이스홀더:** 없음. 모든 코드 스텝 완전.

**3. 타입/시그니처 일관성:**
- `generateVerifyToken()`/`isVerifyTokenExpired(Date|null, number)`/`VERIFY_TOKEN_TTL_MS` — T2 정의 = T6·T7·T8 사용 일치.
- `verificationEmail(link, locale)` — T3 정의 = T6·T7 사용 일치.
- `canReport(role?)`/`validateReportReason(string)` — T4 정의 = T10 사용 일치.
- `reportReview(FormData)` — T10 정의 = T11 사용 일치.
- `hideReview/unhideReview/deleteReview(id)` — T13 내부 일치.
- i18n 키(Account.verify*/resend*/verifiedBanner, Detail.report*/reviewHidden) — T5 추가 = T7·T8·T9·T11·T12 사용 일치.

**주의 가정(붕괴 조건):**
- `headers()`로 baseUrl 구성: 프록시 환경에서 `x-forwarded-proto` 누락 시 https 폴백(비localhost). Vercel은 정상 제공.
- `orderBy: { reports: { _count: "desc" } }` Prisma 지원 가정 — 미지원 버전이면 T13에서 애플리케이션 정렬로 대체.
- Resend 키 미설정 시 인증메일 미발송 → 가입자가 PENDING에 묶임. dev는 콘솔 링크로 우회. **운영은 RESEND_API_KEY/RESEND_FROM 필수**(T14 §5·배포).
