# Phase 6b — 통합 스탬프(이용쿠폰) 서비스 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **선행 의존:** Phase 6a(디자인 리뉴얼) 완료 — `components/ui/*` 프리미티브와 `SiteHeader`/`StampChip`가 존재해야 한다.

**Goal:** 외국인환자 대상 통합 스탬프 통장(잔액=원장 합계)을 추가한다. 환자가 스탬프를 모아 10개에 도달하면 베네핏 병원을 선택해 무료시술 교환을 신청하고, 관리자가 승인/완료/거절(거절·취소 시 자동 환급)한다. 적립은 1차에 관리자 수동 + 예약완료 수동 지급(placeholder).

**Architecture:** 단일 통합 통장은 `StampEvent` 원장(잔액=`sum(delta)`)으로 모델링하고, 교환은 `Redemption`(상태머신 REQUESTED→APPROVED→FULFILLED / REJECTED|CANCELLED)으로 처리한다. 순수 로직(`lib/stamps/balance.ts`·`redemption.ts`)은 TDD로 검증하고, DB 트랜잭션 헬퍼(`lib/stamps/index.ts`)가 신청·차감·환급의 원자성을 보장한다. UI는 6a 프리미티브로 공개/관리자/병원 포털에 얹는다.

**Tech Stack:** Prisma(PostgreSQL/Vercel) · Next.js 16 server actions · next-auth v5 가드 · next-intl · vitest.

**검증 방식:** `lib/stamps`의 순수 함수는 vitest TDD(빨강→초록). DB 헬퍼·페이지·액션은 `npm run build`(타입) + Task 14 수동 E2E. 매 Task 끝에 커밋.

---

## File Structure

**신규 (Create):**
- `lib/stamps/config.ts` — 상수(목표/비용/사유/상태)
- `lib/stamps/balance.ts` (+ `balance.test.ts`) — 잔액/진행률 순수 함수
- `lib/stamps/redemption.ts` (+ `redemption.test.ts`) — 상태머신/검증/코드생성 순수 함수
- `lib/stamps/index.ts` — DB 헬퍼(getBalance/getHistory/grantStamps/requestRedemption/cancelRedemption/processRedemption)
- `app/[locale]/account/(protected)/stamps/page.tsx` — 환자 스탬프 통장 페이지
- `app/[locale]/account/(protected)/stamps/actions.ts` — 환자 액션(교환신청/취소)
- `components/stamps/StampCard.tsx` — 10칸 스탬프 카드 시각(프레젠테이션)
- `components/stamps/RedeemForm.tsx` — 교환 신청 폼(client)
- `components/stamps/CancelRedemptionButton.tsx` — 취소 버튼(client)
- `app/admin/(protected)/stamps/page.tsx` — 관리자 발급/조회
- `app/admin/(protected)/redemptions/page.tsx` — 관리자 교환 처리
- `app/admin/stamp-actions.ts` — 관리자 액션(발급/교환처리)
- `app/hospital/(protected)/redemptions/page.tsx` — 병원 교환 조회(읽기)

**수정 (Modify):**
- `prisma/schema.prisma` — `StampEvent`·`Redemption` 모델 + User/Hospital 관계
- `app/[locale]/layout.tsx` — `auth()`+`getBalance()`로 `SiteHeader stampBalance` 주입
- `app/[locale]/account/(protected)/page.tsx` — 스탬프 요약 카드 추가
- `app/[locale]/page.tsx` — 스탬프 프로그램 소개 섹션 추가
- `app/[locale]/hospitals/[id]/page.tsx` — BENEFIT 병원에 교환 가능 배지
- `app/admin/(protected)/layout.tsx` — nav에 Stamps/Redemptions
- `app/admin/(protected)/page.tsx` — 대기 교환(REQUESTED) 카운트 카드
- `app/hospital/(protected)/layout.tsx` — nav에 Redemptions
- `app/admin/hospital-actions.ts` — `deleteHospital`에 진행중 Redemption 가드
- `messages/{ko,en,zh,ja}.json` — `Stamps` 네임스페이스 + `Home` 소개 키

---

## Task 1: Prisma 스키마 + 마이그레이션

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: User/Hospital 관계 + 신규 모델 추가**

`prisma/schema.prisma` — `User` 모델 relation 목록에 추가:
```prisma
  stampEvents   StampEvent[]
  redemptions   Redemption[]
```
`Hospital` 모델 relation 목록에 추가:
```prisma
  redemptions Redemption[]
```
파일 끝에 신규 모델 추가:
```prisma
// 스탬프 원장 — 통합 1통장: 잔액 = sum(delta)
model StampEvent {
  id           String      @id @default(uuid())
  userId       String
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  delta        Int         // +1 적립 / -10 교환차감 / +10 환급 / ± 보정
  reason       String      // EARN_BOOKING | EARN_REVIEW | ADMIN_GRANT | REDEEM | REFUND | ADJUST
  sourceType   String?
  sourceId     String?
  note         String?
  adminId      String?
  redemptionId String?
  redemption   Redemption? @relation(fields: [redemptionId], references: [id], onDelete: SetNull)
  createdAt    DateTime    @default(now())

  @@index([userId])
  @@index([reason])
}

// 무료시술 교환 신청
model Redemption {
  id                 String       @id @default(uuid())
  code               String       @unique
  userId             String
  user               User         @relation(fields: [userId], references: [id])
  hospitalId         String
  hospital           Hospital     @relation(fields: [hospitalId], references: [id])
  stampCost          Int          @default(10)
  status             String       @default("REQUESTED")
  note               String?
  adminNote          String?
  events             StampEvent[]
  processedByAdminId String?
  processedAt        DateTime?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  @@index([userId])
  @@index([hospitalId])
  @@index([status])
}
```

- [ ] **Step 2: 마이그레이션 생성 + 클라이언트 재생성**

Run: `npx prisma migrate dev --name phase6_stamps`
Expected: 새 마이그레이션 생성 + `prisma generate` 자동 실행. (`.env`의 `POSTGRES_PRISMA_URL`/`POSTGRES_URL_NON_POOLING` 연결 필요. 연결 불가 시 `npx prisma migrate diff`로 SQL만 검토 후 배포 환경에서 적용.)

- [ ] **Step 3: 빌드 검증 + Commit**

Run: `npm run build` → PASS (Prisma 타입 인식).
```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(stamps): StampEvent/Redemption 스키마 + 마이그레이션"
```

---

## Task 2: 설정 상수

**Files:**
- Create: `lib/stamps/config.ts`

- [ ] **Step 1: 상수 정의**

Create `lib/stamps/config.ts`:
```ts
// ⚠️ 금액·규칙은 추후 확정 — 본 상수는 1차 골격용 기본값.
export const STAMP_GOAL = 10;
export const REDEEM_COST = 10;
export const DEFAULT_BOOKING_STAMPS = 1; // 예약완료 수동 지급 기본값(placeholder)

export const STAMP_REASONS = [
  "EARN_BOOKING",
  "EARN_REVIEW",
  "ADMIN_GRANT",
  "REDEEM",
  "REFUND",
  "ADJUST",
] as const;
export type StampReason = (typeof STAMP_REASONS)[number];

export const REDEMPTION_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "FULFILLED",
  "REJECTED",
  "CANCELLED",
] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];
```

- [ ] **Step 2: Commit**
```bash
git add lib/stamps/config.ts
git commit -m "feat(stamps): config 상수(목표/비용/사유/상태)"
```

---

## Task 3: 잔액/진행률 순수 함수 (TDD)

**Files:**
- Create: `lib/stamps/balance.ts`, `lib/stamps/balance.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `lib/stamps/balance.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeBalance, progress } from "./balance";

describe("computeBalance", () => {
  it("sums deltas including refunds and adjustments", () => {
    expect(computeBalance([{ delta: 1 }, { delta: 1 }, { delta: -10 }, { delta: 10 }])).toBe(2);
  });
  it("returns 0 for empty ledger", () => {
    expect(computeBalance([])).toBe(0);
  });
});

describe("progress", () => {
  it("caps count at goal and computes remaining", () => {
    expect(progress(7)).toEqual({ count: 7, goal: 10, remaining: 3, complete: false });
  });
  it("marks complete at or above goal", () => {
    expect(progress(10)).toEqual({ count: 10, goal: 10, remaining: 0, complete: true });
    expect(progress(13)).toEqual({ count: 10, goal: 10, remaining: 0, complete: true });
  });
  it("never returns negative remaining or count", () => {
    expect(progress(-5)).toEqual({ count: 0, goal: 10, remaining: 10, complete: false });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/stamps/balance.test.ts`
Expected: FAIL ("computeBalance is not a function" 또는 모듈 없음).

- [ ] **Step 3: 구현**

Create `lib/stamps/balance.ts`:
```ts
import { STAMP_GOAL } from "./config";

export function computeBalance(events: { delta: number }[]): number {
  return events.reduce((sum, e) => sum + e.delta, 0);
}

export function progress(balance: number, goal: number = STAMP_GOAL) {
  const count = Math.max(0, Math.min(balance, goal));
  return {
    count,
    goal,
    remaining: Math.max(0, goal - balance),
    complete: balance >= goal,
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run lib/stamps/balance.test.ts`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**
```bash
git add lib/stamps/balance.ts lib/stamps/balance.test.ts
git commit -m "feat(stamps): 잔액/진행률 순수 함수 + 테스트"
```

---

## Task 4: 교환 상태머신/검증/코드생성 (TDD)

**Files:**
- Create: `lib/stamps/redemption.ts`, `lib/stamps/redemption.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `lib/stamps/redemption.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { canRedeem, nextRedemptionStatus, isRefundExit, generateRedemptionCode } from "./redemption";

describe("canRedeem", () => {
  it("requires balance >= cost", () => {
    expect(canRedeem(10)).toBe(true);
    expect(canRedeem(9)).toBe(false);
  });
});

describe("nextRedemptionStatus", () => {
  it("allows valid transitions", () => {
    expect(nextRedemptionStatus("REQUESTED", "approve")).toBe("APPROVED");
    expect(nextRedemptionStatus("APPROVED", "fulfill")).toBe("FULFILLED");
    expect(nextRedemptionStatus("REQUESTED", "cancel")).toBe("CANCELLED");
    expect(nextRedemptionStatus("APPROVED", "reject")).toBe("REJECTED");
  });
  it("rejects invalid transitions", () => {
    expect(nextRedemptionStatus("REQUESTED", "fulfill")).toBeNull();
    expect(nextRedemptionStatus("FULFILLED", "approve")).toBeNull();
    expect(nextRedemptionStatus("CANCELLED", "approve")).toBeNull();
  });
});

describe("isRefundExit", () => {
  it("refunds on reject/cancel only", () => {
    expect(isRefundExit("REJECTED")).toBe(true);
    expect(isRefundExit("CANCELLED")).toBe(true);
    expect(isRefundExit("FULFILLED")).toBe(false);
    expect(isRefundExit("APPROVED")).toBe(false);
  });
});

describe("generateRedemptionCode", () => {
  it("produces PGS- prefixed 6-char codes without ambiguous chars", () => {
    expect(generateRedemptionCode()).toMatch(/^PGS-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/stamps/redemption.test.ts`
Expected: FAIL (모듈 없음).

- [ ] **Step 3: 구현**

Create `lib/stamps/redemption.ts`:
```ts
import crypto from "crypto";
import { REDEEM_COST, type RedemptionStatus } from "./config";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 혼동 문자 제외

export function generateRedemptionCode(): string {
  const bytes = crypto.randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `PGS-${s}`;
}

export function canRedeem(balance: number, cost: number = REDEEM_COST): boolean {
  return balance >= cost;
}

export type RedemptionAction = "approve" | "reject" | "fulfill" | "cancel";

const NEXT: Record<string, Partial<Record<RedemptionAction, RedemptionStatus>>> = {
  REQUESTED: { approve: "APPROVED", reject: "REJECTED", cancel: "CANCELLED" },
  APPROVED: { fulfill: "FULFILLED", reject: "REJECTED", cancel: "CANCELLED" },
  FULFILLED: {},
  REJECTED: {},
  CANCELLED: {},
};

export function nextRedemptionStatus(from: string, action: RedemptionAction): RedemptionStatus | null {
  return NEXT[from]?.[action] ?? null;
}

// 종단 진입 시 차감했던 스탬프를 환급해야 하는 상태
export function isRefundExit(status: string): boolean {
  return status === "REJECTED" || status === "CANCELLED";
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run lib/stamps/redemption.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/stamps/redemption.ts lib/stamps/redemption.test.ts
git commit -m "feat(stamps): 교환 상태머신/검증/코드생성 + 테스트"
```

---

## Task 5: DB 헬퍼 (트랜잭션)

**Files:**
- Create: `lib/stamps/index.ts`

- [ ] **Step 1: 헬퍼 구현**

Create `lib/stamps/index.ts`:
```ts
import { db } from "@/lib/db";
import { REDEEM_COST } from "./config";
import { generateRedemptionCode, isRefundExit, nextRedemptionStatus, type RedemptionAction } from "./redemption";

export { STAMP_GOAL, REDEEM_COST } from "./config";

export async function getBalance(userId: string): Promise<number> {
  const r = await db.stampEvent.aggregate({ _sum: { delta: true }, where: { userId } });
  return r._sum.delta ?? 0;
}

export function getHistory(userId: string) {
  return db.stampEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function grantStamps(params: {
  userId: string;
  delta: number;
  reason: string;
  sourceType?: string;
  sourceId?: string;
  adminId?: string;
  note?: string;
}): Promise<void> {
  await db.stampEvent.create({
    data: {
      userId: params.userId,
      delta: params.delta,
      reason: params.reason,
      sourceType: params.sourceType ?? null,
      sourceId: params.sourceId ?? null,
      adminId: params.adminId ?? null,
      note: params.note ?? null,
    },
  });
}

// 교환 신청: 병원 적격성 + 잔액 검증 → Redemption 생성 + REDEEM 차감(원자)
export async function requestRedemption(params: { userId: string; hospitalId: string; note?: string }) {
  return db.$transaction(async (tx) => {
    const hospital = await tx.hospital.findUnique({ where: { id: params.hospitalId } });
    if (!hospital || hospital.tier !== "BENEFIT" || !hospital.isPublished) {
      throw new Error("INELIGIBLE_HOSPITAL");
    }
    const agg = await tx.stampEvent.aggregate({ _sum: { delta: true }, where: { userId: params.userId } });
    const balance = agg._sum.delta ?? 0;
    if (balance < REDEEM_COST) throw new Error("INSUFFICIENT_BALANCE");

    const redemption = await tx.redemption.create({
      data: {
        code: generateRedemptionCode(),
        userId: params.userId,
        hospitalId: params.hospitalId,
        stampCost: REDEEM_COST,
        status: "REQUESTED",
        note: params.note?.slice(0, 500) ?? null,
      },
    });
    await tx.stampEvent.create({
      data: {
        userId: params.userId,
        delta: -REDEEM_COST,
        reason: "REDEEM",
        sourceType: "Redemption",
        sourceId: redemption.id,
        redemptionId: redemption.id,
      },
    });
    return redemption;
  });
}

// 사용자 취소: REQUESTED/APPROVED → CANCELLED + 환급
export async function cancelRedemption(params: { id: string; userId: string }) {
  return db.$transaction(async (tx) => {
    const r = await tx.redemption.findUnique({ where: { id: params.id } });
    if (!r || r.userId !== params.userId) throw new Error("NOT_FOUND");
    const to = nextRedemptionStatus(r.status, "cancel");
    if (!to) throw new Error("INVALID_TRANSITION");
    await tx.redemption.update({ where: { id: r.id }, data: { status: to } });
    await tx.stampEvent.create({
      data: {
        userId: r.userId,
        delta: r.stampCost,
        reason: "REFUND",
        sourceType: "Redemption",
        sourceId: r.id,
        redemptionId: r.id,
      },
    });
    return to;
  });
}

// 관리자 처리: approve/reject/fulfill. 환급 종단이면 REFUND 이벤트.
export async function processRedemption(params: { id: string; action: RedemptionAction; adminId: string }) {
  return db.$transaction(async (tx) => {
    const r = await tx.redemption.findUnique({ where: { id: params.id } });
    if (!r) throw new Error("NOT_FOUND");
    const to = nextRedemptionStatus(r.status, params.action);
    if (!to) throw new Error("INVALID_TRANSITION");
    await tx.redemption.update({
      where: { id: r.id },
      data: { status: to, processedByAdminId: params.adminId, processedAt: new Date() },
    });
    if (isRefundExit(to)) {
      await tx.stampEvent.create({
        data: {
          userId: r.userId,
          delta: r.stampCost,
          reason: "REFUND",
          sourceType: "Redemption",
          sourceId: r.id,
          redemptionId: r.id,
          adminId: params.adminId,
        },
      });
    }
    return to;
  });
}
```

- [ ] **Step 2: 빌드 검증 + Commit**

Run: `npm run build` → PASS.
```bash
git add lib/stamps/index.ts
git commit -m "feat(stamps): DB 트랜잭션 헬퍼(잔액/적립/신청/취소/처리)"
```

---

## Task 6: 환자 스탬프 페이지 + 액션

**Files:**
- Create: `app/[locale]/account/(protected)/stamps/actions.ts`, `stamps/page.tsx`, `components/stamps/StampCard.tsx`, `components/stamps/RedeemForm.tsx`, `components/stamps/CancelRedemptionButton.tsx`

- [ ] **Step 1: 환자 액션**

Create `app/[locale]/account/(protected)/stamps/actions.ts`:
```ts
"use server";

import { requirePatient } from "@/lib/auth/guard";
import { requestRedemption, cancelRedemption } from "@/lib/stamps";
import { getLocale, getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";

export async function requestRedemptionAction(formData: FormData): Promise<{ ok: boolean; errors: string[] }> {
  const session = await requirePatient();
  const t = await getTranslations("Stamps");
  const hospitalId = String(formData.get("hospitalId") ?? "");
  const note = String(formData.get("note") ?? "");
  if (!hospitalId) return { ok: false, errors: [t("errSelectHospital")] };
  try {
    await requestRedemption({ userId: session.user.id, hospitalId, note });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    const map: Record<string, string> = {
      INELIGIBLE_HOSPITAL: t("errIneligible"),
      INSUFFICIENT_BALANCE: t("errInsufficient"),
    };
    return { ok: false, errors: [map[msg] ?? t("errGeneric")] };
  }
  const locale = await getLocale();
  revalidatePath(`/${locale}/account/stamps`);
  return { ok: true, errors: [] };
}

export async function cancelRedemptionAction(id: string): Promise<{ ok: boolean; errors: string[] }> {
  const session = await requirePatient();
  const t = await getTranslations("Stamps");
  try {
    await cancelRedemption({ id, userId: session.user.id });
  } catch {
    return { ok: false, errors: [t("errCancel")] };
  }
  const locale = await getLocale();
  revalidatePath(`/${locale}/account/stamps`);
  return { ok: true, errors: [] };
}
```

- [ ] **Step 2: StampCard (10칸 시각)**

Create `components/stamps/StampCard.tsx`:
```tsx
import { Ticket } from "lucide-react";

export function StampCard({ balance, goal }: { balance: number; goal: number }) {
  const filled = Math.max(0, Math.min(balance, goal));
  return (
    <div className="grid grid-cols-5 gap-3">
      {Array.from({ length: goal }).map((_, i) => {
        const on = i < filled;
        return (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-xl border ${
              on
                ? "border-gold-500 bg-gold-500/15 text-gold-600"
                : "border-dashed border-stone-300 bg-cream text-stone-300"
            }`}
          >
            {on ? <Ticket className="h-6 w-6" /> : <span className="text-sm font-bold">{i + 1}</span>}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: RedeemForm (client)**

Create `components/stamps/RedeemForm.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { requestRedemptionAction } from "@/app/[locale]/account/(protected)/stamps/actions";

type Hospital = { id: string; name: string };

export function RedeemForm({
  hospitals,
  labels,
}: {
  hospitals: Hospital[];
  labels: {
    selectHospital: string;
    note: string;
    notePlaceholder: string;
    submit: string;
    cautionsTitle: string;
    cautions: string;
    consent: string;
  };
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    start(async () => {
      const res = await requestRedemptionAction(formData);
      if (res.ok) {
        setErrors([]);
        router.refresh();
      } else {
        setErrors(res.errors);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <Field label={labels.selectHospital} htmlFor="hospitalId" required>
        <select id="hospitalId" name="hospitalId" className={inputClass} required>
          <option value="">—</option>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={labels.note} htmlFor="note">
        <textarea id="note" name="note" rows={3} className={inputClass} placeholder={labels.notePlaceholder} />
      </Field>

      <div className="rounded-lg border border-clay-600/30 bg-clay-600/10 p-4 text-sm text-clay-700">
        <p className="font-bold">{labels.cautionsTitle}</p>
        <p className="mt-1 whitespace-pre-line">{labels.cautions}</p>
      </div>

      <label className="flex items-center gap-2 text-sm text-navy-900">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        {labels.consent}
      </label>

      {errors.length > 0 && (
        <ul className="rounded-lg border border-clay-600/30 bg-clay-600/10 p-3 text-sm text-clay-700">
          {errors.map((e, i) => (
            <li key={i}>• {e}</li>
          ))}
        </ul>
      )}

      <Button type="submit" disabled={!consent || pending}>
        {labels.submit}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: CancelRedemptionButton (client)**

Create `components/stamps/CancelRedemptionButton.tsx`:
```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { cancelRedemptionAction } from "@/app/[locale]/account/(protected)/stamps/actions";

export function CancelRedemptionButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => {
        await cancelRedemptionAction(id);
        router.refresh();
      })}
    >
      {label}
    </Button>
  );
}
```

- [ ] **Step 5: 환자 스탬프 페이지**

Create `app/[locale]/account/(protected)/stamps/page.tsx`:
```tsx
import { requirePatient } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { getBalance, getHistory } from "@/lib/stamps";
import { progress } from "@/lib/stamps/balance";
import { STAMP_GOAL } from "@/lib/stamps/config";
import { resolveText } from "@/lib/i18n/text";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StampCard } from "@/components/stamps/StampCard";
import { RedeemForm } from "@/components/stamps/RedeemForm";
import { CancelRedemptionButton } from "@/components/stamps/CancelRedemptionButton";

type Props = { params: Promise<{ locale: string }> };

const STATUS_TONE: Record<string, "gold" | "teal" | "stone" | "clay"> = {
  REQUESTED: "gold",
  APPROVED: "teal",
  FULFILLED: "teal",
  REJECTED: "clay",
  CANCELLED: "stone",
};

export default async function StampsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePatient();
  const t = await getTranslations("Stamps");

  const [balance, history, benefitHospitals, redemptions] = await Promise.all([
    getBalance(session.user.id),
    getHistory(session.user.id),
    db.hospital.findMany({ where: { tier: "BENEFIT", isPublished: true }, select: { id: true, name: true } }),
    db.redemption.findMany({
      where: { userId: session.user.id },
      include: { hospital: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const p = progress(balance, STAMP_GOAL);
  const hospitals = benefitHospitals.map((h) => ({ id: h.id, name: resolveText(h.name, locale as never) }));

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="font-serif text-2xl font-bold text-navy-900">{t("title")}</h1>
        <p className="mt-1 text-sm text-stone-500">{t("subtitle")}</p>
        <p className="mt-2 text-xs text-stone-400">{t("foreignNotice")}</p>

        <div className="mt-6">
          <StampCard balance={balance} goal={STAMP_GOAL} />
          <p className="mt-4 text-sm text-navy-900">
            {p.complete ? t("readyToRedeem") : t("remaining", { n: p.remaining })}
          </p>
        </div>
      </Card>

      {/* 교환 신청 */}
      {p.complete && hospitals.length > 0 && (
        <Card className="p-6">
          <h2 className="mb-4 font-bold text-navy-900">{t("redeemTitle")}</h2>
          <RedeemForm
            hospitals={hospitals}
            labels={{
              selectHospital: t("selectHospital"),
              note: t("note"),
              notePlaceholder: t("notePlaceholder"),
              submit: t("submitRedeem"),
              cautionsTitle: t("cautionsTitle"),
              cautions: t("cautions"),
              consent: t("consent"),
            }}
          />
        </Card>
      )}

      {/* 내 교환 내역 */}
      <Card className="p-6">
        <h2 className="mb-4 font-bold text-navy-900">{t("myRedemptions")}</h2>
        {redemptions.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-400">{t("noRedemptions")}</p>
        ) : (
          <ul className="space-y-3">
            {redemptions.map((r) => (
              <li key={r.id} className="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0">
                <div>
                  <div className="font-medium text-navy-900">{resolveText(r.hospital.name, locale as never)}</div>
                  <div className="text-xs text-stone-500">
                    {t("code")}: <span className="font-mono">{r.code}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={STATUS_TONE[r.status] ?? "stone"}>{t(`status_${r.status}`)}</Badge>
                  {(r.status === "REQUESTED" || r.status === "APPROVED") && (
                    <CancelRedemptionButton id={r.id} label={t("cancel")} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 적립 내역(원장) */}
      <Card className="p-6">
        <h2 className="mb-4 font-bold text-navy-900">{t("ledger")}</h2>
        {history.length === 0 ? (
          <p className="py-4 text-center text-sm text-stone-400">{t("noLedger")}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {history.map((e) => (
              <li key={e.id} className="flex items-center justify-between">
                <span className="text-stone-600">{t(`reason_${e.reason}`)}</span>
                <span className={e.delta >= 0 ? "font-bold text-teal-700" : "font-bold text-clay-700"}>
                  {e.delta >= 0 ? `+${e.delta}` : e.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
```
> `resolveText`의 두번째 인자 타입은 `Lang`이다. `locale as never`는 타입 우회용 — 실제로는 `locale`이 ko/en/zh/ja 중 하나임이 보장된다(레이아웃 검증). 엄밀히 하려면 `locale as import("@/lib/i18n/types").Lang`로 캐스팅.

- [ ] **Step 6: i18n 키는 Task 13에서 추가** — 이 시점에 키가 없으면 `t()`가 키 문자열을 그대로 출력(빌드는 통과). 빌드만 확인.

Run: `npm run build` → PASS.

- [ ] **Step 7: Commit**
```bash
git add app/[locale]/account/(protected)/stamps components/stamps
git commit -m "feat(stamps): 환자 스탬프 페이지 + 교환 신청/취소 액션"
```

---

## Task 7: SiteHeader 스탬프 칩 실주입

**Files:**
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 1: 레이아웃에서 잔액 계산 후 주입**

Modify `app/[locale]/layout.tsx` — `SiteHeader`에 `stampBalance` 전달:
```tsx
import { auth } from "@/auth";
import { getBalance } from "@/lib/stamps";
// ...기존 import 유지...

export default async function LocaleLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await auth();
  let stampBalance: number | null = null;
  if (session?.user?.role === "PATIENT" && session.user.id) {
    stampBalance = await getBalance(session.user.id);
  }

  return (
    <NextIntlClientProvider>
      <div className="flex min-h-screen flex-col bg-ivory">
        <SiteHeader stampBalance={stampBalance} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </NextIntlClientProvider>
  );
}
```
> 주의: `auth()` 호출로 locale 레이아웃이 동적 렌더링된다(정적 생성 포기). 데이터 구동 사이트라 허용. `StampChip`은 `balance`가 number일 때만 렌더(6a 구현).

- [ ] **Step 2: 빌드 + Commit**

Run: `npm run build` → PASS.
```bash
git add app/[locale]/layout.tsx
git commit -m "feat(stamps): 헤더 스탬프 칩에 실제 잔액 주입"
```

---

## Task 8: 계정 대시보드 요약 + 홈 프로그램 소개

**Files:**
- Modify: `app/[locale]/account/(protected)/page.tsx`, `app/[locale]/page.tsx`

- [ ] **Step 1: 대시보드에 스탬프 요약 카드**

`app/[locale]/account/(protected)/page.tsx` 상단(이름 카드 아래)에 추가. import 추가 후 JSX 삽입:
```tsx
// import 추가
import { getBalance } from "@/lib/stamps";
import { progress } from "@/lib/stamps/balance";
import { STAMP_GOAL } from "@/lib/stamps/config";
import { Link } from "@/i18n/navigation";
import { Ticket } from "lucide-react";
// 본문에서 balance 계산
const balance = await getBalance(session.user.id);
const p = progress(balance, STAMP_GOAL);
```
이름 카드 다음에 삽입:
```tsx
<Link href="/account/stamps" className="block">
  <div className="flex items-center justify-between rounded-xl border border-gold-500/30 bg-gold-500/10 p-6">
    <div className="flex items-center gap-3">
      <Ticket className="h-6 w-6 text-gold-600" />
      <div>
        <div className="font-bold text-navy-900">{t("stampSummaryTitle")}</div>
        <div className="text-sm text-stone-500">
          {p.complete ? t("stampReady") : t("stampRemaining", { n: p.remaining })}
        </div>
      </div>
    </div>
    <span className="font-serif text-xl font-bold text-gold-600">{p.count}/{p.goal}</span>
  </div>
</Link>
```
> 기존 카드들의 `bg-white`/`text-gray-*`도 6a 토큰(`bg-cream`/`text-navy-900`/`text-stone-*`)으로 정리. `Account` 네임스페이스에 `stampSummaryTitle`/`stampReady`/`stampRemaining` 키 추가(Task 13).

- [ ] **Step 2: 홈에 프로그램 소개 섹션**

`app/[locale]/page.tsx` — `<HospitalMainSection />` 앞에 삽입:
```tsx
<section className="px-4 py-20 sm:px-6">
  <Container className="max-w-4xl">
    <SectionHeading eyebrow={t("stampEyebrow")} title={t("stampTitle")} subtitle={t("stampSubtitle")} />
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      {[1, 2, 3].map((n) => (
        <Card key={n} className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/15 font-serif text-lg font-bold text-gold-600">
            {n}
          </div>
          <p className="text-sm leading-relaxed text-stone-600">{t(`stampStep${n}`)}</p>
        </Card>
      ))}
    </div>
    <p className="mt-6 text-center text-xs text-stone-400">{t("stampForeignNotice")}</p>
  </Container>
</section>
```
> `Home` 네임스페이스에 `stampEyebrow/stampTitle/stampSubtitle/stampStep1..3/stampForeignNotice` 키 추가(Task 13).

- [ ] **Step 3: 빌드 + Commit**

Run: `npm run build` → PASS.
```bash
git add "app/[locale]/account/(protected)/page.tsx" app/[locale]/page.tsx
git commit -m "feat(stamps): 계정 대시보드 요약 + 홈 프로그램 소개 섹션"
```

---

## Task 9: 병원 상세 BENEFIT 배지

**Files:**
- Modify: `app/[locale]/hospitals/[id]/page.tsx`

- [ ] **Step 1: BENEFIT 병원에 교환 가능 배지 추가**

상세 페이지의 BENEFIT 혜택 박스 근처에, `hospital.tier === "BENEFIT"`일 때 표시:
```tsx
import { Ticket } from "lucide-react";
// JSX (혜택 섹션 내):
{hospital.tier === "BENEFIT" && (
  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 text-sm font-bold text-gold-600">
    <Ticket className="h-4 w-4" /> {t("stampRedeemable")}
  </div>
)}
```
> 사용 중인 번역 네임스페이스(`Detail` 등)에 `stampRedeemable` 키 추가(Task 13). 카피는 단정 표현 금지(예: "스탬프 10개로 교환 가능").

- [ ] **Step 2: 빌드 + Commit**

Run: `npm run build` → PASS.
```bash
git add "app/[locale]/hospitals/[id]/page.tsx"
git commit -m "feat(stamps): 병원 상세 BENEFIT 교환 가능 배지"
```

---

## Task 10: 관리자 — 스탬프 발급/조회

**Files:**
- Create: `app/admin/stamp-actions.ts`, `app/admin/(protected)/stamps/page.tsx`
- Modify: `app/admin/(protected)/layout.tsx`

- [ ] **Step 1: 관리자 액션(발급 + 교환처리)**

Create `app/admin/stamp-actions.ts`:
```ts
"use server";

import { requireRole } from "@/lib/auth/guard";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { grantStamps, processRedemption } from "@/lib/stamps";
import type { RedemptionAction } from "@/lib/stamps/redemption";
import { revalidatePath } from "next/cache";

export async function grantStampsAction(formData: FormData): Promise<{ ok: boolean; errors: string[] }> {
  await requireRole(["SUPER_ADMIN"]);
  const session = await auth();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const delta = parseInt(String(formData.get("delta") ?? ""), 10);
  const note = String(formData.get("note") ?? "");
  if (!email) return { ok: false, errors: ["이메일을 입력하세요."] };
  if (!Number.isInteger(delta) || delta === 0) return { ok: false, errors: ["발급 수량(정수, 0 아님)을 입력하세요."] };

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { ok: false, errors: ["해당 이메일의 사용자가 없습니다."] };

  await grantStamps({
    userId: user.id,
    delta,
    reason: delta > 0 ? "ADMIN_GRANT" : "ADJUST",
    adminId: session?.user?.id,
    note,
  });
  revalidatePath("/admin/stamps");
  return { ok: true, errors: [] };
}

export async function processRedemptionAction(id: string, action: RedemptionAction): Promise<{ ok: boolean; errors: string[] }> {
  await requireRole(["SUPER_ADMIN"]);
  const session = await auth();
  try {
    await processRedemption({ id, action, adminId: session?.user?.id ?? "" });
  } catch {
    return { ok: false, errors: ["처리할 수 없는 상태입니다."] };
  }
  revalidatePath("/admin/redemptions");
  return { ok: true, errors: [] };
}
```

- [ ] **Step 2: 관리자 스탬프 페이지(발급 폼 + 조회)**

Create `app/admin/(protected)/stamps/page.tsx`:
```tsx
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { grantStampsAction } from "@/app/admin/stamp-actions";
import { inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default async function AdminStampsPage() {
  await requireRole(["SUPER_ADMIN"]);
  const recent = await db.stampEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { email: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-cream p-6">
        <h1 className="mb-4 font-serif text-xl font-bold text-navy-900">스탬프 발급 / 보정</h1>
        <form action={grantStampsAction} className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto]">
          <input name="email" type="email" placeholder="환자 이메일" className={inputClass} />
          <input name="delta" type="number" placeholder="수량(+/-)" className={inputClass} />
          <input name="note" type="text" placeholder="메모(선택)" className={inputClass} />
          <Button type="submit">발급</Button>
        </form>
        <p className="mt-2 text-xs text-stone-400">양수=적립(ADMIN_GRANT), 음수=보정(ADJUST). ⚠️ 금액·규칙 추후 확정.</p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-cream p-6">
        <h2 className="mb-4 font-bold text-navy-900">최근 적립 내역</h2>
        <ul className="space-y-2 text-sm">
          {recent.map((e) => (
            <li key={e.id} className="flex justify-between border-b border-stone-100 pb-2 last:border-0">
              <span className="text-stone-600">{e.user.email} · {e.reason}</span>
              <span className={e.delta >= 0 ? "font-bold text-teal-700" : "font-bold text-clay-700"}>
                {e.delta >= 0 ? `+${e.delta}` : e.delta}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```
> 발급 폼은 server action 직접 바인딩(`action={grantStampsAction}`) — 성공 시 revalidate로 목록 갱신. 에러 표시가 필요하면 client 래퍼로 확장(1차는 생략).

- [ ] **Step 3: admin nav에 Stamps 링크**

`app/admin/(protected)/layout.tsx`의 nav 항목 배열/JSX에 `{ href: "/admin/stamps", label: "스탬프" }` 추가(기존 nav 패턴에 맞춰).

- [ ] **Step 4: 빌드 + Commit**

Run: `npm run build` → PASS.
```bash
git add app/admin/stamp-actions.ts "app/admin/(protected)/stamps" "app/admin/(protected)/layout.tsx"
git commit -m "feat(stamps): 관리자 스탬프 발급/조회 + nav"
```

---

## Task 11: 관리자 — 교환 처리 + 대시보드 카운트

**Files:**
- Create: `app/admin/(protected)/redemptions/page.tsx`
- Modify: `app/admin/(protected)/layout.tsx`, `app/admin/(protected)/page.tsx`

- [ ] **Step 1: 교환 처리 페이지**

Create `app/admin/(protected)/redemptions/page.tsx`:
```tsx
import { requireRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { processRedemptionAction } from "@/app/admin/stamp-actions";
import { resolveText } from "@/lib/i18n/text";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const TONE: Record<string, "gold" | "teal" | "stone" | "clay"> = {
  REQUESTED: "gold", APPROVED: "teal", FULFILLED: "teal", REJECTED: "clay", CANCELLED: "stone",
};

export default async function AdminRedemptionsPage() {
  await requireRole(["SUPER_ADMIN"]);
  const items = await db.redemption.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { email: true } }, hospital: { select: { name: true } } },
    take: 200,
  });

  return (
    <div className="rounded-xl border border-stone-200 bg-cream p-6">
      <h1 className="mb-4 font-serif text-xl font-bold text-navy-900">무료시술 교환 처리</h1>
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 last:border-0">
            <div>
              <div className="font-medium text-navy-900">
                {resolveText(r.hospital.name, "ko")} · <span className="font-mono text-sm">{r.code}</span>
              </div>
              <div className="text-xs text-stone-500">{r.user.email} · {r.stampCost}장</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={TONE[r.status] ?? "stone"}>{r.status}</Badge>
              {r.status === "REQUESTED" && (
                <>
                  <form action={processRedemptionAction.bind(null, r.id, "approve")}><Button size="sm">승인</Button></form>
                  <form action={processRedemptionAction.bind(null, r.id, "reject")}><Button size="sm" variant="danger">거절</Button></form>
                </>
              )}
              {r.status === "APPROVED" && (
                <>
                  <form action={processRedemptionAction.bind(null, r.id, "fulfill")}><Button size="sm">완료</Button></form>
                  <form action={processRedemptionAction.bind(null, r.id, "reject")}><Button size="sm" variant="danger">거절</Button></form>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```
> `processRedemptionAction`은 `(id, action)` 시그니처라 `.bind(null, r.id, "approve")`로 form action에 바인딩. 반환 `{ok,errors}`는 무시(성공 시 revalidate). 거절/취소 시 헬퍼가 자동 환급.

- [ ] **Step 2: admin nav + 대시보드 카운트**

`app/admin/(protected)/layout.tsx` nav에 `{ href: "/admin/redemptions", label: "교환" }` 추가.
`app/admin/(protected)/page.tsx`에 대기 카운트 카드 추가:
```tsx
import { db } from "@/lib/db";
const pendingRedemptions = await db.redemption.count({ where: { status: "REQUESTED" } });
// 카운트 카드 JSX (기존 대시보드 카드 패턴에 맞춰):
<div className="rounded-xl border border-stone-200 bg-cream p-6">
  <div className="text-sm text-stone-500">대기 중 교환 신청</div>
  <div className="font-serif text-3xl font-bold text-navy-900">{pendingRedemptions}</div>
</div>
```

- [ ] **Step 3: 빌드 + Commit**

Run: `npm run build` → PASS.
```bash
git add "app/admin/(protected)/redemptions" "app/admin/(protected)/layout.tsx" "app/admin/(protected)/page.tsx"
git commit -m "feat(stamps): 관리자 교환 처리 페이지 + 대시보드 카운트"
```

---

## Task 12: 병원 포털 — 교환 조회(읽기) + 삭제 가드

**Files:**
- Create: `app/hospital/(protected)/redemptions/page.tsx`
- Modify: `app/hospital/(protected)/layout.tsx`, `app/admin/hospital-actions.ts`

- [ ] **Step 1: 병원 교환 조회 페이지(자기 병원만)**

Create `app/hospital/(protected)/redemptions/page.tsx`:
```tsx
import { requireHospital } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";

const TONE: Record<string, "gold" | "teal" | "stone" | "clay"> = {
  REQUESTED: "gold", APPROVED: "teal", FULFILLED: "teal", REJECTED: "clay", CANCELLED: "stone",
};

export default async function HospitalRedemptionsPage() {
  const session = await requireHospital();
  const items = await db.redemption.findMany({
    where: { hospitalId: session.user.hospitalId! },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <div className="rounded-xl border border-stone-200 bg-cream p-6">
      <h1 className="mb-1 font-serif text-xl font-bold text-navy-900">무료시술 교환 신청</h1>
      <p className="mb-4 text-xs text-stone-400">교환 코드 확인용(처리는 운영팀). 환자가 제시한 코드와 대조하세요.</p>
      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0">
            <span className="font-mono text-sm text-navy-900">{r.code}</span>
            <Badge tone={TONE[r.status] ?? "stone"}>{r.status}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: hospital nav에 Redemptions 추가**

`app/hospital/(protected)/layout.tsx` nav에 `{ href: "/hospital/redemptions", label: "교환 신청" }` 추가.

- [ ] **Step 3: 병원 삭제 시 진행중 교환 가드**

`app/admin/hospital-actions.ts`의 `deleteHospital` 시작부에 추가:
```ts
const active = await db.redemption.count({
  where: { hospitalId: id, status: { in: ["REQUESTED", "APPROVED"] } },
});
if (active > 0) {
  throw new Error("진행 중인 교환 신청이 있어 삭제할 수 없습니다. 먼저 교환 건을 처리하세요.");
}
```
> 기존 deleteHospital 반환/에러 처리 규약에 맞춰 throw 또는 `{ok:false,errors}` 형태로 조정.

- [ ] **Step 4: 빌드 + Commit**

Run: `npm run build` → PASS.
```bash
git add "app/hospital/(protected)/redemptions" "app/hospital/(protected)/layout.tsx" app/admin/hospital-actions.ts
git commit -m "feat(stamps): 병원 포털 교환 조회(읽기) + 병원 삭제 가드"
```

---

## Task 13: i18n — Stamps 네임스페이스 (4언어) + 컴플라이언스 카피

**Files:**
- Modify: `messages/ko.json`, `en.json`, `zh.json`, `ja.json`

- [ ] **Step 1: 4개 메시지 파일에 `Stamps` 네임스페이스 추가**

각 파일의 최상위에 `"Stamps": { ... }` 추가. 값(번역):

`messages/ko.json`:
```json
"Stamps": {
  "title": "PooGGo 스탬프",
  "subtitle": "스탬프 10개를 모으면 베네핏 병원에서 무료시술로 교환할 수 있습니다.",
  "foreignNotice": "본 혜택은 외국인환자를 대상으로 합니다.",
  "remaining": "무료시술까지 {n}개 남았습니다.",
  "readyToRedeem": "교환 가능합니다. 베네핏 병원을 선택해 신청하세요.",
  "redeemTitle": "무료시술 교환 신청",
  "selectHospital": "베네핏 병원 선택",
  "note": "희망 시술(선택)",
  "notePlaceholder": "희망하는 시술이나 문의 사항을 적어주세요.",
  "submitRedeem": "교환 신청하기",
  "cautionsTitle": "유의사항",
  "cautions": "시술에는 개인차가 있으며 부작용이 발생할 수 있습니다. 자세한 사항은 병원 상담 시 안내받으세요. 본 교환은 외국인환자 대상이며, 시술 가능 여부는 병원 진료 결과에 따릅니다.",
  "consent": "위 유의사항을 확인했습니다.",
  "myRedemptions": "내 교환 내역",
  "noRedemptions": "교환 내역이 없습니다.",
  "code": "교환 코드",
  "cancel": "취소",
  "ledger": "적립 내역",
  "noLedger": "적립 내역이 없습니다.",
  "status_REQUESTED": "신청됨",
  "status_APPROVED": "승인됨",
  "status_FULFILLED": "완료됨",
  "status_REJECTED": "거절됨",
  "status_CANCELLED": "취소됨",
  "reason_EARN_BOOKING": "예약 적립",
  "reason_EARN_REVIEW": "후기 적립",
  "reason_ADMIN_GRANT": "발급",
  "reason_REDEEM": "교환 차감",
  "reason_REFUND": "환급",
  "reason_ADJUST": "보정",
  "errSelectHospital": "병원을 선택해 주세요.",
  "errIneligible": "선택한 병원은 교환 대상이 아닙니다.",
  "errInsufficient": "스탬프가 부족합니다.",
  "errCancel": "취소할 수 없는 상태입니다.",
  "errGeneric": "교환 신청 중 오류가 발생했습니다."
}
```

`messages/en.json`:
```json
"Stamps": {
  "title": "PooGGo Stamps",
  "subtitle": "Collect 10 stamps to redeem a complimentary treatment at a benefit clinic.",
  "foreignNotice": "This program is for international patients.",
  "remaining": "{n} more stamp(s) until your reward.",
  "readyToRedeem": "Ready to redeem. Choose a benefit clinic to request.",
  "redeemTitle": "Request complimentary treatment",
  "selectHospital": "Select a benefit clinic",
  "note": "Preferred treatment (optional)",
  "notePlaceholder": "Tell us the treatment you have in mind or any questions.",
  "submitRedeem": "Request redemption",
  "cautionsTitle": "Important notice",
  "cautions": "Results vary by individual and side effects may occur. Details are provided during clinic consultation. This program is for international patients; eligibility depends on the clinic's medical assessment.",
  "consent": "I have read the notice above.",
  "myRedemptions": "My redemptions",
  "noRedemptions": "No redemptions yet.",
  "code": "Redemption code",
  "cancel": "Cancel",
  "ledger": "Stamp history",
  "noLedger": "No stamp history yet.",
  "status_REQUESTED": "Requested",
  "status_APPROVED": "Approved",
  "status_FULFILLED": "Fulfilled",
  "status_REJECTED": "Rejected",
  "status_CANCELLED": "Cancelled",
  "reason_EARN_BOOKING": "Booking",
  "reason_EARN_REVIEW": "Review",
  "reason_ADMIN_GRANT": "Granted",
  "reason_REDEEM": "Redeemed",
  "reason_REFUND": "Refund",
  "reason_ADJUST": "Adjustment",
  "errSelectHospital": "Please select a clinic.",
  "errIneligible": "The selected clinic is not eligible for redemption.",
  "errInsufficient": "Not enough stamps.",
  "errCancel": "This redemption cannot be cancelled.",
  "errGeneric": "Something went wrong with your request."
}
```

`messages/zh.json`:
```json
"Stamps": {
  "title": "PooGGo 印章",
  "subtitle": "集满10个印章即可在合作（Benefit）医院兑换一次免费项目。",
  "foreignNotice": "本优惠面向外国患者。",
  "remaining": "距离免费项目还差 {n} 个印章。",
  "readyToRedeem": "可以兑换了，请选择合作医院提交申请。",
  "redeemTitle": "申请免费项目兑换",
  "selectHospital": "选择合作医院",
  "note": "希望的项目（选填）",
  "notePlaceholder": "请填写您希望的项目或任何疑问。",
  "submitRedeem": "提交兑换申请",
  "cautionsTitle": "注意事项",
  "cautions": "项目效果因人而异，可能出现副作用。详情请在医院咨询时了解。本兑换面向外国患者，能否进行以医院诊疗结果为准。",
  "consent": "我已阅读以上注意事项。",
  "myRedemptions": "我的兑换记录",
  "noRedemptions": "暂无兑换记录。",
  "code": "兑换码",
  "cancel": "取消",
  "ledger": "印章记录",
  "noLedger": "暂无印章记录。",
  "status_REQUESTED": "已申请",
  "status_APPROVED": "已通过",
  "status_FULFILLED": "已完成",
  "status_REJECTED": "已拒绝",
  "status_CANCELLED": "已取消",
  "reason_EARN_BOOKING": "预约",
  "reason_EARN_REVIEW": "评价",
  "reason_ADMIN_GRANT": "发放",
  "reason_REDEEM": "兑换扣除",
  "reason_REFUND": "返还",
  "reason_ADJUST": "调整",
  "errSelectHospital": "请选择医院。",
  "errIneligible": "所选医院不可用于兑换。",
  "errInsufficient": "印章不足。",
  "errCancel": "该申请无法取消。",
  "errGeneric": "申请过程中出现错误。"
}
```

`messages/ja.json`:
```json
"Stamps": {
  "title": "PooGGo スタンプ",
  "subtitle": "スタンプを10個集めると、ベネフィット医院で無料施術と交換できます。",
  "foreignNotice": "本特典は外国人患者が対象です。",
  "remaining": "無料施術まであと{n}個です。",
  "readyToRedeem": "交換できます。ベネフィット医院を選んで申請してください。",
  "redeemTitle": "無料施術の交換申請",
  "selectHospital": "ベネフィット医院を選択",
  "note": "希望の施術（任意）",
  "notePlaceholder": "希望の施術やご質問をご記入ください。",
  "submitRedeem": "交換を申請する",
  "cautionsTitle": "注意事項",
  "cautions": "施術には個人差があり、副作用が生じる場合があります。詳細は医院の相談時にご確認ください。本交換は外国人患者が対象で、施術の可否は医院の診療結果によります。",
  "consent": "上記の注意事項を確認しました。",
  "myRedemptions": "交換履歴",
  "noRedemptions": "交換履歴はありません。",
  "code": "交換コード",
  "cancel": "キャンセル",
  "ledger": "スタンプ履歴",
  "noLedger": "スタンプ履歴はありません。",
  "status_REQUESTED": "申請済み",
  "status_APPROVED": "承認済み",
  "status_FULFILLED": "完了",
  "status_REJECTED": "却下",
  "status_CANCELLED": "キャンセル済み",
  "reason_EARN_BOOKING": "予約",
  "reason_EARN_REVIEW": "口コミ",
  "reason_ADMIN_GRANT": "付与",
  "reason_REDEEM": "交換控除",
  "reason_REFUND": "返還",
  "reason_ADJUST": "調整",
  "errSelectHospital": "医院を選択してください。",
  "errIneligible": "選択した医院は交換対象ではありません。",
  "errInsufficient": "スタンプが不足しています。",
  "errCancel": "この申請はキャンセルできません。",
  "errGeneric": "申請中にエラーが発生しました。"
}
```

- [ ] **Step 2: `Home`·`Account`·`Detail` 네임스페이스에 키 추가 (4언어)**

각 파일의 `Home`에 추가:
```
"stampEyebrow": (ko)"리워드" (en)"Rewards" (zh)"奖励" (ja)"リワード"
"stampTitle": (ko)"PooGGo 스탬프로 받는 혜택" (en)"How PooGGo Stamps work" (zh)"PooGGo 印章如何运作" (ja)"PooGGoスタンプの仕組み"
"stampSubtitle": (ko)"이용할 때마다 스탬프가 쌓이고, 10개를 모으면 베네핏 병원에서 무료시술로 교환할 수 있습니다." (en)"Earn a stamp as you use PooGGo. Collect 10 to redeem a complimentary treatment at a benefit clinic." (zh)"每次使用都会累积印章，集满10个即可在合作医院兑换免费项目。" (ja)"ご利用ごとにスタンプが貯まり、10個でベネフィット医院の無料施術と交換できます。"
"stampStep1": (ko)"예약·이용으로 스탬프를 모으세요." (en)"Earn stamps by booking and using PooGGo." (zh)"通过预约和使用累积印章。" (ja)"予約・利用でスタンプを貯めましょう。"
"stampStep2": (ko)"스탬프 10개를 채우세요." (en)"Fill all 10 stamps." (zh)"集满10个印章。" (ja)"スタンプを10個集めます。"
"stampStep3": (ko)"베네핏 병원을 골라 무료시술로 교환하세요." (en)"Choose a benefit clinic and redeem." (zh)"选择合作医院兑换免费项目。" (ja)"ベネフィット医院を選んで交換します。"
"stampForeignNotice": (ko)"본 프로그램은 외국인환자를 대상으로 하며, 시술에는 개인차·부작용이 있을 수 있습니다." (en)"For international patients. Results vary and side effects may occur." (zh)"面向外国患者，效果因人而异并可能有副作用。" (ja)"外国人患者対象。効果には個人差があり副作用が生じる場合があります。"
```
각 파일의 `Account`에 추가:
```
"stampSummaryTitle": (ko)"내 스탬프" (en)"My stamps" (zh)"我的印章" (ja)"マイスタンプ"
"stampReady": (ko)"교환 가능합니다" (en)"Ready to redeem" (zh)"可以兑换" (ja)"交換できます"
"stampRemaining": (ko)"무료시술까지 {n}개" (en)"{n} to go" (zh)"还差 {n} 个" (ja)"あと{n}個"
```
각 파일의 `Detail`에 추가:
```
"stampRedeemable": (ko)"스탬프 10개로 무료시술 교환 가능" (en)"Redeemable with 10 PooGGo stamps" (zh)"可用10个印章兑换免费项目" (ja)"スタンプ10個で無料施術と交換可"
```

- [ ] **Step 3: JSON 유효성 + 빌드 검증**

Run: `node -e "['ko','en','zh','ja'].forEach(l=>JSON.parse(require('fs').readFileSync('messages/'+l+'.json','utf8')))" && echo OK`
Expected: `OK` (4개 파일 JSON 파싱 성공).
Run: `npm run build` → PASS.

- [ ] **Step 4: Commit**
```bash
git add messages
git commit -m "feat(stamps): Stamps i18n 4언어 + 컴플라이언스 카피"
```

---

## Task 14: 컴플라이언스 게이트 + E2E 검증 + 마무리

- [ ] **Step 1: 의료광고법 카피 검수 (머지 게이트)**

스탬프 관련 사용자 노출 카피(ko/en/zh/ja의 `Stamps`/`Home`/`Detail` 신규 키 + 병원 상세 배지)를 `medical_compliance_checker` 스킬로 검수한다. 체크: 외국인환자 대상 명시 / 부작용·유의사항 노출 / "선착순·무조건 무료·100% 완치·최고·1위" 등 금지표현 부재 / 유인·알선 소지. 위반 발견 시 카피 수정 후 재검수. **통과 전 머지 금지.**

- [ ] **Step 2: 전체 테스트 + 빌드**

Run: `npm test` → 전 vitest PASS (신규 `lib/stamps` 포함).
Run: `npm run build` → PASS.

- [ ] **Step 3: 수동 E2E (dev 서버)**

Run: `npm run dev`. 시나리오:
1. 환자로 로그인 → 헤더에 `🎫 0/10` 표시.
2. `/admin/stamps`에서 해당 환자 이메일로 `10` 발급.
3. 환자 `/ko/account/stamps` → 스탬프 카드 10칸 채워짐, 교환 폼 노출.
4. 베네핏 병원 선택 + 유의사항 동의 → 교환 신청 → 잔액 0, 교환 "신청됨", 코드 표시.
5. `/admin/redemptions` → 해당 건 "승인" → "완료". (또는 "거절" → 환자 잔액 +10 환급 확인.)
6. `/hospital/redemptions`(해당 병원 계정) → 코드/상태 조회 확인.

- [ ] **Step 4: 최종 정리 Commit (필요 시)**
```bash
git add -A
git commit -m "chore(stamps): 컴플라이언스 검수 반영 + E2E 검증"
```

---

## Self-Review 메모 (작성자 확인 완료)
- **스펙 §5(모델)** → Task 1. **§6(lib/stamps)** → Task 2~5(순수 함수 TDD + DB 헬퍼). **§7(액션)** → Task 6/10/11. **§8(화면: 공개/관리자/병원)** → Task 6~12. **§9(i18n)** → Task 13. **§10(컴플라이언스)** → Task 13 카피 + Task 14 게이트. **§11 완료기준** → Task 14 E2E.
- **타입 일관성**: `nextRedemptionStatus`/`isRefundExit`/`canRedeem`/`generateRedemptionCode`(redemption.ts), `computeBalance`/`progress`(balance.ts), `getBalance`/`getHistory`/`grantStamps`/`requestRedemption`/`cancelRedemption`/`processRedemption`(index.ts) — 정의 위치와 사용처(페이지·액션) 시그니처 일치 확인.
- **RedemptionAction** 타입은 `redemption.ts`에서 export, `index.ts`·`stamp-actions.ts`가 재사용.
- **환급 무결성**: 차감(REDEEM -cost)은 신청 시, 환급(REFUND +cost)은 REJECTED/CANCELLED 종단에서만. FULFILLED는 환급 없음 → 잔액=sum(delta) 항상 정합.
- **의존 방향**: 6b는 6a 프리미티브에만 의존(역방향 없음). StampChip 실주입은 Task 7.
- **플레이스홀더 없음**: 모든 코드 스텝에 실제 코드/명령/기대값 포함. 적립 자동화는 의도적 비목표(수동+placeholder)로 명시.
