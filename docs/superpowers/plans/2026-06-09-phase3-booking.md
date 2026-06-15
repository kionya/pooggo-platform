# PooGGo Phase 3 — 예약 + 알림 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 외국인 환자가 병원에 희망일시로 예약요청(개인정보·사진 포함)하고, 환자·관리자·병원에 자동 알림(이메일/텔레그램)이 가며, 관리자가 상태 파이프라인으로 관리하는 예약 시스템을 만든다.

**Architecture:** 신규 `Booking` Prisma 모델(비회원). 검증·상태전이·코드생성·ids파싱·알림템플릿은 `lib/`의 순수함수로 분리해 vitest TDD. 사진은 Vercel Blob(`@vercel/blob` put), 알림은 Resend(이메일)+Telegram(관리자) fetch 어댑터로 best-effort 팬아웃 — **env 부재 시 throw 없이 skip**. 예약 폼·성공·관리자 파이프라인은 next-intl 다국어.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma + Neon Postgres, next-intl, @vercel/blob, Resend API(fetch), Telegram Bot API(fetch), vitest.

**참고 설계서:** `docs/superpowers/specs/2026-06-09-pooggo-phase3-booking-design.md`

> **순서:** 순수 도메인(Task 1–4) → 어댑터(Task 5 Blob, 6 알림) → 스키마(7) → 폼·생성(8) → 성공(9) → 관리자(10) → 진입점 배선(11) → 검증(12). 각 태스크는 `npm run build` 통과 상태로 끝낸다.

---

## File Structure

**신규 (순수 로직 — TDD)**
- `lib/booking/types.ts` — `BookingInput`, 상수(시간대/성별/메신저)
- `lib/booking/status.ts` (+ `status.test.ts`) — `BOOKING_STATUSES`, `canTransition`
- `lib/booking/validation.ts` (+ `validation.test.ts`) — `validateBookingInput`
- `lib/booking/ids.ts` (+ `ids.test.ts`) — `parseHospitalIds`
- `lib/booking/code.ts` (+ `code.test.ts`) — `makeBookingCode`
- `lib/notify/templates.ts` (+ `templates.test.ts`) — `patientEmail`/`adminMessage`/`hospitalEmail`

**신규 (어댑터/연동)**
- `lib/upload/blob.ts` — `uploadBookingPhoto(file)`
- `lib/notify/email.ts` — `sendEmail({to,subject,html})` (Resend)
- `lib/notify/telegram.ts` — `sendTelegram(text)`
- `lib/notify/index.ts` — `sendBookingNotifications(bookings, hospitalsById)`

**신규 (UI/페이지/액션)**
- `app/[locale]/booking/page.tsx`, `app/[locale]/booking/success/page.tsx`
- `app/[locale]/booking/actions.ts` — `createBooking`
- `components/booking/BookingForm.tsx`
- `app/admin/(protected)/bookings/page.tsx`, `app/admin/booking-actions.ts` — `updateBookingStatus`

**수정**
- `prisma/schema.prisma`(Booking + Hospital.bookings) + 마이그레이션, `prisma/seed.ts`(영향 없음 — 변경 불필요)
- `messages/{ko,en,zh,ja}.json`(`Booking` 네임스페이스)
- `app/[locale]/hospitals/[id]/page.tsx`(예약하기 버튼)
- `app/[locale]/compare/page.tsx`(consultCta → /booking)
- `components/HospitalMainSection.tsx`(카트 → /booking?hospitals=)
- `app/admin/(protected)/page.tsx`(NEW 카운트), `app/admin/(protected)/layout.tsx`(네비 "예약")
- `.env`(6개 키 — 커밋 안 됨)

---

## Task 1: 예약 상태 전이 (TDD)

**Files:**
- Create: `lib/booking/status.ts`, Test: `lib/booking/status.test.ts`

- [ ] **Step 1: 실패하는 테스트**

Create `lib/booking/status.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { BOOKING_STATUSES, canTransition } from "./status";

describe("BOOKING_STATUSES", () => {
  it("5종", () => expect([...BOOKING_STATUSES]).toEqual(["NEW", "CONFIRMED", "VISITED", "DONE", "CANCELLED"]));
});

describe("canTransition", () => {
  it("NEW→CONFIRMED 허용", () => expect(canTransition("NEW", "CONFIRMED")).toBe(true));
  it("NEW→CANCELLED 허용", () => expect(canTransition("NEW", "CANCELLED")).toBe(true));
  it("NEW→VISITED 불가(점프)", () => expect(canTransition("NEW", "VISITED")).toBe(false));
  it("CONFIRMED→VISITED 허용", () => expect(canTransition("CONFIRMED", "VISITED")).toBe(true));
  it("VISITED→DONE 허용", () => expect(canTransition("VISITED", "DONE")).toBe(true));
  it("DONE→NEW 역행 불가", () => expect(canTransition("DONE", "NEW")).toBe(false));
  it("CANCELLED는 종료(전이 없음)", () => expect(canTransition("CANCELLED", "NEW")).toBe(false));
  it("같은 상태로는 불가", () => expect(canTransition("NEW", "NEW")).toBe(false));
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- lib/booking/status.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

Create `lib/booking/status.ts`:
```ts
export const BOOKING_STATUSES = ["NEW", "CONFIRMED", "VISITED", "DONE", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const NEXT: Record<string, string[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["VISITED", "CANCELLED"],
  VISITED: ["DONE", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
};

export function canTransition(from: string, to: string): boolean {
  return (NEXT[from] ?? []).includes(to);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- lib/booking/status.test.ts`
Expected: PASS (9).

- [ ] **Step 5: 커밋**

```bash
git add lib/booking/status.ts lib/booking/status.test.ts
git commit -m "feat(booking): 상태 전이 규칙 canTransition(TDD)"
```

---

## Task 2: 예약 도메인 타입 + 입력 검증 (TDD)

**Files:**
- Create: `lib/booking/types.ts`
- Create: `lib/booking/validation.ts`, Test: `lib/booking/validation.test.ts`

- [ ] **Step 1: 타입**

Create `lib/booking/types.ts`:
```ts
export const TIME_OF_DAY = ["MORNING", "AFTERNOON", "EVENING"] as const;
export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export const MESSENGER_CHANNELS = ["whatsapp", "line", "wechat", "kakao"] as const;

export type BookingInput = {
  hospitalIds: string[];
  locale: string;
  name: string;
  phone: string;
  nationality: string;
  email: string;
  age: number | null;
  gender: string;
  messengerChannel: string;
  messengerHandle: string;
  treatmentInterest: string;
  memo: string;
  preferredDate1: string;  // ISO date "YYYY-MM-DD"
  preferredDate2: string;  // "" 허용
  timeOfDay: string;
  consent: boolean;
};
```

- [ ] **Step 2: 실패하는 테스트**

Create `lib/booking/validation.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { validateBookingInput } from "./validation";
import type { BookingInput } from "./types";

function valid(): BookingInput {
  return {
    hospitalIds: ["h1"], locale: "ko",
    name: "John", phone: "+8210", nationality: "US",
    email: "j@x.com", age: 30, gender: "MALE",
    messengerChannel: "whatsapp", messengerHandle: "+8210",
    treatmentInterest: "rhino", memo: "",
    preferredDate1: "2026-07-01", preferredDate2: "", timeOfDay: "MORNING",
    consent: true,
  };
}

describe("validateBookingInput", () => {
  it("완전 입력은 에러 없음", () => expect(validateBookingInput(valid())).toEqual([]));
  it("병원 0곳 에러", () => {
    const v = valid(); v.hospitalIds = [];
    expect(validateBookingInput(v).some((e) => e.includes("hospital"))).toBe(true);
  });
  it("이름 누락 에러", () => {
    const v = valid(); v.name = "  ";
    expect(validateBookingInput(v).some((e) => e.includes("name"))).toBe(true);
  });
  it("연락처 누락 에러", () => {
    const v = valid(); v.phone = "";
    expect(validateBookingInput(v).some((e) => e.includes("phone"))).toBe(true);
  });
  it("국적 누락 에러", () => {
    const v = valid(); v.nationality = "";
    expect(validateBookingInput(v).some((e) => e.includes("nationality"))).toBe(true);
  });
  it("1지망 날짜 누락 에러", () => {
    const v = valid(); v.preferredDate1 = "";
    expect(validateBookingInput(v).some((e) => e.includes("preferredDate1"))).toBe(true);
  });
  it("잘못된 timeOfDay 에러", () => {
    const v = valid(); v.timeOfDay = "NIGHT";
    expect(validateBookingInput(v).some((e) => e.includes("timeOfDay"))).toBe(true);
  });
  it("동의 미체크 에러", () => {
    const v = valid(); v.consent = false;
    expect(validateBookingInput(v).some((e) => e.includes("consent"))).toBe(true);
  });
  it("이메일 형식 오류 에러", () => {
    const v = valid(); v.email = "not-email";
    expect(validateBookingInput(v).some((e) => e.includes("email"))).toBe(true);
  });
  it("병원 4곳 이상 에러", () => {
    const v = valid(); v.hospitalIds = ["a", "b", "c", "d"];
    expect(validateBookingInput(v).some((e) => e.includes("hospital"))).toBe(true);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -- lib/booking/validation.test.ts`
Expected: FAIL.

- [ ] **Step 4: 구현**

Create `lib/booking/validation.ts`:
```ts
import { TIME_OF_DAY } from "./types";
import type { BookingInput } from "./types";

export function validateBookingInput(input: BookingInput): string[] {
  const errors: string[] = [];
  if (input.hospitalIds.length < 1) errors.push("hospital: 병원을 1곳 이상 선택해야 합니다.");
  if (input.hospitalIds.length > 3) errors.push("hospital: 병원은 최대 3곳까지 가능합니다.");
  if (!input.name.trim()) errors.push("name: 이름은 필수입니다.");
  if (!input.phone.trim()) errors.push("phone: 연락처는 필수입니다.");
  if (!input.nationality.trim()) errors.push("nationality: 국적은 필수입니다.");
  if (!input.preferredDate1.trim()) errors.push("preferredDate1: 1지망 날짜는 필수입니다.");
  if (!(TIME_OF_DAY as readonly string[]).includes(input.timeOfDay)) errors.push("timeOfDay: 시간대가 올바르지 않습니다.");
  if (!input.consent) errors.push("consent: 개인정보 수집·이용에 동의해야 합니다.");
  if (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.push("email: 이메일 형식이 올바르지 않습니다.");
  return errors;
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -- lib/booking/validation.test.ts`
Expected: PASS (10).

- [ ] **Step 6: 커밋**

```bash
git add lib/booking/types.ts lib/booking/validation.ts lib/booking/validation.test.ts
git commit -m "feat(booking): 입력 타입 + 검증(필수·동의·이메일형식·병원수, TDD)"
```

---

## Task 3: 병원 ids 파싱 + 추적코드 (TDD)

**Files:**
- Create: `lib/booking/ids.ts`, Test: `lib/booking/ids.test.ts`
- Create: `lib/booking/code.ts`, Test: `lib/booking/code.test.ts`

- [ ] **Step 1: 실패하는 테스트 (ids)**

Create `lib/booking/ids.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseHospitalIds } from "./ids";

describe("parseHospitalIds", () => {
  it("단일", () => expect(parseHospitalIds({ hospital: "h1" })).toEqual(["h1"]));
  it("다중 콤마", () => expect(parseHospitalIds({ hospitals: "a,b,c" })).toEqual(["a", "b", "c"]));
  it("최대 3개로 제한", () => expect(parseHospitalIds({ hospitals: "a,b,c,d,e" })).toEqual(["a", "b", "c"]));
  it("공백·빈값 제거", () => expect(parseHospitalIds({ hospitals: " a , ,b " })).toEqual(["a", "b"]));
  it("중복 제거", () => expect(parseHospitalIds({ hospitals: "a,a,b" })).toEqual(["a", "b"]));
  it("둘 다 없으면 빈배열", () => expect(parseHospitalIds({})).toEqual([]));
  it("hospital 우선 + hospitals 병합", () => expect(parseHospitalIds({ hospital: "x", hospitals: "y,z" })).toEqual(["x", "y", "z"]));
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- lib/booking/ids.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현 (ids)**

Create `lib/booking/ids.ts`:
```ts
export function parseHospitalIds(sp: { hospital?: string; hospitals?: string }): string[] {
  const raw: string[] = [];
  if (sp.hospital) raw.push(sp.hospital);
  if (sp.hospitals) raw.push(...sp.hospitals.split(","));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of raw) {
    const id = r.trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out.slice(0, 3);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- lib/booking/ids.test.ts`
Expected: PASS (7).

- [ ] **Step 5: 실패하는 테스트 (code)**

Create `lib/booking/code.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { makeBookingCode } from "./code";

describe("makeBookingCode", () => {
  it("RDB- 접두 + 6자리 대문자/숫자", () => {
    const c = makeBookingCode();
    expect(c).toMatch(/^RDB-[A-Z0-9]{6}$/);
  });
  it("연속 호출 시 대체로 다름", () => {
    const set = new Set(Array.from({ length: 50 }, () => makeBookingCode()));
    expect(set.size).toBeGreaterThan(45);
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `npm test -- lib/booking/code.test.ts`
Expected: FAIL.

- [ ] **Step 7: 구현 (code)**

Create `lib/booking/code.ts`:
```ts
import crypto from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 혼동 문자 제외

export function makeBookingCode(): string {
  const bytes = crypto.randomBytes(6);
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `RDB-${s}`;
}
```

- [ ] **Step 8: 통과 확인**

Run: `npm test -- lib/booking/code.test.ts`
Expected: PASS (2).

- [ ] **Step 9: 커밋**

```bash
git add lib/booking/ids.ts lib/booking/ids.test.ts lib/booking/code.ts lib/booking/code.test.ts
git commit -m "feat(booking): 병원 ids 파싱 + 추적코드 생성(TDD)"
```

---

## Task 4: 알림 메시지 템플릿 (TDD)

**Files:**
- Create: `lib/notify/templates.ts`, Test: `lib/notify/templates.test.ts`

- [ ] **Step 1: 실패하는 테스트**

Create `lib/notify/templates.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { patientEmail, adminMessage, hospitalEmail } from "./templates";

const booking = {
  code: "RDB-ABC123", name: "John Doe", phone: "+8210", nationality: "US",
  preferredDate1: "2026-07-01", preferredDate2: "", timeOfDay: "MORNING",
  treatmentInterest: "Rhinoplasty", memo: "first time",
  messengerChannel: "whatsapp", messengerHandle: "+8210", email: "j@x.com",
} as any;
const hospitalName = "Rejuel Clinic";

describe("patientEmail", () => {
  const r = patientEmail(booking, hospitalName);
  it("제목·본문에 코드 포함", () => {
    expect(r.subject).toContain("RDB-ABC123");
    expect(r.html).toContain("RDB-ABC123");
  });
  it("병원명·희망일 포함", () => {
    expect(r.html).toContain("Rejuel Clinic");
    expect(r.html).toContain("2026-07-01");
  });
});

describe("adminMessage", () => {
  it("환자·병원·코드 핵심정보 포함", () => {
    const t = adminMessage(booking, hospitalName);
    expect(t).toContain("John Doe");
    expect(t).toContain("Rejuel Clinic");
    expect(t).toContain("RDB-ABC123");
  });
});

describe("hospitalEmail", () => {
  it("제목에 병원명, 본문에 환자·일시", () => {
    const r = hospitalEmail(booking, hospitalName);
    expect(r.subject).toContain("Rejuel Clinic");
    expect(r.html).toContain("John Doe");
    expect(r.html).toContain("MORNING");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- lib/notify/templates.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현**

Create `lib/notify/templates.ts`:
```ts
export type BookingLike = {
  code: string; name: string; phone: string; nationality: string;
  preferredDate1: string; preferredDate2?: string; timeOfDay: string;
  treatmentInterest?: string; memo?: string;
  messengerChannel?: string; messengerHandle?: string; email?: string;
};

function lines(b: BookingLike, hospitalName: string): string[] {
  return [
    `Tracking code: ${b.code}`,
    `Hospital: ${hospitalName}`,
    `Patient: ${b.name} (${b.nationality})`,
    `Contact: ${b.phone}${b.messengerChannel ? ` / ${b.messengerChannel}: ${b.messengerHandle ?? ""}` : ""}`,
    `Preferred: ${b.preferredDate1}${b.preferredDate2 ? ` or ${b.preferredDate2}` : ""} (${b.timeOfDay})`,
    `Interest: ${b.treatmentInterest ?? "-"}`,
    `Memo: ${b.memo ?? "-"}`,
  ];
}

export function patientEmail(b: BookingLike, hospitalName: string): { subject: string; html: string } {
  const body = lines(b, hospitalName).map((l) => `<p>${l}</p>`).join("");
  return {
    subject: `[PooGGo] Booking received — ${b.code}`,
    html: `<h2>Your booking request was received</h2><p>This is a request; the clinic will confirm the schedule.</p>${body}`,
  };
}

export function adminMessage(b: BookingLike, hospitalName: string): string {
  return [`🆕 New booking`, ...lines(b, hospitalName)].join("\n");
}

export function hospitalEmail(b: BookingLike, hospitalName: string): { subject: string; html: string } {
  const body = lines(b, hospitalName).map((l) => `<p>${l}</p>`).join("");
  return {
    subject: `[PooGGo] New patient booking — ${hospitalName}`,
    html: `<h2>New booking request</h2>${body}`,
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- lib/notify/templates.test.ts`
Expected: PASS (5).

- [ ] **Step 5: 커밋**

```bash
git add lib/notify/templates.ts lib/notify/templates.test.ts
git commit -m "feat(notify): 알림 메시지 템플릿(환자/관리자/병원, TDD)"
```

---

## Task 5: Vercel Blob 사진 업로드 어댑터

**Files:**
- Create: `lib/upload/blob.ts`

- [ ] **Step 1: 패키지 설치**

Run: `npm i @vercel/blob`

- [ ] **Step 2: 구현 (env 부재 시 graceful skip)**

Create `lib/upload/blob.ts`:
```ts
import { put } from "@vercel/blob";
import crypto from "crypto";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

export async function uploadBookingPhoto(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn("[blob] BLOB_READ_WRITE_TOKEN 미설정 — 사진 업로드 스킵");
    return null;
  }
  if (file.size > MAX_BYTES) {
    console.warn("[blob] 파일 5MB 초과 — 스킵");
    return null;
  }
  if (!file.type.startsWith("image/")) {
    console.warn("[blob] 이미지 아님 — 스킵");
    return null;
  }
  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `bookings/${crypto.randomUUID()}-${safeName}`;
    const blob = await put(key, file, { access: "public" });
    return blob.url;
  } catch (e) {
    console.error("[blob] 업로드 실패:", e);
    return null;
  }
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 4: 커밋**

```bash
git add lib/upload/blob.ts package.json package-lock.json
git commit -m "feat(upload): Vercel Blob 사진 업로드 어댑터(env 부재 시 skip)"
```

---

## Task 6: 알림 어댑터 + 팬아웃 (Resend / Telegram)

**Files:**
- Create: `lib/notify/email.ts`, `lib/notify/telegram.ts`, `lib/notify/index.ts`

- [ ] **Step 1: 이메일 어댑터 (Resend, fetch)**

Create `lib/notify/email.ts`:
```ts
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<{ ok: boolean; skipped?: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) {
    console.warn("[email] RESEND_API_KEY/RESEND_FROM 미설정 — 이메일 스킵");
    return { ok: false, skipped: true };
  }
  if (!params.to) return { ok: false, skipped: true };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });
    if (!res.ok) {
      console.error("[email] Resend 응답 오류:", res.status, await res.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] 전송 실패:", e);
    return { ok: false };
  }
}
```

- [ ] **Step 2: 텔레그램 어댑터 (fetch)**

Create `lib/notify/telegram.ts`:
```ts
export async function sendTelegram(text: string): Promise<{ ok: boolean; skipped?: boolean }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN/CHAT_ID 미설정 — 텔레그램 스킵");
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      console.error("[telegram] 응답 오류:", res.status, await res.text());
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("[telegram] 전송 실패:", e);
    return { ok: false };
  }
}
```

- [ ] **Step 3: 팬아웃 오케스트레이터**

Create `lib/notify/index.ts`:
```ts
import { sendEmail } from "./email";
import { sendTelegram } from "./telegram";
import { patientEmail, adminMessage, hospitalEmail, type BookingLike } from "./templates";

type BookingRow = BookingLike & { hospitalId: string };
type HospitalInfo = { name: string; email: string };

// best-effort 병렬 발송. 예약 저장과 무관하게 실패해도 throw 안 함.
export async function sendBookingNotifications(
  bookings: BookingRow[],
  hospitalsById: Record<string, HospitalInfo>,
): Promise<void> {
  const jobs: Promise<unknown>[] = [];
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || "";

  for (const b of bookings) {
    const h = hospitalsById[b.hospitalId] ?? { name: "(unknown)", email: "" };
    // 환자 확인 이메일
    if (b.email) {
      const pe = patientEmail(b, h.name);
      jobs.push(sendEmail({ to: b.email, subject: pe.subject, html: pe.html }));
    }
    // 관리자 텔레그램 + 이메일
    jobs.push(sendTelegram(adminMessage(b, h.name)));
    if (adminEmail) {
      const he = hospitalEmail(b, h.name); // 관리자에게도 동일 요약 메일
      jobs.push(sendEmail({ to: adminEmail, subject: `[ADMIN] ${he.subject}`, html: he.html }));
    }
    // 병원 이메일
    if (h.email) {
      const he = hospitalEmail(b, h.name);
      jobs.push(sendEmail({ to: h.email, subject: he.subject, html: he.html }));
    }
  }
  await Promise.allSettled(jobs);
}
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 5: 커밋**

```bash
git add lib/notify/email.ts lib/notify/telegram.ts lib/notify/index.ts
git commit -m "feat(notify): Resend 이메일 + Telegram 어댑터 + best-effort 팬아웃(env 부재 시 skip)"
```

---

## Task 7: Booking 스키마 + 마이그레이션

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 모델 추가**

`prisma/schema.prisma` 맨 아래에 추가:
```prisma
model Booking {
  id            String   @id @default(uuid())
  code          String   @unique
  status        String   @default("NEW")
  locale        String   @default("ko")

  groupId       String?

  hospitalId    String
  hospital      Hospital @relation(fields: [hospitalId], references: [id])

  name          String
  phone         String
  nationality   String
  email         String?
  age           Int?
  gender        String?

  messengerChannel String?
  messengerHandle  String?

  treatmentInterest String?
  memo          String?
  photo         String?

  preferredDate1 DateTime
  preferredDate2 DateTime?
  timeOfDay      String

  consent        Boolean  @default(false)

  adminNote      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([status])
  @@index([hospitalId])
  @@index([groupId])
}
```
그리고 `model Hospital { ... }`의 관계 목록(`leads Lead[]` 줄 근처)에 추가:
```prisma
  bookings    Booking[]
```

- [ ] **Step 2: 마이그레이션 생성 + 적용 (증분, 비대화형)**

Run: `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > /tmp/booking.sql`
(만약 위가 빈 출력이면 from을 migrations로: `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script > /tmp/booking.sql`)
`/tmp/booking.sql` 확인 — `CREATE TABLE "Booking"` + 인덱스 + FK만 있어야 함(파괴적 없음).
폴더 `prisma/migrations/20260609000002_booking/` 생성, `/tmp/booking.sql`을 `migration.sql`로 복사, 맨 위 주석 `-- 예약(Booking) 테이블 추가`.
Run: `npx prisma migrate deploy`
Run: `npx prisma migrate status`(up to date) + `npx prisma generate`.

- [ ] **Step 3: 확인**

Run: `node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().booking.count().then(c=>{console.log('booking table ok, count=',c);process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})"`
Expected: `booking table ok, count= 0`.

- [ ] **Step 4: 빌드 + 커밋**

Run: `npm run build` (성공)
```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(booking): Booking 테이블 스키마 + 증분 마이그레이션"
```

---

## Task 8: 예약 폼 + 생성 액션 + 메시지

**Files:**
- Modify: `messages/{ko,en,zh,ja}.json`
- Create: `components/booking/BookingForm.tsx`
- Create: `app/[locale]/booking/actions.ts`
- Create: `app/[locale]/booking/page.tsx`

- [ ] **Step 1: 메시지 — Booking 네임스페이스 (4파일)**

각 `messages/*.json`에 최상위 키 `"Booking"`을 추가. `messages/ko.json`:
```json
  "Booking": { "title": "예약 요청", "forHospitals": "예약 병원", "name": "이름", "phone": "연락처", "nationality": "국적", "email": "이메일", "age": "나이", "gender": "성별", "messenger": "메신저", "handle": "계정/번호", "interest": "관심 시술", "memo": "메모", "photo": "사진 첨부", "date1": "1지망 날짜", "date2": "2지망 날짜", "timeOfDay": "희망 시간대", "morning": "오전", "afternoon": "오후", "evening": "저녁", "consent": "개인정보 수집·이용에 동의합니다", "notConfirmed": "예약은 요청이며 병원 확인 후 확정됩니다.", "submit": "예약 요청 보내기", "submitting": "전송 중...", "successTitle": "예약 요청이 접수되었습니다", "yourCode": "추적 코드", "emailedNote": "입력하신 이메일로 확인을 보냈습니다.", "backHome": "홈으로" }
```
`messages/en.json`:
```json
  "Booking": { "title": "Booking Request", "forHospitals": "Clinics", "name": "Name", "phone": "Contact", "nationality": "Nationality", "email": "Email", "age": "Age", "gender": "Gender", "messenger": "Messenger", "handle": "Handle/Number", "interest": "Treatment interest", "memo": "Memo", "photo": "Attach photo", "date1": "1st preferred date", "date2": "2nd preferred date", "timeOfDay": "Preferred time", "morning": "Morning", "afternoon": "Afternoon", "evening": "Evening", "consent": "I agree to the collection and use of my personal data", "notConfirmed": "This is a request; the clinic confirms the final schedule.", "submit": "Send booking request", "submitting": "Sending...", "successTitle": "Your booking request was received", "yourCode": "Tracking code", "emailedNote": "A confirmation was sent to your email.", "backHome": "Home" }
```
`messages/zh.json`:
```json
  "Booking": { "title": "预约申请", "forHospitals": "预约医院", "name": "姓名", "phone": "联系方式", "nationality": "国籍", "email": "邮箱", "age": "年龄", "gender": "性别", "messenger": "即时通讯", "handle": "账号/号码", "interest": "感兴趣的项目", "memo": "备注", "photo": "附上照片", "date1": "第一志愿日期", "date2": "第二志愿日期", "timeOfDay": "希望时间段", "morning": "上午", "afternoon": "下午", "evening": "晚上", "consent": "我同意收集和使用我的个人信息", "notConfirmed": "此为申请，由医院确认后最终确定。", "submit": "发送预约申请", "submitting": "发送中...", "successTitle": "已收到您的预约申请", "yourCode": "追踪码", "emailedNote": "确认信息已发送至您的邮箱。", "backHome": "首页" }
```
`messages/ja.json`:
```json
  "Booking": { "title": "予約リクエスト", "forHospitals": "予約病院", "name": "氏名", "phone": "連絡先", "nationality": "国籍", "email": "メール", "age": "年齢", "gender": "性別", "messenger": "メッセンジャー", "handle": "アカウント/番号", "interest": "関心のある施術", "memo": "メモ", "photo": "写真添付", "date1": "第1希望日", "date2": "第2希望日", "timeOfDay": "希望時間帯", "morning": "午前", "afternoon": "午後", "evening": "夜", "consent": "個人情報の収集・利用に同意します", "notConfirmed": "これはリクエストであり、病院の確認後に確定します。", "submit": "予約リクエストを送る", "submitting": "送信中...", "successTitle": "予約リクエストを受け付けました", "yourCode": "追跡コード", "emailedNote": "ご入力のメールに確認を送信しました。", "backHome": "ホーム" }
```
> 주의: 각 파일에서 기존 마지막 네임스페이스 뒤에 콤마를 추가하고 `"Booking"` 블록을 넣어 JSON 유효성을 유지할 것. 4개 파일 키 구조 동일.

- [ ] **Step 2: 생성 액션**

Create `app/[locale]/booking/actions.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { validateBookingInput } from "@/lib/booking/validation";
import type { BookingInput } from "@/lib/booking/types";
import { makeBookingCode } from "@/lib/booking/code";
import { uploadBookingPhoto } from "@/lib/upload/blob";
import { sendBookingNotifications } from "@/lib/notify";
import { resolveText } from "@/lib/i18n/text";
import crypto from "crypto";

export async function createBooking(formData: FormData): Promise<{ ok: boolean; errors: string[] }> {
  const hospitalIds = String(formData.get("hospitalIds") || "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const ageRaw = String(formData.get("age") || "").trim();
  const input: BookingInput = {
    hospitalIds,
    locale: String(formData.get("locale") || "ko"),
    name: String(formData.get("name") || ""),
    phone: String(formData.get("phone") || ""),
    nationality: String(formData.get("nationality") || ""),
    email: String(formData.get("email") || ""),
    age: ageRaw ? Number(ageRaw) : null,
    gender: String(formData.get("gender") || ""),
    messengerChannel: String(formData.get("messengerChannel") || ""),
    messengerHandle: String(formData.get("messengerHandle") || ""),
    treatmentInterest: String(formData.get("treatmentInterest") || ""),
    memo: String(formData.get("memo") || ""),
    preferredDate1: String(formData.get("preferredDate1") || ""),
    preferredDate2: String(formData.get("preferredDate2") || ""),
    timeOfDay: String(formData.get("timeOfDay") || ""),
    consent: formData.get("consent") === "on" || formData.get("consent") === "true",
  };

  const errors = validateBookingInput(input);
  if (errors.length) return { ok: false, errors };

  // 대상 병원 검증(공개·존재)
  const hospitals = await db.hospital.findMany({ where: { id: { in: input.hospitalIds }, isPublished: true } });
  if (hospitals.length === 0) return { ok: false, errors: ["hospital: 유효한 병원이 없습니다."] };

  const photo = await uploadBookingPhoto(formData.get("photo") as File | null);
  const multiple = hospitals.length > 1;
  const groupId = multiple ? crypto.randomUUID() : null;

  const created: { code: string; hospitalId: string }[] = [];
  for (const h of hospitals) {
    const code = makeBookingCode();
    await db.booking.create({
      data: {
        code, locale: input.locale, groupId, hospitalId: h.id,
        name: input.name, phone: input.phone, nationality: input.nationality,
        email: input.email || null, age: input.age, gender: input.gender || null,
        messengerChannel: input.messengerChannel || null, messengerHandle: input.messengerHandle || null,
        treatmentInterest: input.treatmentInterest || null, memo: input.memo || null, photo,
        preferredDate1: new Date(input.preferredDate1),
        preferredDate2: input.preferredDate2 ? new Date(input.preferredDate2) : null,
        timeOfDay: input.timeOfDay, consent: input.consent,
      },
    });
    created.push({ code, hospitalId: h.id });
  }

  // 알림(best-effort)
  const hospitalsById: Record<string, { name: string; email: string }> = {};
  for (const h of hospitals) {
    const msg = (h.messengers as any) || {};
    hospitalsById[h.id] = { name: resolveText(h.name, input.locale), email: typeof msg.email === "string" ? msg.email : "" };
  }
  const notifyRows = created.map((c) => ({
    ...input, code: c.code, hospitalId: c.hospitalId,
    preferredDate2: input.preferredDate2,
  }));
  await sendBookingNotifications(notifyRows as any, hospitalsById);

  if (groupId) redirect(`/booking/success?group=${groupId}`);
  redirect(`/booking/success?code=${created[0].code}`);
}
```

- [ ] **Step 3: BookingForm (client)**

Create `components/booking/BookingForm.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createBooking } from "@/app/[locale]/booking/actions";
import { MESSENGER_CHANNELS, GENDERS } from "@/lib/booking/types";

export default function BookingForm({ hospitalIds, hospitalNames }: { hospitalIds: string[]; hospitalNames: string[] }) {
  const t = useTranslations("Booking");
  const locale = useLocale();
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const fd = new FormData(e.currentTarget);
    fd.set("hospitalIds", hospitalIds.join(","));
    fd.set("locale", locale);
    const res = await createBooking(fd);
    // 성공 시 서버액션이 redirect → 여기 도달 안 함. 에러만 처리.
    setSaving(false);
    if (res && !res.ok) setErrors(res.errors);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 bg-white p-6 rounded-2xl border">
      <div className="text-sm text-gray-500">{t("forHospitals")}: <b>{hospitalNames.join(", ")}</b></div>
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
          {errors.map((er, i) => <div key={i}>• {er}</div>)}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-bold">{t("name")}<input name="name" required className="w-full border p-2 rounded mt-1" /></label>
        <label className="text-sm font-bold">{t("phone")}<input name="phone" required className="w-full border p-2 rounded mt-1" /></label>
        <label className="text-sm font-bold">{t("nationality")}<input name="nationality" required className="w-full border p-2 rounded mt-1" /></label>
        <label className="text-sm font-bold">{t("email")}<input name="email" type="email" className="w-full border p-2 rounded mt-1" /></label>
        <label className="text-sm font-bold">{t("age")}<input name="age" type="number" className="w-full border p-2 rounded mt-1" /></label>
        <label className="text-sm font-bold">{t("gender")}
          <select name="gender" className="w-full border p-2 rounded mt-1 bg-white">
            <option value="">-</option>
            {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">{t("messenger")}
          <select name="messengerChannel" className="w-full border p-2 rounded mt-1 bg-white">
            <option value="">-</option>
            {MESSENGER_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">{t("handle")}<input name="messengerHandle" className="w-full border p-2 rounded mt-1" /></label>
      </div>
      <label className="text-sm font-bold block">{t("interest")}<input name="treatmentInterest" className="w-full border p-2 rounded mt-1" /></label>
      <label className="text-sm font-bold block">{t("memo")}<textarea name="memo" className="w-full border p-2 rounded mt-1 h-20" /></label>
      <label className="text-sm font-bold block">{t("photo")}<input name="photo" type="file" accept="image/*" className="w-full border p-2 rounded mt-1" /></label>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm font-bold">{t("date1")}<input name="preferredDate1" type="date" required className="w-full border p-2 rounded mt-1" /></label>
        <label className="text-sm font-bold">{t("date2")}<input name="preferredDate2" type="date" className="w-full border p-2 rounded mt-1" /></label>
        <label className="text-sm font-bold">{t("timeOfDay")}
          <select name="timeOfDay" required defaultValue="MORNING" className="w-full border p-2 rounded mt-1 bg-white">
            <option value="MORNING">{t("morning")}</option>
            <option value="AFTERNOON">{t("afternoon")}</option>
            <option value="EVENING">{t("evening")}</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input name="consent" type="checkbox" /> {t("consent")}</label>
      <p className="text-xs text-gray-400">{t("notConfirmed")}</p>
      <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl disabled:opacity-50">{saving ? t("submitting") : t("submit")}</button>
    </form>
  );
}
```

- [ ] **Step 4: 예약 페이지 (server)**

Create `app/[locale]/booking/page.tsx`:
```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { parseHospitalIds } from "@/lib/booking/ids";
import BookingForm from "@/components/booking/BookingForm";
import { Link } from "@/i18n/navigation";

export default async function BookingPage({
  params, searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ hospital?: string; hospitals?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("Booking");
  const ids = parseHospitalIds(sp);
  const rows = ids.length ? await db.hospital.findMany({ where: { id: { in: ids }, isPublished: true } }) : [];
  const ordered = ids.map((id) => rows.find((h) => h.id === id)).filter(Boolean) as typeof rows;

  if (ordered.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 mb-6">{t("forHospitals")}: -</p>
        <Link href="/hospitals" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">{t("backHome")}</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>
      <BookingForm hospitalIds={ordered.map((h) => h.id)} hospitalNames={ordered.map((h) => resolveText(h.name, locale))} />
    </div>
  );
}
```

- [ ] **Step 5: 빌드 + 커밋**

Run: `npm run build` (성공). `/[locale]/booking` 라우트 확인.
```bash
git add messages components/booking "app/[locale]/booking/page.tsx" "app/[locale]/booking/actions.ts"
git commit -m "feat(booking): 예약 폼 + 생성 액션(검증·Blob·다중 groupId·알림) + 4언어 메시지"
```

---

## Task 9: 예약 성공 페이지

**Files:**
- Create: `app/[locale]/booking/success/page.tsx`

- [ ] **Step 1: 성공 페이지**

Create `app/[locale]/booking/success/page.tsx`:
```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { Link } from "@/i18n/navigation";

export default async function BookingSuccessPage({
  params, searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ code?: string; group?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { code, group } = await searchParams;
  const t = await getTranslations("Booking");

  const bookings = group
    ? await db.booking.findMany({ where: { groupId: group }, include: { hospital: true } })
    : code
    ? await db.booking.findMany({ where: { code }, include: { hospital: true } })
    : [];

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">✓</div>
      <h1 className="text-2xl font-bold mb-3">{t("successTitle")}</h1>
      <p className="text-sm text-gray-500 mb-6">{t("notConfirmed")}</p>
      <div className="bg-white border rounded-xl p-5 mb-6 text-left">
        {bookings.length === 0 ? (
          <p className="text-gray-400">-</p>
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="flex justify-between border-b border-gray-50 py-2 last:border-0">
              <span className="text-gray-700">{resolveText(b.hospital.name, locale)}</span>
              <span className="font-bold text-blue-600">{t("yourCode")}: {b.code}</span>
            </div>
          ))
        )}
      </div>
      {bookings.some((b) => b.email) && <p className="text-xs text-gray-400 mb-6">{t("emailedNote")}</p>}
      <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">{t("backHome")}</Link>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 + 커밋**

Run: `npm run build` (성공)
```bash
git add "app/[locale]/booking/success/page.tsx"
git commit -m "feat(booking): 예약 성공 페이지(추적코드·그룹 요약)"
```

---

## Task 10: 관리자 예약 관리 (파이프라인)

**Files:**
- Create: `app/admin/booking-actions.ts`
- Create: `app/admin/(protected)/bookings/page.tsx`
- Modify: `app/admin/(protected)/layout.tsx`, `app/admin/(protected)/page.tsx`

- [ ] **Step 1: 상태 변경 액션**

Create `app/admin/booking-actions.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth-actions";
import { canTransition } from "@/lib/booking/status";

export async function updateBookingStatus(id: string, next: string): Promise<void> {
  await requireAdmin();
  const b = await db.booking.findUnique({ where: { id } });
  if (!b) return;
  if (!canTransition(b.status, next)) {
    console.warn(`[booking] 잘못된 전이 ${b.status}→${next}`);
    return;
  }
  await db.booking.update({ where: { id }, data: { status: next } });
  revalidatePath("/admin/bookings");
}
```

- [ ] **Step 2: 관리자 예약 목록 + 파이프라인**

Create `app/admin/(protected)/bookings/page.tsx`:
```tsx
import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { canTransition, BOOKING_STATUSES } from "@/lib/booking/status";
import { updateBookingStatus } from "@/app/admin/booking-actions";

const STATUS_LABEL: Record<string, string> = { NEW: "접수", CONFIRMED: "상담확정", VISITED: "내원", DONE: "완료", CANCELLED: "취소" };

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const where = status && (BOOKING_STATUSES as readonly string[]).includes(status) ? { status } : {};
  const bookings = await db.booking.findMany({ where, orderBy: { createdAt: "desc" }, include: { hospital: true } });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">예약 관리</h1>
      <div className="flex gap-2 mb-6 text-sm">
        <a href="/admin/bookings" className={`px-3 py-1 rounded-full ${!status ? "bg-gray-900 text-white" : "bg-gray-100"}`}>전체</a>
        {BOOKING_STATUSES.map((s) => (
          <a key={s} href={`/admin/bookings?status=${s}`} className={`px-3 py-1 rounded-full ${status === s ? "bg-gray-900 text-white" : "bg-gray-100"}`}>{STATUS_LABEL[s]}</a>
        ))}
      </div>
      <div className="space-y-3">
        {bookings.length === 0 && <p className="text-gray-400">예약이 없습니다.</p>}
        {bookings.map((b) => (
          <div key={b.id} className="bg-white border rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold">{b.name} <span className="text-xs text-gray-400">{b.nationality} · {b.code}</span></div>
                <div className="text-sm text-gray-500">{resolveText(b.hospital.name, "ko")} · {STATUS_LABEL[b.status] ?? b.status}</div>
                <div className="text-sm text-gray-500">희망: {new Date(b.preferredDate1).toLocaleDateString()}{b.preferredDate2 ? ` / ${new Date(b.preferredDate2).toLocaleDateString()}` : ""} ({b.timeOfDay})</div>
                <div className="text-sm text-gray-500">연락: {b.phone}{b.messengerChannel ? ` · ${b.messengerChannel}:${b.messengerHandle ?? ""}` : ""}{b.email ? ` · ${b.email}` : ""}</div>
                {b.treatmentInterest && <div className="text-sm text-gray-600 mt-1">관심: {b.treatmentInterest}</div>}
                {b.memo && <div className="text-sm text-gray-600">메모: {b.memo}</div>}
                {b.photo && <a href={b.photo} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">첨부사진</a>}
                {b.groupId && <span className="text-xs text-gray-400 ml-2">[묶음]</span>}
              </div>
              <div className="flex flex-col gap-1">
                {BOOKING_STATUSES.filter((s) => canTransition(b.status, s)).map((s) => (
                  <form key={s} action={updateBookingStatus.bind(null, b.id, s)}>
                    <button className="text-xs px-3 py-1 rounded bg-blue-50 text-blue-700 w-full">{STATUS_LABEL[s]}</button>
                  </form>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 네비에 "예약" 추가**

`app/admin/(protected)/layout.tsx`의 `<nav>` 안, "병원관리" 링크 다음에 추가:
```tsx
          <Link href="/admin/bookings" className="hover:text-blue-600">예약</Link>
```

- [ ] **Step 4: 대시보드 NEW 카운트**

`app/admin/(protected)/page.tsx`의 `Promise.all([...])`에 booking 카운트를 추가하고 카드 추가. `const [hospitals, published, consultations]` 부분을:
```tsx
  const [hospitals, published, consultations, newBookings] = await Promise.all([
    db.hospital.count(),
    db.hospital.count({ where: { isPublished: true } }),
    db.consultation.count(),
    db.booking.count({ where: { status: "NEW" } }),
  ]);
```
그리고 `cards` 배열에 추가:
```tsx
    { label: "신규 예약", value: newBookings, href: "/admin/bookings?status=NEW" },
```

- [ ] **Step 5: 빌드 + 커밋**

Run: `npm run build` (성공). `/admin/bookings` 라우트 확인.
```bash
git add app/admin/booking-actions.ts "app/admin/(protected)/bookings/page.tsx" "app/admin/(protected)/layout.tsx" "app/admin/(protected)/page.tsx"
git commit -m "feat(admin): 예약 관리 파이프라인(상태전이 가드) + 네비·대시보드 NEW 카운트"
```

---

## Task 11: 환자 진입점 배선 (상세/비교/카트 → 예약)

**Files:**
- Modify: `app/[locale]/hospitals/[id]/page.tsx`, `app/[locale]/compare/page.tsx`, `components/HospitalMainSection.tsx`

- [ ] **Step 1: 상세 페이지 "예약하기"**

`app/[locale]/hospitals/[id]/page.tsx`에서 하단 고정 CTA(기존 "이 병원 상담 신청하기" 또는 홈 링크)를 예약으로 교체. 해당 `<Link href="/" ...>` 또는 상담 링크를 찾아 `<Link href={\`/booking?hospital=${hospital.id}\`} ...>`로 바꾸고 라벨을 `예약하기`(또는 `getTranslations("Booking")`의 `title`)로 변경. import한 i18n `Link` 사용. 정확히 한 곳(하단 고정 바)만 변경.

- [ ] **Step 2: 비교 페이지 CTA → 예약**

`app/[locale]/compare/page.tsx`에서 각 병원 열의 consult CTA:
```tsx
<Link href="/consult" ...>{t("consultCta")}</Link>
```
를 예약으로 변경:
```tsx
<Link href={`/booking?hospital=${h.id}`} className="inline-block mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-blue-700">{t("consultCta")}</Link>
```
(라벨은 기존 `Compare.consultCta` 유지 — "상담 신청"/"Consult" 의미 그대로, 목적지만 예약 폼.)

- [ ] **Step 2b: 카트 전체 → 다중 예약 버튼**

`components/HospitalMainSection.tsx`의 카트 바에서 "비교견적 받기"(현재 `/compare`로 push) 버튼 옆에 "예약요청" 버튼을 추가. 비교 버튼은 유지하고, 그 옆에:
```tsx
               <button onClick={() => router.push(`/booking?hospitals=${compareList.join(",")}`)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:bg-blue-700">
                 예약요청
               </button>
```
(`router`는 이미 `@/i18n/navigation`에서 import됨.)

- [ ] **Step 3: 빌드 + 수동 확인**

Run: `npm run build` (성공)
Run: `npm run dev` 후 `/ko/hospitals/<id>`에서 예약하기 → `/ko/booking?hospital=<id>` 폼 노출, `/ko/compare?ids=...`에서 예약 CTA, 홈 카트에서 예약요청 버튼 확인.

- [ ] **Step 4: 커밋**

```bash
git add "app/[locale]/hospitals/[id]/page.tsx" "app/[locale]/compare/page.tsx" components/HospitalMainSection.tsx
git commit -m "feat(booking): 상세·비교·카트 진입점을 예약 폼으로 배선"
```

---

## Task 12: 통합 검증 + 마무리

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 전부 PASS. 카운트 요약(기존 44 + status 9 + validation 10 + ids 7 + code 2 + templates 5 = 77 근사).

- [ ] **Step 2: 전체 빌드 + 라우트**

Run: `npm run build`
Expected: 성공. `/[locale]/booking`, `/[locale]/booking/success`, `/admin/bookings` 포함. 중복 없음.

- [ ] **Step 3: 예약 생성 스모크(서버 경로 직접 검증)**

`/tmp/bk.mjs` 작성 후 `node /tmp/bk.mjs` — 예약 1건을 Prisma로 직접 생성·조회·상태전이 확인(액션 우회, DB 계약 검증):
```js
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const h = await db.hospital.findFirst({ where: { isPublished: true } });
  if (!h) throw new Error("no hospital");
  const b = await db.booking.create({ data: {
    code: "RDB-TEST01", hospitalId: h.id, name: "Smoke", phone: "+8210", nationality: "US",
    preferredDate1: new Date("2026-07-01"), timeOfDay: "MORNING", consent: true,
  }});
  console.log("created:", b.code, b.status);
  const got = await db.booking.findUnique({ where: { id: b.id }, include: { hospital: true } });
  console.log("hospital:", got.hospital.slug, "| status:", got.status);
  await db.booking.delete({ where: { id: b.id } });
  console.log("SMOKE OK (cleaned up)");
  await db.$disconnect();
}
main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
```
Expected: "SMOKE OK". /tmp 파일 삭제.

- [ ] **Step 4: env 부재 graceful 확인(단위)**

Run: `node -e "process.env.RESEND_API_KEY='';process.env.TELEGRAM_BOT_TOKEN='';import('./lib/notify/email.ts').catch(()=>{})" 2>/dev/null || true`
(빌드 산출물 기준이 어려우면 생략 가능) — 핵심은 키 없을 때 어댑터가 throw 없이 `{skipped:true}` 반환함을 코드 리뷰로 확인. 빌드가 통과하면 import 경로는 정상.

- [ ] **Step 5: 수동 UAT 체크리스트(사람이 `npm run dev`)**

1. 상세 "예약하기" → 예약 폼, 동의 미체크 제출 → 에러.
2. 필수+동의 입력 + (선택)사진 → 제출 → 성공 페이지에 추적코드.
3. 카트 3곳 → "예약요청" → 다중 폼 → 제출 → 성공에 병원별 코드(그룹).
4. `/admin/bookings` 신규 예약 노출, 상태버튼(허용 전이만) → NEW→CONFIRMED→VISITED→DONE 진행, 역행 버튼 없음.
5. 대시보드 "신규 예약" 카운트 반영.
6. (env 등록 시) 환자 이메일·관리자 텔레그램·병원 이메일 수신 확인. 미등록이면 예약은 되고 알림만 스킵.
7. 비회귀: 기존 비교/필터/관리자 CRUD 정상.

- [ ] **Step 6: 커밋(있으면)**

검증 중 수정 없으면 커밋 생략.

---

## Self-Review 결과 (작성자 점검)

**1. Spec 커버리지**
- Booking 모델 → Task 7 ✅ / 상태전이 → Task 1, 관리자 Task 10 ✅
- 검증·동의 → Task 2 ✅ / ids·코드 → Task 3 ✅
- 단일+다중(groupId) → Task 8 액션 ✅ / 희망일시 1·2지망+시간대 → Task 2 타입·Task 8 폼 ✅
- 사진 Blob → Task 5 + Task 8 액션 ✅
- 알림(환자·관리자·병원, 이메일+텔레그램, graceful) → Task 4 템플릿 + Task 6 어댑터/팬아웃 + Task 8 액션 호출 ✅
- 관리자 파이프라인·대시보드 → Task 10 ✅
- 진입점 → Task 11 ✅ / i18n Booking → Task 8 메시지 ✅
- 동의·법규 문구 → Task 8 폼(consent, notConfirmed) ✅
- env graceful → Task 5/6 어댑터 skip ✅

**2. Placeholder 스캔:** 모든 코드 스텝에 실제 코드. "생략 가능"은 Task 12 Step 4(보조 검증)뿐 — 핵심 검증은 빌드+리뷰로 명시. ✅

**3. 타입 일관성:** `BookingInput`(types.ts) 필드가 validation·액션·폼 전반 일치. `canTransition`/`BOOKING_STATUSES`(status.ts) 관리자·액션 일치. `parseHospitalIds`·`makeBookingCode`·`uploadBookingPhoto`·`sendBookingNotifications`·`patientEmail/adminMessage/hospitalEmail` 명칭 정의=사용 일치. 알림 팬아웃의 `BookingLike`는 액션에서 input+code+hospitalId로 구성해 충족. ✅

> 주의(구현 시): Task 8 액션이 `notifyRows`를 `as any`로 넘긴다 — `BookingLike` 필드(code/name/phone/nationality/preferredDate1/preferredDate2/timeOfDay/treatmentInterest/memo/messengerChannel/messengerHandle/email)가 input에 모두 존재하므로 런타임 안전. 리뷰에서 타입 정합 확인 권장.
