# PooGGo Global Hub — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 외국인환자 ↔ 병원 허브의 기반으로, 병원 데이터모델을 다국어(KR/EN/CN/JP)·운영시간·메신저·숫자가격으로 확장하고, 코드 하드코딩 대신 쿠키 인증 기반 중앙 관리자 웹 UI에서 병원을 CRUD할 수 있게 한다.

**Architecture:** 다국어 콘텐츠는 Prisma `Json` 컬럼에 `{ko,en,zh,ja}` 형태로 저장. 순수 로직(i18n 폴백/검증, 입력 검증, 세션 토큰)은 `lib/`에 분리해 vitest로 TDD. 관리자 인증은 HMAC 서명 httpOnly 쿠키 + Next route group `(protected)` 레이아웃 가드. 병원 CRUD는 타입드 객체를 받는 서버액션 + 클라이언트 폼(다국어 탭/반복입력).

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Prisma 5 + Neon Postgres, Tailwind 4, vitest(신규), node:crypto.

**참고 설계서:** `docs/superpowers/specs/2026-06-08-pooggo-global-hub-phase1-design.md`

> **마이그레이션 정책(설계서 보완):** 기존 데이터는 재생성 가능한 dev 시드 5건뿐이라, 파괴적 String→Json 백필 대신 **마이그레이션 리셋 + 다국어 시드 재생성**으로 동일 최종상태(5개 병원, 다국어 구조)를 달성한다. 운영 데이터가 없으므로 무손실 목표는 시드 재생성으로 충족.

---

## File Structure

**신규 (순수 로직 — TDD 대상)**
- `vitest.config.ts` — 테스트 러너 + `@` alias
- `lib/i18n/types.ts` — `Lang`, `I18nText`, 상수
- `lib/i18n/text.ts` — `toI18n`, `resolveText`, `isCompleteI18n`
- `lib/i18n/text.test.ts`
- `lib/hospital/types.ts` — `HospitalInput`, `OperatingHours`, `Messengers` 등
- `lib/hospital/validation.ts` — `validateHospitalInput`, `HOSPITAL_CATEGORIES`
- `lib/hospital/validation.test.ts`
- `lib/auth.ts` — `createToken`, `verifyToken`, `ADMIN_COOKIE`
- `lib/auth.test.ts`

**신규 (관리자)**
- `app/admin/auth-actions.ts` — `login`, `logout`, `requireAdmin`
- `app/admin/login/page.tsx` — 로그인 폼 (가드 밖)
- `app/admin/hospital-actions.ts` — `createHospital`, `updateHospital`, `deleteHospital`, `togglePublish`
- `app/admin/(protected)/layout.tsx` — 인증 가드 + 네비
- `app/admin/(protected)/page.tsx` — 대시보드 (`/admin`)
- `app/admin/(protected)/hospitals/page.tsx` — 병원 목록
- `app/admin/(protected)/hospitals/new/page.tsx`
- `app/admin/(protected)/hospitals/[id]/edit/page.tsx`
- `app/admin/(protected)/consultations/page.tsx` — 기존 상담내역 이전
- `components/admin/I18nField.tsx` — 다국어 4탭 입력 위젯
- `components/admin/HospitalForm.tsx` — 병원 통합 폼

**수정**
- `prisma/schema.prisma` — Hospital/Doctor/Menu 확장
- `prisma/seed.ts` — 다국어 시드 재작성
- `package.json` — `test` 스크립트
- `app/actions.ts` — `getHospitals` select 갱신 + 구 `seedInitialHospitals` 제거
- `components/HospitalMainSection.tsx` — Json 필드 `resolveText` 렌더
- `app/hospitals/[id]/page.tsx` — Json 필드 `resolveText` 렌더
- `app/hospitals/page.tsx` — 동일 점검
- `app/layout.tsx` — metadata 정리
- 삭제: `prisma/dev.db`, `app/admin/page.tsx`(구), `app/admin/actions.ts`(구 — consultations 이전 후)

---

## Task 1: 테스트 인프라 + i18n 순수 로직 (TDD)

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts)
- Create: `lib/i18n/types.ts`
- Create: `lib/i18n/text.ts`
- Test: `lib/i18n/text.test.ts`

- [ ] **Step 1: vitest 설치**

Run: `npm i -D vitest`
Expected: 설치 성공, package.json devDependencies에 vitest 추가.

- [ ] **Step 2: vitest 설정 + test 스크립트 작성**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: { environment: "node" },
});
```

`package.json`의 `scripts`에 추가:
```json
"test": "vitest run"
```

- [ ] **Step 3: i18n 타입 작성**

Create `lib/i18n/types.ts`:
```ts
export const LANGS = ["ko", "en", "zh", "ja"] as const;
export type Lang = (typeof LANGS)[number];
export type I18nText = Record<Lang, string>;

export const EMPTY_I18N: I18nText = { ko: "", en: "", zh: "", ja: "" };
```

- [ ] **Step 4: 실패하는 테스트 작성**

Create `lib/i18n/text.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { toI18n, resolveText, isCompleteI18n } from "./text";

describe("toI18n", () => {
  it("정상 객체를 그대로 정규화", () => {
    expect(toI18n({ ko: "가", en: "a", zh: "啊", ja: "あ" })).toEqual({ ko: "가", en: "a", zh: "啊", ja: "あ" });
  });
  it("누락/이상 값은 빈 문자열로", () => {
    expect(toI18n(null)).toEqual({ ko: "", en: "", zh: "", ja: "" });
    expect(toI18n({ ko: "가", en: 123 })).toEqual({ ko: "가", en: "", zh: "", ja: "" });
  });
});

describe("resolveText", () => {
  const v = { ko: "가", en: "a", zh: "", ja: "" };
  it("해당 언어 우선", () => expect(resolveText(v, "ko")).toBe("가"));
  it("없으면 en 폴백", () => expect(resolveText(v, "zh")).toBe("a"));
  it("en도 없으면 ko 폴백", () => expect(resolveText({ ko: "가", en: "", zh: "", ja: "" }, "ja")).toBe("가"));
});

describe("isCompleteI18n", () => {
  it("4개 모두 있으면 true", () => expect(isCompleteI18n({ ko: "가", en: "a", zh: "啊", ja: "あ" })).toBe(true));
  it("하나라도 비면 false", () => expect(isCompleteI18n({ ko: "가", en: "a", zh: "啊", ja: "" })).toBe(false));
  it("공백만 있으면 false", () => expect(isCompleteI18n({ ko: " ", en: "a", zh: "啊", ja: "あ" })).toBe(false));
});
```

- [ ] **Step 5: 테스트 실패 확인**

Run: `npm test -- lib/i18n/text.test.ts`
Expected: FAIL — `./text` 모듈 없음.

- [ ] **Step 6: 구현 작성**

Create `lib/i18n/text.ts`:
```ts
import { LANGS, type I18nText, type Lang } from "./types";

export function toI18n(value: unknown): I18nText {
  const v = (value ?? {}) as Partial<Record<Lang, unknown>>;
  return {
    ko: typeof v.ko === "string" ? v.ko : "",
    en: typeof v.en === "string" ? v.en : "",
    zh: typeof v.zh === "string" ? v.zh : "",
    ja: typeof v.ja === "string" ? v.ja : "",
  };
}

export function resolveText(value: unknown, lang: Lang): string {
  const t = toI18n(value);
  return t[lang] || t.en || t.ko || "";
}

export function isCompleteI18n(value: unknown): boolean {
  const t = toI18n(value);
  return LANGS.every((l) => t[l].trim().length > 0);
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npm test -- lib/i18n/text.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 8: 커밋**

```bash
git add vitest.config.ts package.json package-lock.json lib/i18n/
git commit -m "feat: vitest 도입 + i18n 다국어 헬퍼(toI18n/resolveText/isCompleteI18n)"
```

---

## Task 2: 병원 도메인 타입 + 입력 검증 (TDD)

**Files:**
- Create: `lib/hospital/types.ts`
- Create: `lib/hospital/validation.ts`
- Test: `lib/hospital/validation.test.ts`

- [ ] **Step 1: 도메인 타입 작성**

Create `lib/hospital/types.ts`:
```ts
import type { I18nText } from "@/lib/i18n/types";

export type DayHours = { open: string; close: string; closed: boolean };
export type OperatingHours = {
  mon: DayHours; tue: DayHours; wed: DayHours; thu: DayHours;
  fri: DayHours; sat: DayHours; sun: DayHours;
  note: I18nText;
};

export type Messengers = {
  whatsapp: string; line: string; wechat: string; kakao: string;
  messenger: string; phone: string; email: string;
};

export type DoctorInput = { name: I18nText; specialty: I18nText; image: string; order: number };
export type MenuInput = {
  name: I18nText; category: string;
  price: number | null; priceText: I18nText; currency: string; order: number;
};

export type HospitalInput = {
  slug: string;
  name: I18nText; intro: I18nText; about: I18nText; address: I18nText;
  cautions: I18nText;
  city: string; district: string; category: string; tags: string;
  image: string; images: string[];
  operatingHours: OperatingHours;
  messengers: Messengers;
  isPublished: boolean;
  doctors: DoctorInput[];
  menus: MenuInput[];
};
```

- [ ] **Step 2: 실패하는 테스트 작성**

Create `lib/hospital/validation.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { validateHospitalInput, HOSPITAL_CATEGORIES } from "./validation";
import type { HospitalInput } from "./types";
import { EMPTY_I18N } from "@/lib/i18n/types";

const full = (s: string) => ({ ko: s, en: s, zh: s, ja: s });
const baseHours = { open: "10:00", close: "19:00", closed: false };

function valid(): HospitalInput {
  return {
    slug: "rejuel-gangnam",
    name: full("리쥬엘"), intro: full("소개"), about: full("상세"), address: full("주소"),
    cautions: full("주의사항"),
    city: "Seoul", district: "Gangnam-gu", category: "DERMA", tags: "리프팅",
    image: "https://x/y.jpg", images: [],
    operatingHours: { mon: baseHours, tue: baseHours, wed: baseHours, thu: baseHours, fri: baseHours, sat: baseHours, sun: { open: "", close: "", closed: true }, note: full("휴무") },
    messengers: { whatsapp: "", line: "", wechat: "", kakao: "", messenger: "", phone: "", email: "" },
    isPublished: true,
    doctors: [{ name: full("원장"), specialty: full("피부과"), image: "", order: 0 }],
    menus: [{ name: full("슈링크"), category: "LIFTING", price: 150000, priceText: full("150,000 KRW~"), currency: "KRW", order: 0 }],
  };
}

describe("validateHospitalInput", () => {
  it("완전한 입력은 에러 없음", () => {
    expect(validateHospitalInput(valid())).toEqual([]);
  });
  it("slug 누락 시 에러", () => {
    const v = valid(); v.slug = "";
    expect(validateHospitalInput(v).some((e) => e.includes("slug"))).toBe(true);
  });
  it("다국어 한 언어 누락 시 에러", () => {
    const v = valid(); v.name = { ...v.name, ja: "" };
    expect(validateHospitalInput(v).some((e) => e.includes("name"))).toBe(true);
  });
  it("잘못된 category 에러", () => {
    const v = valid(); v.category = "WRONG";
    expect(validateHospitalInput(v).some((e) => e.includes("category"))).toBe(true);
  });
  it("의료진 전문분야 누락 에러", () => {
    const v = valid(); v.doctors[0].specialty = EMPTY_I18N;
    expect(validateHospitalInput(v).some((e) => e.includes("의료진"))).toBe(true);
  });
  it("시술 가격표기 누락 에러", () => {
    const v = valid(); v.menus[0].priceText = EMPTY_I18N;
    expect(validateHospitalInput(v).some((e) => e.includes("시술"))).toBe(true);
  });
  it("카테고리 상수는 6종", () => {
    expect(HOSPITAL_CATEGORIES.length).toBe(6);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test -- lib/hospital/validation.test.ts`
Expected: FAIL — `./validation` 없음.

- [ ] **Step 4: 구현 작성**

Create `lib/hospital/validation.ts`:
```ts
import { isCompleteI18n } from "@/lib/i18n/text";
import type { HospitalInput } from "./types";

export const HOSPITAL_CATEGORIES = ["PLASTIC", "DERMA", "DENTAL", "OPHTHALMOLOGY", "HAIR", "ETC"] as const;
export type HospitalCategory = (typeof HOSPITAL_CATEGORIES)[number];

export function validateHospitalInput(input: HospitalInput): string[] {
  const errors: string[] = [];
  if (!input.slug.trim()) errors.push("slug는 필수입니다.");
  if (!input.city.trim()) errors.push("city는 필수입니다.");
  if (!input.district.trim()) errors.push("district는 필수입니다.");
  if (!HOSPITAL_CATEGORIES.includes(input.category as HospitalCategory)) errors.push("category가 올바르지 않습니다.");

  const i18nFields: [string, unknown][] = [
    ["name", input.name], ["intro", input.intro], ["about", input.about],
    ["address", input.address], ["cautions", input.cautions],
  ];
  for (const [key, val] of i18nFields) {
    if (!isCompleteI18n(val)) errors.push(`${key}: 4개 언어(KR/EN/CN/JP) 모두 입력해야 합니다.`);
  }

  input.doctors.forEach((d, i) => {
    if (!isCompleteI18n(d.name)) errors.push(`의료진 ${i + 1}: 이름 4개 언어 필수`);
    if (!isCompleteI18n(d.specialty)) errors.push(`의료진 ${i + 1}: 전문분야 4개 언어 필수`);
  });
  input.menus.forEach((m, i) => {
    if (!isCompleteI18n(m.name)) errors.push(`시술 ${i + 1}: 시술명 4개 언어 필수`);
    if (!isCompleteI18n(m.priceText)) errors.push(`시술 ${i + 1}: 가격표기 4개 언어 필수`);
  });
  return errors;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- lib/hospital/validation.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: 커밋**

```bash
git add lib/hospital/
git commit -m "feat: 병원 입력 도메인 타입 + 4언어 필수 검증(validateHospitalInput)"
```

---

## Task 3: Prisma 스키마 확장 + 마이그레이션 + 다국어 시드

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Delete: `prisma/dev.db`

- [ ] **Step 1: Hospital 모델 교체**

`prisma/schema.prisma`의 `model Hospital { ... }` 블록 전체를 아래로 교체:
```prisma
model Hospital {
  id        String   @id @default(uuid())
  slug      String   @unique

  name      Json
  intro     Json
  about     Json
  address   Json
  cautions  Json

  city      String
  district  String
  lat       Float?
  lng       Float?

  category  String
  tags      String

  image     String
  images    String[]

  rating    Float    @default(0)
  reviews   Int      @default(0)

  operatingHours Json
  messengers     Json

  isPublished Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  doctors     Doctor[]
  menus       Menu[]
  userReviews Review[]
  treatments  Treatment[]
  leads       Lead[]
}
```

- [ ] **Step 2: Doctor 모델 교체**

`model Doctor { ... }`를 아래로 교체:
```prisma
model Doctor {
  id         String   @id @default(uuid())
  name       Json
  specialty  Json
  image      String?
  order      Int      @default(0)
  hospitalId String
  hospital   Hospital @relation(fields: [hospitalId], references: [id])
}
```

- [ ] **Step 3: Menu 모델 교체**

`model Menu { ... }`를 아래로 교체:
```prisma
model Menu {
  id         String   @id @default(uuid())
  name       Json
  category   String   @default("ETC")
  price      Int?
  priceText  Json
  currency   String   @default("KRW")
  order      Int      @default(0)
  hospitalId String
  hospital   Hospital @relation(fields: [hospitalId], references: [id])
}
```

- [ ] **Step 4: 다국어 시드 재작성**

`prisma/seed.ts` 전체를 아래로 교체:
```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const t = (ko: string, en: string, zh: string, ja: string) => ({ ko, en, zh, ja });

const hours = {
  mon: { open: "10:00", close: "19:00", closed: false },
  tue: { open: "10:00", close: "19:00", closed: false },
  wed: { open: "10:00", close: "19:00", closed: false },
  thu: { open: "10:00", close: "21:00", closed: false },
  fri: { open: "10:00", close: "19:00", closed: false },
  sat: { open: "10:00", close: "16:00", closed: false },
  sun: { open: "", close: "", closed: true },
  note: t("일요일·공휴일 휴무", "Closed on Sundays & holidays", "周日及节假日休息", "日曜・祝日休診"),
};

async function main() {
  await prisma.menu.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.review.deleteMany();
  await prisma.hospital.deleteMany();

  await prisma.hospital.create({
    data: {
      slug: "rejuel-gangnam",
      name: t("리쥬엘의원 강남점", "Rejuel Clinic Gangnam", "丽珠尔医院江南店", "リジュエルクリニック江南店"),
      intro: t("프리미엄 피부 솔루션", "Premium skin solutions", "高端皮肤护理方案", "プレミアムスキンソリューション"),
      about: t("리쥬엘은 피부 안티에이징 전문 의원입니다.", "Rejuel specializes in skin anti-aging.", "丽珠尔专注于皮肤抗衰老。", "リジュエルは肌のアンチエイジング専門院です。"),
      address: t("서울 강남구 강남대로 123", "123 Gangnam-daero, Gangnam-gu, Seoul", "首尔江南区江南大路123", "ソウル江南区江南大路123"),
      cautions: t("시술 후 부기·멍이 생길 수 있습니다. 전문의 상담이 필요합니다.", "Swelling/bruising may occur. Consult a specialist.", "术后可能出现肿胀和淤青，需专业咨询。", "施術後に腫れ・内出血が生じる場合があります。専門医の相談が必要です。"),
      city: "Seoul", district: "Gangnam-gu", category: "DERMA",
      tags: "리프팅,피부관리,보톡스",
      image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80",
      images: [], rating: 4.9, reviews: 152,
      operatingHours: hours,
      messengers: { whatsapp: "+821012345678", line: "@rejuel", wechat: "rejuel_kr", kakao: "http://pf.kakao.com/_rejuel", messenger: "", phone: "+821012345678", email: "info@rejuel.kr" },
      isPublished: true,
      doctors: { create: [
        { name: t("신현진 대표원장", "Dr. Shin Hyunjin", "申贤珍院长", "シン・ヒョンジン院長"), specialty: t("피부과 전문의 / 안티에이징", "Dermatologist / Anti-aging", "皮肤科专家/抗衰老", "皮膚科専門医／アンチエイジング"), order: 0 },
      ] },
      menus: { create: [
        { name: t("슈링크 유니버스 300샷", "Shurink Universe 300 shots", "Shurink Universe 300发", "シュリンクユニバース300ショット"), category: "LIFTING", price: 150000, priceText: t("150,000원", "150,000 KRW", "150,000韩元", "150,000ウォン"), currency: "KRW", order: 0 },
      ] },
    },
  });

  await prisma.hospital.create({
    data: {
      slug: "banobagi",
      name: t("바노바기성형외과", "Banobagi Plastic Surgery", "巴诺巴奇整形外科", "バノバギ整形外科"),
      intro: t("디테일이 다른 아름다움", "Beauty in the details", "细节之美", "ディテールが違う美しさ"),
      about: t("안면윤곽·가슴 성형 중심의 대형 성형외과입니다.", "A large clinic focused on facial contouring and breast surgery.", "专注于面部轮廓和胸部整形的大型整形外科。", "輪郭・豊胸を中心とした大型整形外科です。"),
      address: t("서울 강남구 논현로 808", "808 Nonhyeon-ro, Gangnam-gu, Seoul", "首尔江南区论岘路808", "ソウル江南区論峴路808"),
      cautions: t("전신마취 수술은 위험을 동반합니다. 충분한 상담이 필요합니다.", "General anesthesia carries risks. Sufficient consultation is required.", "全身麻醉手术存在风险，需充分咨询。", "全身麻酔手術にはリスクが伴います。十分な相談が必要です。"),
      city: "Seoul", district: "Gangnam-gu", category: "PLASTIC",
      tags: "안면윤곽,양악수술,가슴성형",
      image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
      images: [], rating: 5.0, reviews: 320,
      operatingHours: hours,
      messengers: { whatsapp: "+821087654321", line: "@banobagi", wechat: "banobagi_cn", kakao: "", messenger: "m.me/banobagi", phone: "+821087654321", email: "global@banobagi.com" },
      isPublished: true,
      doctors: { create: [
        { name: t("반재상 대표원장", "Dr. Ban Jaesang", "潘在尚院长", "バン・ジェサン院長"), specialty: t("성형외과 전문의 / 가슴·바디", "Plastic surgeon / Breast·Body", "整形外科专家/胸部·身体", "形成外科専門医／胸・ボディ"), order: 0 },
      ] },
      menus: { create: [
        { name: t("모티바 가슴성형", "Motiva breast augmentation", "Motiva隆胸", "モティバ豊胸"), category: "BREAST", price: 9000000, priceText: t("900만원~", "9,000,000 KRW~", "900万韩元起", "900万ウォン～"), currency: "KRW", order: 0 },
      ] },
    },
  });

  console.log("🌱 다국어 병원 시드 완료");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
```

> 시드는 대표 2개 병원으로 충분(나머지는 관리자 UI로 입력). 원하면 동일 패턴으로 추가 가능.

- [ ] **Step 5: 마이그레이션 생성 + 적용 (리셋, 시드 자동 실행)**

Run: `npx prisma migrate dev --name global_hub_phase1`
프롬프트가 "데이터 리셋(data loss)"을 물으면 **Yes**로 진행(운영 데이터 없음). 적용이 막히면 대체로:
Run: `npx prisma migrate reset --force`
Expected: 마이그레이션 적용 + `seed.ts` 실행 + "🌱 다국어 병원 시드 완료" 출력.

- [ ] **Step 6: 데이터 확인**

Run: `npx prisma studio` (또는) `node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().hospital.findMany({include:{doctors:true,menus:true}}).then(h=>{console.log(JSON.stringify(h,null,2));process.exit(0)})"`
Expected: 2개 병원이 `name`/`intro` 등 `{ko,en,zh,ja}` 구조 + doctors/menus 포함.

- [ ] **Step 7: dev.db 삭제 + 커밋**

```bash
git rm --cached prisma/dev.db 2>/dev/null; rm -f prisma/dev.db
git add prisma/schema.prisma prisma/seed.ts prisma/migrations/
git commit -m "feat: 병원/의사/시술 스키마 다국어 확장 + 운영시간·메신저 + 다국어 시드"
```

---

## Task 4: 기존 환자화면 호환 (Json 필드 렌더 유지)

스키마 변경으로 기존 화면이 `name`(객체)를 그대로 렌더하면 깨진다. 소비자들을 `resolveText`로 갱신해 사이트가 계속 작동하게 한다. (Phase 2에서 언어 스위처로 본격 적용)

**Files:**
- Modify: `app/actions.ts`
- Modify: `components/HospitalMainSection.tsx`
- Modify: `app/hospitals/[id]/page.tsx`
- Modify: `app/hospitals/page.tsx`

- [ ] **Step 1: `app/actions.ts` 갱신**

`getHospitals`를 아래로 교체(구 `desc`→`intro`, 다국어→ko 문자열로 평탄화):
```ts
import { resolveText } from "@/lib/i18n/text";

export async function getHospitals() {
  try {
    const hospitals = await db.hospital.findMany({
      where: { isPublished: true },
      orderBy: { rating: "desc" },
    });
    return hospitals.map((h) => ({
      id: h.id,
      name: resolveText(h.name, "ko"),
      location: `${h.city}, ${h.district}`,
      tags: h.tags || "",
      rating: h.rating,
      reviews: h.reviews,
      image: h.image || "",
      desc: resolveText(h.intro, "ko"),
    }));
  } catch (error) {
    console.error("병원 목록 로딩 실패:", error);
    return [];
  }
}
```

같은 파일에서 구 `seedInitialHospitals` 함수 **전체 삭제**(구 스키마 참조라 더 이상 유효하지 않음). `getHospitalById`, `addReview`, `createConsultation`은 유지.

- [ ] **Step 2: `app/hospitals/[id]/page.tsx` 갱신**

상단에 import 추가:
```ts
import { resolveText } from "@/lib/i18n/text";
```
Json 필드 렌더 부분을 교체:
- `{hospital.name}` (2곳: sticky 헤더 `truncate`, 히어로 `<h2>`) → `{resolveText(hospital.name, "ko")}`
- `<MapPin .../> {hospital.location}` → `<MapPin .../> {resolveText(hospital.address, "ko")}`
- `<p ...>{hospital.desc}</p>` → `<p ...>{resolveText(hospital.intro, "ko")}</p>`
- 의료진: `{doc.name}` → `{resolveText(doc.name, "ko")}`, `{doc.specialty}` → `{resolveText(doc.specialty, "ko")}`
- 시술가격: `{menu.name}` → `{resolveText(menu.name, "ko")}`, `{menu.price}` → `{resolveText(menu.priceText, "ko")}`
- `img ... alt={hospital.name}` → `alt={resolveText(hospital.name, "ko")}`

- [ ] **Step 3: `components/HospitalMainSection.tsx` 점검**

이 컴포넌트는 `getHospitals()` 결과(이미 평탄화된 문자열)를 쓰므로 추가 변경 불필요. 다만 `hospital.name`, `hospital.desc`, `hospital.location`이 문자열로 들어오는지 확인(Step 1에서 보장). 변경 없음.

- [ ] **Step 4: `app/hospitals/page.tsx` 점검·갱신**

파일을 열어 `name`/`desc`/`location`을 직접 렌더하는 부분이 있으면 `getHospitals()` 결과를 쓰도록(또는 `resolveText` 적용) 맞춘다. `getHospitals()`를 그대로 쓰면 변경 불필요.

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공. (런타임 렌더는 Step 6에서)

- [ ] **Step 6: 수동 동작 확인**

Run: `npm run dev` 후 브라우저에서 `/` 와 `/hospitals/<병원id>` 접속.
Expected: 병원명·소개·주소·의료진·가격이 한국어로 정상 표시(객체 `[object Object]` 노출 없음).

- [ ] **Step 7: 커밋**

```bash
git add app/actions.ts app/hospitals/ components/HospitalMainSection.tsx
git commit -m "fix: 다국어 Json 필드를 환자화면에서 resolveText로 렌더(사이트 호환 유지)"
```

---

## Task 5: 관리자 인증 — 세션 토큰(TDD) + 로그인/가드

**Files:**
- Create: `lib/auth.ts`
- Test: `lib/auth.test.ts`
- Create: `app/admin/auth-actions.ts`
- Create: `app/admin/login/page.tsx`
- Create: `app/admin/(protected)/layout.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `lib/auth.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { createToken, verifyToken } from "./auth";

describe("session token", () => {
  it("발급한 토큰은 검증 통과", () => {
    expect(verifyToken(createToken())).toBe(true);
  });
  it("위조 토큰은 거부", () => {
    expect(verifyToken("garbage.deadbeef")).toBe(false);
  });
  it("undefined는 거부", () => {
    expect(verifyToken(undefined)).toBe(false);
  });
  it("서명 변조 시 거부", () => {
    const tok = createToken();
    const tampered = tok.slice(0, -2) + (tok.endsWith("00") ? "11" : "00");
    expect(verifyToken(tampered)).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- lib/auth.test.ts`
Expected: FAIL — `./auth` 없음.

- [ ] **Step 3: 구현 작성**

Create `lib/auth.ts`:
```ts
import crypto from "crypto";

export const ADMIN_COOKIE = "rd_admin";

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || "dev-insecure-secret-change-me";
}

export function createToken(): string {
  const payload = `admin.${Date.now()}`;
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64")}.${sig}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return false;
  const payload = Buffer.from(b64, "base64").toString();
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- lib/auth.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: 인증 서버액션 작성**

Create `app/admin/auth-actions.ts`:
```ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createToken, verifyToken, ADMIN_COOKIE } from "@/lib/auth";

export async function login(formData: FormData) {
  const pass = formData.get("password") as string;
  if (!process.env.ADMIN_PASSWORD || pass !== process.env.ADMIN_PASSWORD) {
    redirect("/admin/login?error=1");
  }
  const c = await cookies();
  c.set(ADMIN_COOKIE, createToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect("/admin");
}

export async function logout() {
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

export async function requireAdmin() {
  const c = await cookies();
  if (!verifyToken(c.get(ADMIN_COOKIE)?.value)) redirect("/admin/login");
}
```

- [ ] **Step 6: 로그인 페이지 작성 (가드 밖)**

Create `app/admin/login/page.tsx`:
```tsx
import { login } from "../auth-actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">PooGGo 관리자</h1>
        <p className="text-gray-500 mb-6 text-sm text-center">비밀번호를 입력하세요.</p>
        {error && <p className="text-red-500 text-sm mb-4 text-center">비밀번호가 올바르지 않습니다.</p>}
        <form action={login} className="space-y-4">
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            required
            autoFocus
            className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition">
            접속하기
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: 보호 레이아웃(가드 + 네비) 작성**

Create `app/admin/(protected)/layout.tsx`:
```tsx
import Link from "next/link";
import { requireAdmin, logout } from "../auth-actions";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex gap-5 text-sm font-medium text-gray-700">
          <Link href="/admin" className="hover:text-blue-600">대시보드</Link>
          <Link href="/admin/hospitals" className="hover:text-blue-600">병원관리</Link>
          <Link href="/admin/consultations" className="hover:text-blue-600">상담내역</Link>
        </nav>
        <form action={logout}>
          <button className="text-sm text-gray-400 hover:text-gray-700">로그아웃</button>
        </form>
      </header>
      <main className="p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 8: `.env`에 관리자 비밀번호/시크릿 추가**

`.env`에 추가(값은 임의 변경):
```
ADMIN_PASSWORD=changeme1234
ADMIN_SESSION_SECRET=please-generate-a-long-random-string
```

- [ ] **Step 9: 커밋**

```bash
git add lib/auth.ts lib/auth.test.ts app/admin/auth-actions.ts app/admin/login/ "app/admin/(protected)/layout.tsx"
git commit -m "feat: 쿠키 세션 관리자 인증(HMAC 토큰) + 로그인/로그아웃 + 보호 레이아웃"
```

> 참고: `.env`는 `.gitignore` 대상이라 커밋되지 않음. 배포 환경(Vercel)에 동일 키 등록 필요.

---

## Task 6: 병원 CRUD 서버액션

**Files:**
- Create: `app/admin/hospital-actions.ts`

- [ ] **Step 1: CRUD 액션 작성**

Create `app/admin/hospital-actions.ts`:
```ts
"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth-actions";
import { validateHospitalInput } from "@/lib/hospital/validation";
import type { HospitalInput } from "@/lib/hospital/types";

type Result = { ok: boolean; errors: string[]; id?: string };

function scalarData(input: HospitalInput) {
  return {
    slug: input.slug.trim(),
    name: input.name, intro: input.intro, about: input.about,
    address: input.address, cautions: input.cautions,
    city: input.city.trim(), district: input.district.trim(),
    category: input.category, tags: input.tags,
    image: input.image, images: input.images,
    operatingHours: input.operatingHours, messengers: input.messengers,
    isPublished: input.isPublished,
  };
}

function doctorsCreate(input: HospitalInput) {
  return input.doctors.map((d) => ({
    name: d.name, specialty: d.specialty, image: d.image || null, order: d.order,
  }));
}

function menusCreate(input: HospitalInput) {
  return input.menus.map((m) => ({
    name: m.name, category: m.category, price: m.price,
    priceText: m.priceText, currency: m.currency, order: m.order,
  }));
}

export async function createHospital(input: HospitalInput): Promise<Result> {
  await requireAdmin();
  const errors = validateHospitalInput(input);
  if (errors.length) return { ok: false, errors };
  try {
    const created = await db.hospital.create({
      data: {
        ...scalarData(input),
        doctors: { create: doctorsCreate(input) },
        menus: { create: menusCreate(input) },
      },
    });
    revalidatePath("/admin/hospitals");
    revalidatePath("/");
    return { ok: true, errors: [], id: created.id };
  } catch (e: any) {
    return { ok: false, errors: [e?.code === "P2002" ? "이미 존재하는 slug입니다." : "저장 실패: " + String(e?.message || e)] };
  }
}

export async function updateHospital(id: string, input: HospitalInput): Promise<Result> {
  await requireAdmin();
  const errors = validateHospitalInput(input);
  if (errors.length) return { ok: false, errors };
  try {
    await db.hospital.update({
      where: { id },
      data: {
        ...scalarData(input),
        doctors: { deleteMany: {}, create: doctorsCreate(input) },
        menus: { deleteMany: {}, create: menusCreate(input) },
      },
    });
    revalidatePath("/admin/hospitals");
    revalidatePath(`/hospitals/${id}`);
    revalidatePath("/");
    return { ok: true, errors: [], id };
  } catch (e: any) {
    return { ok: false, errors: [e?.code === "P2002" ? "이미 존재하는 slug입니다." : "수정 실패: " + String(e?.message || e)] };
  }
}

export async function deleteHospital(id: string): Promise<void> {
  await requireAdmin();
  try {
    await db.menu.deleteMany({ where: { hospitalId: id } });
    await db.doctor.deleteMany({ where: { hospitalId: id } });
    await db.review.deleteMany({ where: { hospitalId: id } });
    await db.hospital.delete({ where: { id } });
    revalidatePath("/admin/hospitals");
    revalidatePath("/");
  } catch (e) {
    console.error("병원 삭제 실패(연결된 상담/예약 존재 가능):", e);
  }
}

export async function togglePublish(id: string, next: boolean): Promise<void> {
  await requireAdmin();
  await db.hospital.update({ where: { id }, data: { isPublished: next } });
  revalidatePath("/admin/hospitals");
  revalidatePath("/");
}
```

- [ ] **Step 2: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공(아직 호출하는 페이지는 없음).

- [ ] **Step 3: 커밋**

```bash
git add app/admin/hospital-actions.ts
git commit -m "feat: 병원 CRUD 서버액션(create/update/delete/togglePublish, 4언어 검증)"
```

---

## Task 7: 관리자 폼 컴포넌트 (다국어 탭 + 반복입력)

**Files:**
- Create: `components/admin/I18nField.tsx`
- Create: `components/admin/HospitalForm.tsx`

- [ ] **Step 1: 다국어 입력 위젯 작성**

Create `components/admin/I18nField.tsx`:
```tsx
"use client";

import { useState } from "react";
import { LANGS, type I18nText, type Lang } from "@/lib/i18n/types";

const LABEL: Record<Lang, string> = { ko: "KR", en: "EN", zh: "CN", ja: "JP" };

export default function I18nField({
  label, value, onChange, multiline = false,
}: {
  label: string;
  value: I18nText;
  onChange: (v: I18nText) => void;
  multiline?: boolean;
}) {
  const [tab, setTab] = useState<Lang>("ko");
  const incomplete = LANGS.some((l) => !value[l].trim());
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-bold text-gray-700">
          {label} {incomplete && <span className="text-red-500">*4개 언어 필수</span>}
        </label>
        <div className="flex gap-1">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setTab(l)}
              className={`px-2 py-0.5 text-xs rounded ${tab === l ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"} ${!value[l].trim() ? "ring-1 ring-red-300" : ""}`}
            >
              {LABEL[l]}
            </button>
          ))}
        </div>
      </div>
      {multiline ? (
        <textarea
          value={value[tab]}
          onChange={(e) => onChange({ ...value, [tab]: e.target.value })}
          className="w-full border border-gray-200 p-3 rounded-lg h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
        />
      ) : (
        <input
          value={value[tab]}
          onChange={(e) => onChange({ ...value, [tab]: e.target.value })}
          className="w-full border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 병원 통합 폼 작성**

Create `components/admin/HospitalForm.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import I18nField from "./I18nField";
import { EMPTY_I18N, type I18nText } from "@/lib/i18n/types";
import { HOSPITAL_CATEGORIES } from "@/lib/hospital/validation";
import type { HospitalInput, OperatingHours, Messengers, DoctorInput, MenuInput } from "@/lib/hospital/types";
import { createHospital, updateHospital } from "@/app/admin/hospital-actions";

const DAYS: (keyof Omit<OperatingHours, "note">)[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABEL: Record<string, string> = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };

function emptyHours(): OperatingHours {
  const d = () => ({ open: "10:00", close: "19:00", closed: false });
  return { mon: d(), tue: d(), wed: d(), thu: d(), fri: d(), sat: d(), sun: { open: "", close: "", closed: true }, note: { ...EMPTY_I18N } };
}
function emptyMessengers(): Messengers {
  return { whatsapp: "", line: "", wechat: "", kakao: "", messenger: "", phone: "", email: "" };
}
export function emptyHospitalInput(): HospitalInput {
  return {
    slug: "", name: { ...EMPTY_I18N }, intro: { ...EMPTY_I18N }, about: { ...EMPTY_I18N },
    address: { ...EMPTY_I18N }, cautions: { ...EMPTY_I18N },
    city: "Seoul", district: "", category: "PLASTIC", tags: "",
    image: "", images: [], operatingHours: emptyHours(), messengers: emptyMessengers(),
    isPublished: false, doctors: [], menus: [],
  };
}

export default function HospitalForm({
  mode, hospitalId, initial,
}: {
  mode: "create" | "edit";
  hospitalId?: string;
  initial: HospitalInput;
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
    const res = mode === "create" ? await createHospital(form) : await updateHospital(hospitalId!, form);
    setSaving(false);
    if (res.ok) router.push("/admin/hospitals");
    else setErrors(res.errors);
  }

  const addDoctor = () => set("doctors", [...form.doctors, { name: { ...EMPTY_I18N }, specialty: { ...EMPTY_I18N }, image: "", order: form.doctors.length }]);
  const addMenu = () => set("menus", [...form.menus, { name: { ...EMPTY_I18N }, category: "ETC", price: null, priceText: { ...EMPTY_I18N }, currency: "KRW", order: form.menus.length }]);
  const setDoctor = (i: number, d: DoctorInput) => set("doctors", form.doctors.map((x, idx) => (idx === i ? d : x)));
  const setMenu = (i: number, m: MenuInput) => set("menus", form.menus.map((x, idx) => (idx === i ? m : x)));

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
          {errors.map((e, i) => <div key={i}>• {e}</div>)}
        </div>
      )}

      <section className="bg-white p-5 rounded-xl border">
        <h3 className="font-bold mb-3">기본 정보</h3>
        <label className="text-sm font-bold text-gray-700">slug (URL용, 영문)</label>
        <input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="rejuel-gangnam" className="w-full border p-3 rounded-lg mb-3" />
        <I18nField label="병원명" value={form.name} onChange={(v) => set("name", v)} />
        <I18nField label="한 줄 소개" value={form.intro} onChange={(v) => set("intro", v)} />
        <I18nField label="상세 소개" value={form.about} onChange={(v) => set("about", v)} multiline />
        <I18nField label="주소" value={form.address} onChange={(v) => set("address", v)} />
        <I18nField label="부작용·주의사항(의무)" value={form.cautions} onChange={(v) => set("cautions", v)} multiline />
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-sm font-bold text-gray-700">City</label><input value={form.city} onChange={(e) => set("city", e.target.value)} className="w-full border p-3 rounded-lg" /></div>
          <div><label className="text-sm font-bold text-gray-700">District</label><input value={form.district} onChange={(e) => set("district", e.target.value)} placeholder="Gangnam-gu" className="w-full border p-3 rounded-lg" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-sm font-bold text-gray-700">진료과</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className="w-full border p-3 rounded-lg bg-white">
              {HOSPITAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="text-sm font-bold text-gray-700">태그(콤마)</label><input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="리프팅,보톡스" className="w-full border p-3 rounded-lg" /></div>
        </div>
        <label className="text-sm font-bold text-gray-700 mt-3 block">대표 이미지 URL</label>
        <input value={form.image} onChange={(e) => set("image", e.target.value)} placeholder="https://..." className="w-full border p-3 rounded-lg" />
        <label className="flex items-center gap-2 mt-3 text-sm font-bold">
          <input type="checkbox" checked={form.isPublished} onChange={(e) => set("isPublished", e.target.checked)} /> 공개(환자화면 노출)
        </label>
      </section>

      <section className="bg-white p-5 rounded-xl border">
        <h3 className="font-bold mb-3">운영시간</h3>
        {DAYS.map((day) => {
          const dh = form.operatingHours[day];
          const upd = (patch: Partial<typeof dh>) => set("operatingHours", { ...form.operatingHours, [day]: { ...dh, ...patch } });
          return (
            <div key={day} className="flex items-center gap-2 mb-2">
              <span className="w-8 font-bold">{DAY_LABEL[day]}</span>
              <input type="time" value={dh.open} disabled={dh.closed} onChange={(e) => upd({ open: e.target.value })} className="border p-2 rounded" />
              <span>~</span>
              <input type="time" value={dh.close} disabled={dh.closed} onChange={(e) => upd({ close: e.target.value })} className="border p-2 rounded" />
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={dh.closed} onChange={(e) => upd({ closed: e.target.checked })} /> 휴무</label>
            </div>
          );
        })}
        <I18nField label="운영시간 비고" value={form.operatingHours.note} onChange={(v) => set("operatingHours", { ...form.operatingHours, note: v })} />
      </section>

      <section className="bg-white p-5 rounded-xl border">
        <h3 className="font-bold mb-3">메신저</h3>
        {(["whatsapp", "line", "wechat", "kakao", "messenger", "phone", "email"] as (keyof Messengers)[]).map((k) => (
          <div key={k} className="flex items-center gap-2 mb-2">
            <span className="w-24 text-sm font-bold capitalize">{k}</span>
            <input value={form.messengers[k]} onChange={(e) => set("messengers", { ...form.messengers, [k]: e.target.value })} className="flex-1 border p-2 rounded" />
          </div>
        ))}
      </section>

      <section className="bg-white p-5 rounded-xl border">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">의료진</h3>
          <button type="button" onClick={addDoctor} className="text-sm bg-gray-900 text-white px-3 py-1 rounded">+ 추가</button>
        </div>
        {form.doctors.map((d, i) => (
          <div key={i} className="border rounded-lg p-3 mb-3">
            <div className="flex justify-end"><button type="button" onClick={() => set("doctors", form.doctors.filter((_, idx) => idx !== i))} className="text-red-500 text-sm">삭제</button></div>
            <I18nField label={`의료진 ${i + 1} 이름`} value={d.name} onChange={(v) => setDoctor(i, { ...d, name: v })} />
            <I18nField label="전문분야" value={d.specialty} onChange={(v) => setDoctor(i, { ...d, specialty: v })} />
            <input value={d.image} onChange={(e) => setDoctor(i, { ...d, image: e.target.value })} placeholder="사진 URL(선택)" className="w-full border p-2 rounded" />
          </div>
        ))}
      </section>

      <section className="bg-white p-5 rounded-xl border">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold">시술/가격</h3>
          <button type="button" onClick={addMenu} className="text-sm bg-gray-900 text-white px-3 py-1 rounded">+ 추가</button>
        </div>
        {form.menus.map((m, i) => (
          <div key={i} className="border rounded-lg p-3 mb-3">
            <div className="flex justify-end"><button type="button" onClick={() => set("menus", form.menus.filter((_, idx) => idx !== i))} className="text-red-500 text-sm">삭제</button></div>
            <I18nField label={`시술 ${i + 1} 명`} value={m.name} onChange={(v) => setMenu(i, { ...m, name: v })} />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div><label className="text-xs font-bold">비교 카테고리</label><input value={m.category} onChange={(e) => setMenu(i, { ...m, category: e.target.value })} placeholder="LIFTING" className="w-full border p-2 rounded" /></div>
              <div><label className="text-xs font-bold">가격(숫자, KRW)</label><input type="number" value={m.price ?? ""} onChange={(e) => setMenu(i, { ...m, price: e.target.value === "" ? null : Number(e.target.value) })} className="w-full border p-2 rounded" /></div>
            </div>
            <I18nField label="가격 표기" value={m.priceText} onChange={(v) => setMenu(i, { ...m, priceText: v })} />
          </div>
        ))}
      </section>

      <button type="submit" disabled={saving} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl disabled:opacity-50">
        {saving ? "저장 중..." : mode === "create" ? "병원 등록" : "수정 저장"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 4: 커밋**

```bash
git add components/admin/
git commit -m "feat: 관리자 병원 폼(다국어 4탭 위젯 + 운영시간/메신저/의료진/시술 반복입력)"
```

---

## Task 8: 관리자 페이지 (대시보드·목록·생성·수정·상담내역)

**Files:**
- Create: `app/admin/(protected)/page.tsx`
- Create: `app/admin/(protected)/hospitals/page.tsx`
- Create: `app/admin/(protected)/hospitals/new/page.tsx`
- Create: `app/admin/(protected)/hospitals/[id]/edit/page.tsx`
- Create: `app/admin/(protected)/consultations/page.tsx`
- Delete: `app/admin/page.tsx`, `app/admin/actions.ts`

- [ ] **Step 1: 대시보드 작성**

Create `app/admin/(protected)/page.tsx`:
```tsx
import { db } from "@/lib/db";
import Link from "next/link";

export default async function AdminDashboard() {
  const [hospitals, published, consultations] = await Promise.all([
    db.hospital.count(),
    db.hospital.count({ where: { isPublished: true } }),
    db.consultation.count(),
  ]);
  const cards = [
    { label: "전체 병원", value: hospitals, href: "/admin/hospitals" },
    { label: "공개 병원", value: published, href: "/admin/hospitals" },
    { label: "상담 신청", value: consultations, href: "/admin/consultations" },
  ];
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>
      <div className="grid grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="bg-white p-6 rounded-xl border hover:shadow-md transition">
            <div className="text-sm text-gray-500">{c.label}</div>
            <div className="text-3xl font-bold mt-2">{c.value}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 병원 목록 + 삭제/공개토글 작성**

Create `app/admin/(protected)/hospitals/page.tsx`:
```tsx
import { db } from "@/lib/db";
import Link from "next/link";
import { resolveText } from "@/lib/i18n/text";
import { deleteHospital, togglePublish } from "@/app/admin/hospital-actions";

export default async function HospitalsAdminList() {
  const hospitals = await db.hospital.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">병원 관리</h1>
        <Link href="/admin/hospitals/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">+ 새 병원</Link>
      </div>
      <div className="bg-white rounded-xl border divide-y">
        {hospitals.length === 0 && <p className="p-6 text-gray-400">등록된 병원이 없습니다.</p>}
        {hospitals.map((h) => (
          <div key={h.id} className="flex items-center justify-between p-4">
            <div>
              <div className="font-bold">{resolveText(h.name, "ko")} <span className="text-xs text-gray-400">/{h.slug}</span></div>
              <div className="text-sm text-gray-500">{h.city}, {h.district} · {h.category}</div>
            </div>
            <div className="flex items-center gap-2">
              <form action={togglePublish.bind(null, h.id, !h.isPublished)}>
                <button className={`text-xs px-3 py-1 rounded-full ${h.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {h.isPublished ? "공개중" : "비공개"}
                </button>
              </form>
              <Link href={`/admin/hospitals/${h.id}/edit`} className="text-sm bg-gray-900 text-white px-3 py-1 rounded">수정</Link>
              <form action={deleteHospital.bind(null, h.id)}>
                <button className="text-sm text-red-500 px-2">삭제</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 새 병원 페이지 작성**

Create `app/admin/(protected)/hospitals/new/page.tsx`:
```tsx
import HospitalForm, { emptyHospitalInput } from "@/components/admin/HospitalForm";

export default function NewHospitalPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">새 병원 등록</h1>
      <HospitalForm mode="create" initial={emptyHospitalInput()} />
    </div>
  );
}
```

- [ ] **Step 4: 수정 페이지 작성 (DB → HospitalInput 매핑)**

Create `app/admin/(protected)/hospitals/[id]/edit/page.tsx`:
```tsx
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import HospitalForm from "@/components/admin/HospitalForm";
import { toI18n } from "@/lib/i18n/text";
import type { HospitalInput } from "@/lib/hospital/types";

export default async function EditHospitalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await db.hospital.findUnique({ where: { id }, include: { doctors: { orderBy: { order: "asc" } }, menus: { orderBy: { order: "asc" } } } });
  if (!h) notFound();

  const initial: HospitalInput = {
    slug: h.slug,
    name: toI18n(h.name), intro: toI18n(h.intro), about: toI18n(h.about),
    address: toI18n(h.address), cautions: toI18n(h.cautions),
    city: h.city, district: h.district, category: h.category, tags: h.tags,
    image: h.image, images: h.images,
    operatingHours: h.operatingHours as any,
    messengers: h.messengers as any,
    isPublished: h.isPublished,
    doctors: h.doctors.map((d) => ({ name: toI18n(d.name), specialty: toI18n(d.specialty), image: d.image ?? "", order: d.order })),
    menus: h.menus.map((m) => ({ name: toI18n(m.name), category: m.category, price: m.price, priceText: toI18n(m.priceText), currency: m.currency, order: m.order })),
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">병원 수정</h1>
      <HospitalForm mode="edit" hospitalId={h.id} initial={initial} />
    </div>
  );
}
```

- [ ] **Step 5: 상담내역 페이지 이전**

Create `app/admin/(protected)/consultations/page.tsx` (기존 `app/admin/page.tsx`의 목록 렌더를 가드 안으로 이전):
```tsx
import { db } from "@/lib/db";

export default async function ConsultationsPage() {
  const consultations = await db.consultation.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">상담 신청 내역</h1>
      <div className="grid gap-4">
        {consultations.length === 0 ? (
          <p className="text-gray-500 text-center py-10">아직 들어온 상담이 없습니다.</p>
        ) : (
          consultations.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-xl border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-800">{item.customerName || "이름 없음"}</h3>
                  <p className="text-gray-500 text-sm">{item.phone}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">{item.content}</p>
              {item.imageUrl && <img src={item.imageUrl} alt="첨부" className="w-32 h-32 object-cover rounded-lg border mt-2" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 구 관리자 파일 삭제**

```bash
rm app/admin/page.tsx app/admin/actions.ts
```
> 구 `app/admin/actions.ts`의 `createConsultation`은 `app/actions.ts`에 동일 함수가 있으므로 안전. 참조하던 곳이 있으면 `@/app/actions`로 교체.

- [ ] **Step 7: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공. `/admin`, `/admin/hospitals`, `/admin/hospitals/new`, `/admin/hospitals/[id]/edit`, `/admin/consultations`, `/admin/login` 라우트 생성 확인.

- [ ] **Step 8: 커밋**

```bash
git add "app/admin/(protected)/" 
git add -A app/admin
git commit -m "feat: 관리자 페이지(대시보드/병원목록/생성/수정/상담내역) + 구 admin 제거"
```

---

## Task 9: 통합 검증 + 마무리

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: 루트 metadata 정리**

`app/layout.tsx`의 metadata를 교체:
```ts
export const metadata: Metadata = {
  title: "PooGGo Global — K-Beauty & K-Medical Hub",
  description: "Connecting international patients with verified Korean clinics.",
};
```

- [ ] **Step 2: 전체 테스트 실행**

Run: `npm test`
Expected: PASS (i18n 8 + validation 7 + auth 4 = 19 tests).

- [ ] **Step 3: 전체 빌드**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 4: 수동 통합 시나리오 (dev 서버)**

Run: `npm run dev`, 아래 순서로 브라우저 확인:
1. `/admin/hospitals` 접속 → 로그인 페이지로 리다이렉트(가드 동작).
2. 틀린 비밀번호 → "비밀번호가 올바르지 않습니다" 표시.
3. 맞는 비밀번호(`.env`의 `ADMIN_PASSWORD`) → `/admin` 대시보드.
4. 병원관리 → 새 병원 → 다국어 1개 비우고 저장 → **에러 표시(저장 거부)**.
5. 4개 언어 채우고 저장 → 목록에 노출.
6. 공개 토글 → 비공개로 → `/` 메인에서 해당 병원 사라짐 / 공개로 → 다시 노출.
7. 수정 → 값 변경 저장 → 반영 확인.
8. `/hospitals/<id>` 상세에서 다국어 필드가 한국어로 정상 렌더(깨짐 없음).
9. 로그아웃 → `/admin` 재접속 시 로그인 요구.

Expected: 모든 단계 통과(설계서 7장 성공 기준 1~6 충족).

- [ ] **Step 5: 커밋 + 브랜치 정리**

```bash
git add app/layout.tsx
git commit -m "chore: 루트 metadata 갱신 + Phase 1 통합 검증 완료"
```

- [ ] **Step 6: (배포 전) Vercel 환경변수 등록 안내**

배포 시 Vercel 프로젝트 환경변수에 `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` 등록 필요(로컬 `.env`는 커밋 안 됨). 미등록 시 운영에서 로그인 불가.

---

## Self-Review 결과 (작성자 점검)

**1. Spec 커버리지**
- 다국어 4필수 → Task 1·2(검증)·7(폼)·3(시드) ✅
- 운영시간·메신저·상세소개·숫자가격 필드 → Task 3(스키마)·7(폼) ✅
- 중앙 관리자 CRUD → Task 6·8 ✅
- 쿠키 세션 인증(주소창 비번 제거) → Task 5 ✅
- 기존 데이터 마이그레이션(시드 재생성으로 대체, 정책 명시) → Task 3 ✅
- 이미지 URL 방식 → Task 7(image input) ✅
- 부작용·주의사항 의무 필드 → Task 2(검증)·3(스키마 cautions)·7(폼) ✅
- 환자화면 비회귀 → Task 4 ✅
- 성공 기준 1~6 → Task 9 Step 4 시나리오로 검증 ✅

**2. Placeholder 스캔:** TODO/TBD/"적절히 처리" 없음. 모든 코드 스텝에 실제 코드 포함. ✅

**3. 타입 일관성:** `I18nText`/`HospitalInput`/`OperatingHours`/`Messengers`/`resolveText`/`toI18n`/`validateHospitalInput`/`HOSPITAL_CATEGORIES`/`ADMIN_COOKIE`/`createToken`/`verifyToken` 명칭이 정의 Task와 사용 Task에서 일치. `emptyHospitalInput`는 HospitalForm에서 export → new 페이지에서 import 일치. ✅
