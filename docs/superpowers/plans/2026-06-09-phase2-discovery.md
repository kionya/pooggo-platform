# PooGGo Phase 2 — 발견 + 다국어 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 외국인 환자가 URL 로케일(ko/en/zh/ja)로 병원을 발견·필터·가격비교·메신저 연결하고, 병원 등급(추천/제휴/베네핏)으로 정렬·노출하는 경험을 완성한다.

**Architecture:** next-intl로 환자화면을 `app/[locale]/`에 두고 미들웨어가 로케일을 라우팅(관리자 `/admin`은 한국어 전용 제외). 필터/등급정렬/메신저딥링크는 `lib/`의 순수함수로 분리해 vitest TDD. 병원 등급은 Prisma에 `tier`+`benefits` 추가. 가격비교는 클라이언트 카트 → URL `ids` → 서버 비교표.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl, Prisma + Neon Postgres, Tailwind 4, vitest.

**참고 설계서:** `docs/superpowers/specs/2026-06-09-pooggo-phase2-design.md`

> **순서 원칙:** i18n 토대(Task 1–2) → 등급 데이터(3–4) → 발견 기능(5–8) → 검증(9). 각 태스크는 `npm run build` 통과 상태로 끝낸다.

---

## File Structure

**신규 (i18n 인프라)**
- `i18n/routing.ts`, `i18n/request.ts`, `i18n/navigation.ts`
- `middleware.ts`
- `messages/ko.json`, `messages/en.json`, `messages/zh.json`, `messages/ja.json`
- `app/[locale]/layout.tsx`
- `components/LocaleSwitcher.tsx`

**신규 (순수 로직 — TDD)**
- `lib/hospital/tier.ts` (+ `tier.test.ts`)
- `lib/hospital/filter.ts` (+ `filter.test.ts`)
- `lib/messengers.ts` (+ `messengers.test.ts`)

**신규 (기능 컴포넌트/페이지)**
- `components/hospitals/FilterBar.tsx`
- `components/hospitals/TierBadge.tsx`
- `components/hospitals/MessengerButtons.tsx`
- `components/hospitals/OperatingHoursTable.tsx`
- `app/[locale]/compare/page.tsx`

**이동** (→ `app/[locale]/`, 변환 적용)
- `app/page.tsx` → `app/[locale]/page.tsx`
- `app/hospitals/page.tsx` → `app/[locale]/hospitals/page.tsx`
- `app/hospitals/[id]/page.tsx` → `app/[locale]/hospitals/[id]/page.tsx`
- `app/consult/page.tsx` → `app/[locale]/consult/page.tsx`
- `app/success/page.tsx` → `app/[locale]/success/page.tsx`

**수정**
- `next.config.ts`(next-intl 플러그인), `app/layout.tsx`(루트)
- `prisma/schema.prisma`, `prisma/seed.ts`(+마이그레이션)
- `lib/hospital/types.ts`, `lib/hospital/validation.ts`
- `components/admin/HospitalForm.tsx`, `app/admin/(protected)/hospitals/[id]/edit/page.tsx`
- `components/HospitalMainSection.tsx`, `app/actions.ts`

---

## Task 1: next-intl 인프라 (라우팅/설정/미들웨어/사전 골격)

미들웨어는 이 태스크에서 추가하되 `/admin`·`api`·정적파일을 제외한다. 아직 `app/[locale]`가 없으므로 페이지 이동은 Task 2에서. 이 태스크는 인프라만 깔고 빌드가 통과하면 된다.

**Files:**
- Create: `i18n/routing.ts`, `i18n/request.ts`, `i18n/navigation.ts`, `middleware.ts`
- Create: `messages/ko.json`, `messages/en.json`, `messages/zh.json`, `messages/ja.json`
- Modify: `next.config.ts`

- [ ] **Step 1: next-intl 설치**

Run: `npm i next-intl`
Expected: 설치 성공.

- [ ] **Step 2: 라우팅 정의**

Create `i18n/routing.ts`:
```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ko", "en", "zh", "ja"],
  defaultLocale: "ko",
});
```

Create `i18n/navigation.ts`:
```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

- [ ] **Step 3: 요청 설정 (locale별 메시지 로딩)**

Create `i18n/request.ts`:
```ts
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 4: 미들웨어 (admin 제외)**

Create `middleware.ts`:
```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // api / admin / _next / _vercel / 파일 확장자 제외, 나머지는 로케일 라우팅
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 5: next.config 플러그인 래핑**

Replace `next.config.ts` 전체:
```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
export default withNextIntl(nextConfig);
```

- [ ] **Step 6: 메시지 사전 4종 작성**

Create `messages/ko.json`:
```json
{
  "Nav": { "findClinic": "병원 찾기", "compare": "비교하기", "consult": "상담 신청", "bookConsultation": "상담 예약" },
  "Filters": { "title": "필터", "region": "지역", "category": "진료과", "tier": "등급", "minRating": "최소 평점", "priceRange": "가격대", "keyword": "키워드", "search": "검색", "reset": "초기화", "all": "전체", "apply": "적용" },
  "Tier": { "BENEFIT": "베네핏", "PARTNER": "제휴", "RECOMMENDED": "추천", "benefitsTitle": "추가 혜택", "disclaimer": "등급은 플랫폼 제휴 관계를 나타냅니다." },
  "Compare": { "title": "병원 비교", "empty": "비교할 병원을 먼저 담아주세요.", "treatment": "시술", "lowest": "최저가", "consultCta": "상담 신청", "back": "목록으로" },
  "Detail": { "messengers": "메신저로 문의", "hours": "운영시간", "closed": "휴무", "copy": "복사", "copied": "복사됨", "note": "비고" },
  "Hospitals": { "title": "제휴 병원", "subtitle": "원하는 병원을 비교 견적 받아보세요.", "noResults": "조건에 맞는 병원이 없습니다.", "viewDetail": "상세보기", "addCompare": "담기", "added": "담김" }
}
```

Create `messages/en.json`:
```json
{
  "Nav": { "findClinic": "Find Clinic", "compare": "Compare", "consult": "Consult", "bookConsultation": "Book Consultation" },
  "Filters": { "title": "Filters", "region": "Region", "category": "Specialty", "tier": "Tier", "minRating": "Min rating", "priceRange": "Price range", "keyword": "Keyword", "search": "Search", "reset": "Reset", "all": "All", "apply": "Apply" },
  "Tier": { "BENEFIT": "Benefit", "PARTNER": "Partner", "RECOMMENDED": "Recommended", "benefitsTitle": "Extra Benefits", "disclaimer": "Tiers indicate platform partnership, not medical superiority." },
  "Compare": { "title": "Compare Clinics", "empty": "Add clinics to compare first.", "treatment": "Treatment", "lowest": "Lowest", "consultCta": "Consult", "back": "Back to list" },
  "Detail": { "messengers": "Chat with us", "hours": "Opening hours", "closed": "Closed", "copy": "Copy", "copied": "Copied", "note": "Note" },
  "Hospitals": { "title": "Partner Clinics", "subtitle": "Compare quotes from clinics you choose.", "noResults": "No clinics match your filters.", "viewDetail": "Details", "addCompare": "Add", "added": "Added" }
}
```

Create `messages/zh.json`:
```json
{
  "Nav": { "findClinic": "寻找医院", "compare": "对比", "consult": "咨询申请", "bookConsultation": "预约咨询" },
  "Filters": { "title": "筛选", "region": "地区", "category": "科室", "tier": "等级", "minRating": "最低评分", "priceRange": "价格区间", "keyword": "关键词", "search": "搜索", "reset": "重置", "all": "全部", "apply": "应用" },
  "Tier": { "BENEFIT": "权益", "PARTNER": "合作", "RECOMMENDED": "推荐", "benefitsTitle": "额外权益", "disclaimer": "等级仅代表平台合作关系，不代表医疗优劣。" },
  "Compare": { "title": "医院对比", "empty": "请先添加要对比的医院。", "treatment": "项目", "lowest": "最低价", "consultCta": "咨询", "back": "返回列表" },
  "Detail": { "messengers": "在线咨询", "hours": "营业时间", "closed": "休息", "copy": "复制", "copied": "已复制", "note": "备注" },
  "Hospitals": { "title": "合作医院", "subtitle": "对比您选择的医院报价。", "noResults": "没有符合条件的医院。", "viewDetail": "详情", "addCompare": "添加", "added": "已添加" }
}
```

Create `messages/ja.json`:
```json
{
  "Nav": { "findClinic": "病院を探す", "compare": "比較", "consult": "相談申込", "bookConsultation": "相談予約" },
  "Filters": { "title": "絞り込み", "region": "地域", "category": "診療科", "tier": "ランク", "minRating": "最低評価", "priceRange": "価格帯", "keyword": "キーワード", "search": "検索", "reset": "リセット", "all": "すべて", "apply": "適用" },
  "Tier": { "BENEFIT": "ベネフィット", "PARTNER": "提携", "RECOMMENDED": "おすすめ", "benefitsTitle": "追加特典", "disclaimer": "ランクはプラットフォーム提携関係を示し、医療の優劣ではありません。" },
  "Compare": { "title": "病院比較", "empty": "比較する病院を先に追加してください。", "treatment": "施術", "lowest": "最安", "consultCta": "相談", "back": "一覧へ" },
  "Detail": { "messengers": "メッセンジャーで問い合わせ", "hours": "営業時間", "closed": "休診", "copy": "コピー", "copied": "コピー済み", "note": "備考" },
  "Hospitals": { "title": "提携病院", "subtitle": "選んだ病院の見積もりを比較。", "noResults": "条件に合う病院がありません。", "viewDetail": "詳細", "addCompare": "追加", "added": "追加済み" }
}
```

- [ ] **Step 7: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공. (아직 `[locale]` 라우트 없음 — 런타임 라우팅은 Task 2에서 완성.)

- [ ] **Step 8: 커밋**

```bash
git add i18n middleware.ts messages next.config.ts package.json package-lock.json
git commit -m "feat(i18n): next-intl 인프라(라우팅/요청설정/미들웨어/4언어 사전 골격) + admin 제외"
```

---

## Task 2: 환자 페이지를 `[locale]`로 이동 + 로케일화 + 언어 스위처

이 태스크는 환자 페이지 5개를 `app/[locale]/`로 옮기고, `resolveText(x,"ko")`를 활성 로케일로 바꾸고, 내부 링크를 next-intl `Link`로 교체한다. 끝나면 사이트가 `/ko`,`/en`,`/zh`,`/ja`로 동작한다.

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/[locale]/layout.tsx`, `components/LocaleSwitcher.tsx`
- Move+edit: `app/page.tsx`→`app/[locale]/page.tsx`, `app/hospitals/page.tsx`→`app/[locale]/hospitals/page.tsx`, `app/hospitals/[id]/page.tsx`→`app/[locale]/hospitals/[id]/page.tsx`, `app/consult/page.tsx`→`app/[locale]/consult/page.tsx`, `app/success/page.tsx`→`app/[locale]/success/page.tsx`

- [ ] **Step 1: 루트 레이아웃 유지(html/body) — 확인만**

Read `app/layout.tsx`. 이미 `<html><body>`로 감싸고 metadata가 있으면 변경 없음. (루트가 html/body를 제공하고, `[locale]` 레이아웃은 provider만 추가하는 구조.) 변경 불필요하면 그대로 둔다.

- [ ] **Step 2: `[locale]` 레이아웃 생성**

Create `app/[locale]/layout.tsx`:
```tsx
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return <NextIntlClientProvider>{children}</NextIntlClientProvider>;
}
```

- [ ] **Step 3: 언어 스위처 컴포넌트**

Create `components/LocaleSwitcher.tsx`:
```tsx
"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABEL: Record<string, string> = { ko: "KR", en: "EN", zh: "CN", ja: "JP" };

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className="flex items-center gap-3 text-sm font-bold text-gray-400">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          className={l === locale ? "text-gray-900 cursor-pointer" : "hover:text-gray-900 cursor-pointer transition"}
        >
          {LABEL[l]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 홈 이동 + 변환 — `app/[locale]/page.tsx`**

`git mv app/page.tsx app/[locale]/page.tsx` 후 파일을 편집:
- 최상단 import에 추가: `import { setRequestLocale } from "next-intl/server";` 와 `import LocaleSwitcher from "@/components/LocaleSwitcher";`
- 컴포넌트 시그니처를 `export default async function Home({ params }: { params: Promise<{ locale: string }> })`로 바꾸고, 함수 첫 줄에 `const { locale } = await params; setRequestLocale(locale);` 추가.
- 헤더의 언어버튼 블록(KR/EN/CN/JP를 `<span>`으로 하드코딩한 `<div className="hidden md:flex ...">...</div>`)을 `<div className="hidden md:flex"><LocaleSwitcher /></div>`로 교체.
- `HospitalMainSection`은 그대로 사용(다음 태스크에서 로케일 받도록 보강). 변경 없으면 둔다.

- [ ] **Step 5: 병원목록 이동 — `app/[locale]/hospitals/page.tsx`**

`git mv app/hospitals/page.tsx app/[locale]/hospitals/page.tsx`. 이 페이지는 `getHospitals()`의 평탄화 문자열을 쓰므로 로케일 영향이 적다. 다음만 적용:
- import `next/link` → `import { Link } from "@/i18n/navigation";` 로 바꾸고, 모든 `<a href=...>`/`<Link href=...>`의 경로에서 로케일 prefix는 next-intl `Link`가 자동 처리하므로 경로는 그대로(`/hospitals/...`) 둔다.
- (필터는 Task 6에서 이 페이지를 다시 손댄다. 지금은 이동·링크 교체까지만.)

- [ ] **Step 6: 병원상세 이동 + 로케일화 — `app/[locale]/hospitals/[id]/page.tsx`**

`git mv app/hospitals/[id]/page.tsx app/[locale]/hospitals/[id]/page.tsx`. 편집:
- 시그니처를 `params: Promise<{ id: string; locale: string }>`로 바꾸고, `const { id, locale } = await props.params;` 로 id·locale 추출. 첫 줄에 `setRequestLocale(locale)` (import `setRequestLocale` from "next-intl/server").
- 파일 내 모든 `resolveText(<값>, "ko")`를 `resolveText(<값>, locale)`로 일괄 변경(병원명·intro/address·doctor·menu·priceText 등 8군데).
- `import Link from "next/link"` → `import { Link } from "@/i18n/navigation";` (하단 "이 병원 상담 신청하기" 링크 등). 경로는 그대로.

- [ ] **Step 7: consult/success 이동 — 단순**

`git mv app/consult/page.tsx app/[locale]/consult/page.tsx`
`git mv app/success/page.tsx app/[locale]/success/page.tsx`
두 파일은 정적 한국어 폼/안내라 추가 변환 없이 이동만. (내부 `redirect("/")`가 있으면 그대로 — next-intl 미들웨어가 로케일 부여.)

- [ ] **Step 8: 옛 경로 잔재 확인**

Run: `ls app` 로 `app/hospitals`, `app/consult`, `app/success`, `app/page.tsx`가 더 이상 없는지 확인(모두 `app/[locale]/`로 이동). `app/admin`, `app/[locale]`, `app/layout.tsx`, `app/globals.css`, `app/favicon.ico`만 남아야 한다.

- [ ] **Step 9: 빌드 + 라우트 확인**

Run: `npm run build`
Expected: 성공. 라우트에 `/[locale]`, `/[locale]/hospitals`, `/[locale]/hospitals/[id]`, `/[locale]/compare`(아직 없음 — Task 8), `/[locale]/consult`, `/[locale]/success`, `/admin/*` 포함. 중복 라우트 에러 없어야 함.

- [ ] **Step 10: 커밋**

```bash
git add -A app components/LocaleSwitcher.tsx
git commit -m "feat(i18n): 환자 페이지를 [locale]로 이동 + resolveText 로케일화 + 언어 스위처"
```

---

## Task 3: 병원 등급 스키마 + 타입/검증 + 마이그레이션/시드

**Files:**
- Modify: `prisma/schema.prisma`, `prisma/seed.ts`
- Modify: `lib/hospital/types.ts`, `lib/hospital/validation.ts`
- Test: `lib/hospital/validation.test.ts`

- [ ] **Step 1: 스키마에 tier/benefits 추가**

`prisma/schema.prisma`의 `model Hospital`에서 `isPublished Boolean @default(false)` 줄 아래에 추가:
```prisma
  tier      String  @default("RECOMMENDED")
  benefits  Json    @default("{}")
```
그리고 모델 하단 인덱스 블록에 한 줄 추가:
```prisma
  @@index([tier])
```

- [ ] **Step 2: 마이그레이션 생성(증분) + 적용**

기존 마이그레이션을 건드리지 말고 신규 생성:
Run: `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script > /tmp/tier.sql`
`/tmp/tier.sql` 내용 확인 — `ALTER TABLE "Hospital" ADD COLUMN "tier" ... DEFAULT 'RECOMMENDED'`, `ADD COLUMN "benefits" ... DEFAULT '{}'`, `CREATE INDEX "Hospital_tier_idx"` 만 있어야 한다(파괴적 구문 있으면 STOP).
폴더 `prisma/migrations/20260609000001_hospital_tier/` 생성하고 `/tmp/tier.sql`를 `migration.sql`로 복사. 맨 위에 주석 `-- 병원 등급(tier) + 혜택(benefits) 추가, default 있어 기존 행 자동 채움` 추가.
Run: `npx prisma migrate deploy`
Run: `npx prisma migrate status` — up to date 확인. 그리고 `npx prisma generate`.

- [ ] **Step 3: 타입 추가**

`lib/hospital/types.ts`의 `HospitalInput` 타입에 두 필드 추가(`isPublished: boolean;` 다음):
```ts
  tier: string;
  benefits: I18nText;
```

- [ ] **Step 4: 실패하는 검증 테스트 추가**

`lib/hospital/validation.test.ts`의 `valid()` 헬퍼 반환 객체에 `tier: "RECOMMENDED", benefits: EMPTY_I18N,` 두 필드를 추가(기존 필드와 함께). 그리고 `describe` 블록 안에 테스트 2개 추가:
```ts
  it("잘못된 tier 에러", () => {
    const v = valid(); v.tier = "GOLD";
    expect(validateHospitalInput(v).some((e) => e.includes("tier"))).toBe(true);
  });
  it("BENEFIT 등급은 benefits 4언어 필수", () => {
    const v = valid(); v.tier = "BENEFIT"; v.benefits = EMPTY_I18N;
    expect(validateHospitalInput(v).some((e) => e.includes("benefits"))).toBe(true);
  });
```

- [ ] **Step 5: 테스트 실패 확인**

Run: `npm test -- lib/hospital/validation.test.ts`
Expected: 새 테스트 2개 FAIL(아직 tier 검증 없음).

- [ ] **Step 6: 검증 로직 구현**

`validateHospitalInput` 함수의 `return errors;` 직전에 추가(등급 유효값은 로컬 배열로 검사 — UI용 단일 export 상수는 Task 5의 `lib/hospital/tier.ts`에 둠):
```ts
  const VALID_TIERS = ["RECOMMENDED", "PARTNER", "BENEFIT"];
  if (!VALID_TIERS.includes(input.tier)) {
    errors.push("tier가 올바르지 않습니다.");
  }
  if (input.tier === "BENEFIT" && !isCompleteI18n(input.benefits)) {
    errors.push("benefits: 베네핏 등급은 추가혜택 4개 언어 필수입니다.");
  }
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npm test -- lib/hospital/validation.test.ts`
Expected: 전부 PASS(기존 8 + 신규 2 = 10).

- [ ] **Step 8: 시드에 등급 배정**

`prisma/seed.ts`에서 각 병원 `isPublished: true,` 다음 줄에 `tier`/`benefits`를 추가:
- rejuel-gangnam: `tier: "BENEFIT", benefits: t("외국인 환자 전용 통역·픽업 지원", "Free interpreter & pickup for international patients", "外籍患者专享翻译及接送", "外国人患者向け通訳・送迎サポート"),`
- banobagi: `tier: "BENEFIT", benefits: t("术后관리 패키지 제공", "Post-op care package included", "提供术后护理套餐", "術後ケアパッケージ提供"),`
- ps345: `tier: "PARTNER", benefits: t("", "", "", ""),`
- goeunmom: `tier: "RECOMMENDED", benefits: t("", "", "", ""),`
- vibe: `tier: "RECOMMENDED", benefits: t("", "", "", ""),`
Run: `npx prisma db seed` (또는 `npx tsx prisma/seed.ts`). "🌱 다국어 병원 시드 완료" 확인.

- [ ] **Step 9: 빌드 + 커밋**

Run: `npm run build` (성공)
```bash
git add prisma lib/hospital/types.ts lib/hospital/validation.ts lib/hospital/validation.test.ts
git commit -m "feat(tier): 병원 등급(추천/제휴/베네핏)+혜택 스키마·검증·시드(BENEFIT 혜택 4언어 필수)"
```

---

## Task 4: 관리자 폼에 등급 + 혜택 입력

**Files:**
- Modify: `components/admin/HospitalForm.tsx`
- Modify: `app/admin/(protected)/hospitals/[id]/edit/page.tsx`

- [ ] **Step 1: 빈 입력 기본값에 tier/benefits 추가**

`components/admin/HospitalForm.tsx`의 `emptyHospitalInput()` 반환 객체에서 `isPublished: false,` 다음에 추가:
```ts
    tier: "RECOMMENDED", benefits: { ...EMPTY_I18N },
```

- [ ] **Step 2: 폼 UI에 등급 select + 혜택 필드**

같은 파일 "기본 정보" 섹션의 공개 토글(`<label className="flex items-center gap-2 mt-3 ...">…공개…</label>`) 바로 위에 추가:
```tsx
        <div className="mt-3">
          <label className="text-sm font-bold text-gray-700">등급</label>
          <select value={form.tier} onChange={(e) => set("tier", e.target.value)} className="w-full border p-3 rounded-lg bg-white">
            <option value="RECOMMENDED">추천</option>
            <option value="PARTNER">제휴</option>
            <option value="BENEFIT">베네핏(추가혜택)</option>
          </select>
        </div>
        {form.tier === "BENEFIT" && (
          <I18nField label="추가혜택(베네핏 — 4언어 필수)" value={form.benefits} onChange={(v) => set("benefits", v)} multiline />
        )}
```

- [ ] **Step 3: 수정 페이지 매핑에 tier/benefits 추가**

`app/admin/(protected)/hospitals/[id]/edit/page.tsx`의 `initial` 객체에서 `isPublished: h.isPublished,` 다음에 추가:
```ts
    tier: h.tier,
    benefits: toI18n(h.benefits),
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 성공.

- [ ] **Step 5: 커밋**

```bash
git add components/admin/HospitalForm.tsx "app/admin/(protected)/hospitals/[id]/edit/page.tsx"
git commit -m "feat(admin): 병원 폼 등급 select + 베네핏 혜택 입력(조건부)"
```

---

## Task 5: 등급 정렬 comparator (TDD) + 목록 정렬·배지

**Files:**
- Create: `lib/hospital/tier.ts`, Test: `lib/hospital/tier.test.ts`
- Create: `components/hospitals/TierBadge.tsx`
- Modify: `app/actions.ts`, `components/HospitalMainSection.tsx`

- [ ] **Step 1: 실패하는 테스트**

Create `lib/hospital/tier.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { tierRank, compareHospitalsByTier, HOSPITAL_TIERS } from "./tier";

describe("tierRank", () => {
  it("BENEFIT<PARTNER<RECOMMENDED 순위", () => {
    expect(tierRank("BENEFIT")).toBeLessThan(tierRank("PARTNER"));
    expect(tierRank("PARTNER")).toBeLessThan(tierRank("RECOMMENDED"));
  });
  it("알 수 없는 값은 RECOMMENDED 순위", () => {
    expect(tierRank("XYZ")).toBe(tierRank("RECOMMENDED"));
  });
});

describe("compareHospitalsByTier", () => {
  it("등급이 다르면 등급 우선", () => {
    expect(compareHospitalsByTier({ tier: "BENEFIT", rating: 1 }, { tier: "RECOMMENDED", rating: 5 })).toBeLessThan(0);
  });
  it("같은 등급은 평점 높은 순", () => {
    expect(compareHospitalsByTier({ tier: "PARTNER", rating: 4.5 }, { tier: "PARTNER", rating: 4.9 })).toBeGreaterThan(0);
  });
  it("상수는 3종", () => expect(HOSPITAL_TIERS.length).toBe(3));
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- lib/hospital/tier.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

Create `lib/hospital/tier.ts`:
```ts
export const HOSPITAL_TIERS = ["RECOMMENDED", "PARTNER", "BENEFIT"] as const;
export type Tier = (typeof HOSPITAL_TIERS)[number];

export function tierRank(tier: string): number {
  switch (tier) {
    case "BENEFIT": return 0;
    case "PARTNER": return 1;
    default: return 2; // RECOMMENDED 및 알 수 없는 값
  }
}

export function compareHospitalsByTier(
  a: { tier: string; rating: number },
  b: { tier: string; rating: number },
): number {
  const r = tierRank(a.tier) - tierRank(b.tier);
  if (r !== 0) return r;
  return b.rating - a.rating; // 동급은 평점 내림차순
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- lib/hospital/tier.test.ts`
Expected: PASS (5).

- [ ] **Step 5: 등급 배지 컴포넌트**

Create `components/hospitals/TierBadge.tsx`:
```tsx
import { useTranslations } from "next-intl";

const STYLE: Record<string, string> = {
  BENEFIT: "bg-amber-100 text-amber-800 border-amber-300",
  PARTNER: "bg-blue-100 text-blue-700 border-blue-300",
  RECOMMENDED: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function TierBadge({ tier }: { tier: string }) {
  const t = useTranslations("Tier");
  const key = ["BENEFIT", "PARTNER", "RECOMMENDED"].includes(tier) ? tier : "RECOMMENDED";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${STYLE[key]}`}>
      {t(key)}
    </span>
  );
}
```

- [ ] **Step 6: getHospitals에 tier 포함 + 등급 정렬**

`app/actions.ts`의 `getHospitals`를 교체(상단에 `import { compareHospitalsByTier } from "@/lib/hospital/tier";` 추가):
```ts
export async function getHospitals() {
  try {
    const hospitals = await db.hospital.findMany({
      where: { isPublished: true },
    });
    return hospitals
      .map((h) => ({
        id: h.id,
        name: resolveText(h.name, "ko"),
        location: `${h.city}, ${h.district}`,
        tags: h.tags || "",
        rating: h.rating,
        reviews: h.reviews,
        image: h.image || "",
        desc: resolveText(h.intro, "ko"),
        tier: h.tier,
        nameI18n: h.name,
        introI18n: h.intro,
      }))
      .sort(compareHospitalsByTier);
  } catch (error) {
    console.error("병원 목록 로딩 실패:", error);
    return [];
  }
}
```
> `nameI18n`/`introI18n` 원본 Json을 함께 넘겨, 클라이언트가 로케일로 다시 렌더할 수 있게 한다(다음 스텝).

- [ ] **Step 7: 메인 카드에 등급 배지 + 로케일 렌더**

`components/HospitalMainSection.tsx` 수정:
- 상단 import에 `import TierBadge from "@/components/hospitals/TierBadge";`, `import { useLocale } from "next-intl";`, `import { resolveText } from "@/lib/i18n/text";` 추가.
- 컴포넌트 함수 안에 `const locale = useLocale();` 추가.
- 카드 제목 `{hospital.name}` 렌더를 `{resolveText(hospital.nameI18n, locale)}`로, 설명 `{hospital.desc}`를 `{resolveText(hospital.introI18n, locale)}`로 교체.
- 평점 배지(별점) 옆 또는 카드 상단에 `<TierBadge tier={hospital.tier} />` 추가(이미지 우상단 별점 박스 근처 `<div className="absolute top-4 left-4">`에 배치).

- [ ] **Step 8: 빌드 + 커밋**

Run: `npm run build` (성공)
```bash
git add lib/hospital/tier.ts lib/hospital/tier.test.ts components/hospitals/TierBadge.tsx app/actions.ts components/HospitalMainSection.tsx
git commit -m "feat(tier): 등급 정렬 comparator(TDD) + 목록 등급 배지 + 카드 로케일 렌더"
```

---

## Task 6: 병원 리스트 필터 (TDD 빌더 + FilterBar + 페이지)

**Files:**
- Create: `lib/hospital/filter.ts`, Test: `lib/hospital/filter.test.ts`
- Create: `components/hospitals/FilterBar.tsx`
- Modify: `app/[locale]/hospitals/page.tsx`

- [ ] **Step 1: 실패하는 테스트**

Create `lib/hospital/filter.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseFilterParams, buildHospitalWhere } from "./filter";

describe("parseFilterParams", () => {
  it("문자/숫자 파라미터 파싱", () => {
    const p = parseFilterParams({ city: "Seoul", minPrice: "100000", minRating: "4.5", q: "리프팅" });
    expect(p).toMatchObject({ city: "Seoul", minPrice: 100000, minRating: 4.5, q: "리프팅" });
  });
  it("숫자 아닌 값은 undefined", () => {
    expect(parseFilterParams({ minPrice: "abc" }).minPrice).toBeUndefined();
  });
});

describe("buildHospitalWhere", () => {
  it("기본은 공개만", () => {
    expect(buildHospitalWhere({})).toEqual({ isPublished: true });
  });
  it("city/category/tier equals", () => {
    const w = buildHospitalWhere({ city: "Seoul", category: "DERMA", tier: "BENEFIT" });
    expect(w).toMatchObject({ city: "Seoul", category: "DERMA", tier: "BENEFIT" });
  });
  it("가격대는 menus.some.price 범위", () => {
    const w = buildHospitalWhere({ minPrice: 100000, maxPrice: 500000 });
    expect(w.menus).toEqual({ some: { price: { gte: 100000, lte: 500000 } } });
  });
  it("minRating은 rating.gte", () => {
    expect(buildHospitalWhere({ minRating: 4.5 }).rating).toEqual({ gte: 4.5 });
  });
  it("q는 tags/city/district OR", () => {
    const w = buildHospitalWhere({ q: "강남" });
    expect(Array.isArray(w.OR)).toBe(true);
    expect(w.OR.length).toBe(3);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- lib/hospital/filter.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

Create `lib/hospital/filter.ts`:
```ts
export type HospitalFilterParams = {
  city?: string; district?: string; category?: string; tier?: string;
  minPrice?: number; maxPrice?: number; minRating?: number; q?: string;
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const num = (v: string | string[] | undefined) => {
  const x = one(v);
  if (x === undefined) return undefined;
  const n = Number(x);
  return Number.isFinite(n) ? n : undefined;
};

export function parseFilterParams(sp: SP): HospitalFilterParams {
  return {
    city: one(sp.city), district: one(sp.district), category: one(sp.category), tier: one(sp.tier),
    minPrice: num(sp.minPrice), maxPrice: num(sp.maxPrice), minRating: num(sp.minRating), q: one(sp.q),
  };
}

export function buildHospitalWhere(p: HospitalFilterParams): Record<string, unknown> {
  const where: Record<string, unknown> = { isPublished: true };
  if (p.city) where.city = p.city;
  if (p.district) where.district = p.district;
  if (p.category) where.category = p.category;
  if (p.tier) where.tier = p.tier;
  if (p.minRating !== undefined) where.rating = { gte: p.minRating };
  if (p.minPrice !== undefined || p.maxPrice !== undefined) {
    const price: Record<string, number> = {};
    if (p.minPrice !== undefined) price.gte = p.minPrice;
    if (p.maxPrice !== undefined) price.lte = p.maxPrice;
    where.menus = { some: { price } };
  }
  if (p.q) {
    where.OR = [
      { tags: { contains: p.q, mode: "insensitive" } },
      { city: { contains: p.q, mode: "insensitive" } },
      { district: { contains: p.q, mode: "insensitive" } },
    ];
  }
  return where;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- lib/hospital/filter.test.ts`
Expected: PASS (7).

- [ ] **Step 5: FilterBar 컴포넌트**

Create `components/hospitals/FilterBar.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { HOSPITAL_CATEGORIES } from "@/lib/hospital/validation";
import { HOSPITAL_TIERS } from "@/lib/hospital/tier";

export default function FilterBar({ current }: { current: Record<string, string> }) {
  const t = useTranslations("Filters");
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const params = new URLSearchParams(current);
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="bg-white border rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">{t("region")}</label>
        <input defaultValue={current.city ?? ""} onBlur={(e) => update("city", e.target.value)} placeholder="Seoul" className="border p-2 rounded-lg text-sm w-28" />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">{t("category")}</label>
        <select value={current.category ?? ""} onChange={(e) => update("category", e.target.value)} className="border p-2 rounded-lg text-sm bg-white">
          <option value="">{t("all")}</option>
          {HOSPITAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">{t("tier")}</label>
        <select value={current.tier ?? ""} onChange={(e) => update("tier", e.target.value)} className="border p-2 rounded-lg text-sm bg-white">
          <option value="">{t("all")}</option>
          {HOSPITAL_TIERS.map((tr) => <option key={tr} value={tr}>{tr}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">{t("minRating")}</label>
        <select value={current.minRating ?? ""} onChange={(e) => update("minRating", e.target.value)} className="border p-2 rounded-lg text-sm bg-white">
          <option value="">{t("all")}</option>
          <option value="4.5">4.5+</option>
          <option value="4.8">4.8+</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">{t("keyword")}</label>
        <input defaultValue={current.q ?? ""} onBlur={(e) => update("q", e.target.value)} placeholder={t("keyword")} className="border p-2 rounded-lg text-sm w-32" />
      </div>
      <button type="button" onClick={() => router.replace(pathname)} className="text-sm text-gray-500 underline">{t("reset")}</button>
    </div>
  );
}
```

- [ ] **Step 6: 리스트 페이지를 필터 서버컴포넌트로 교체**

Replace `app/[locale]/hospitals/page.tsx` 전체:
```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { parseFilterParams, buildHospitalWhere } from "@/lib/hospital/filter";
import { compareHospitalsByTier } from "@/lib/hospital/tier";
import { Link } from "@/i18n/navigation";
import FilterBar from "@/components/hospitals/FilterBar";
import TierBadge from "@/components/hospitals/TierBadge";
import { Star, MapPin } from "lucide-react";

export default async function HospitalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations("Hospitals");

  const filter = parseFilterParams(sp);
  const where = buildHospitalWhere(filter);
  const rows = await db.hospital.findMany({ where });
  const hospitals = rows.sort(compareHospitalsByTier);

  const current: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") current[k] = v;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
      <p className="text-gray-500 mb-6">{t("subtitle")}</p>
      <FilterBar current={current} />
      {hospitals.length === 0 ? (
        <p className="text-gray-400 text-center py-20">{t("noResults")}</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hospitals.map((h) => (
            <div key={h.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              <Link href={`/hospitals/${h.id}`} className="block relative h-48 bg-gray-200">
                <img src={h.image || ""} alt={resolveText(h.name, locale)} className="w-full h-full object-cover" />
                <div className="absolute top-4 left-4"><TierBadge tier={h.tier} /></div>
                <div className="absolute top-4 right-4 bg-white/90 px-2 py-1 rounded-lg flex items-center shadow-sm">
                  <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" /><span className="text-sm font-bold">{h.rating}</span>
                </div>
              </Link>
              <div className="p-6">
                <Link href={`/hospitals/${h.id}`}><h3 className="text-xl font-bold mb-1 hover:text-blue-600">{resolveText(h.name, locale)}</h3></Link>
                <div className="flex items-center text-sm text-gray-500 mb-3"><MapPin className="w-4 h-4 mr-1" />{h.city}, {h.district}</div>
                <p className="text-gray-600 text-sm line-clamp-2 mb-4">{resolveText(h.intro, locale)}</p>
                <Link href={`/hospitals/${h.id}`} className="block text-center py-3 rounded-xl font-bold text-sm bg-gray-900 text-white hover:bg-gray-800">{t("viewDetail")}</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: 빌드 + 커밋**

Run: `npm run build` (성공)
```bash
git add lib/hospital/filter.ts lib/hospital/filter.test.ts components/hospitals/FilterBar.tsx "app/[locale]/hospitals/page.tsx"
git commit -m "feat(filter): 필터 빌더(TDD) + FilterBar + 병원 리스트 필터·등급정렬·로케일 렌더"
```

---

## Task 7: 메신저 딥링크 (TDD) + 상세 메신저 버튼 + 운영시간 표

**Files:**
- Create: `lib/messengers.ts`, Test: `lib/messengers.test.ts`
- Create: `components/hospitals/MessengerButtons.tsx`, `components/hospitals/OperatingHoursTable.tsx`
- Modify: `app/[locale]/hospitals/[id]/page.tsx`

- [ ] **Step 1: 실패하는 테스트**

Create `lib/messengers.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildMessengerLinks } from "./messengers";

describe("buildMessengerLinks", () => {
  it("빈 입력은 빈 배열", () => {
    expect(buildMessengerLinks(null)).toEqual([]);
    expect(buildMessengerLinks({})).toEqual([]);
  });
  it("whatsapp 숫자만 추출해 wa.me", () => {
    const r = buildMessengerLinks({ whatsapp: "+82 10-1234-5678" });
    expect(r[0]).toMatchObject({ kind: "link", channel: "whatsapp", url: "https://wa.me/821012345678" });
  });
  it("wechat은 복사 타입", () => {
    const r = buildMessengerLinks({ wechat: "pooggo_kr" });
    expect(r[0]).toMatchObject({ kind: "copy", channel: "wechat", value: "pooggo_kr" });
  });
  it("messenger m.me 접두 제거", () => {
    const r = buildMessengerLinks({ messenger: "https://m.me/pooggo" });
    expect(r[0].url).toBe("https://m.me/pooggo");
  });
  it("phone/email 스킴", () => {
    const r = buildMessengerLinks({ phone: "+8210", email: "a@b.com" });
    expect(r.find((x) => x.channel === "phone")?.url).toBe("tel:+8210");
    expect(r.find((x) => x.channel === "email")?.url).toBe("mailto:a@b.com");
  });
  it("빈 문자열 채널은 제외", () => {
    expect(buildMessengerLinks({ whatsapp: "", line: "  " })).toEqual([]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test -- lib/messengers.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

Create `lib/messengers.ts`:
```ts
export type MessengerLink =
  | { kind: "link"; channel: string; label: string; url: string }
  | { kind: "copy"; channel: string; label: string; value: string };

const digits = (s: string) => s.replace(/[^\d]/g, "");

export function buildMessengerLinks(m: Record<string, string> | null | undefined): MessengerLink[] {
  const out: MessengerLink[] = [];
  if (!m) return out;
  const has = (v?: string) => typeof v === "string" && v.trim().length > 0;

  if (has(m.whatsapp)) out.push({ kind: "link", channel: "whatsapp", label: "WhatsApp", url: `https://wa.me/${digits(m.whatsapp)}` });
  if (has(m.line)) out.push({ kind: "link", channel: "line", label: "LINE", url: `https://line.me/R/ti/p/${encodeURIComponent(m.line.trim())}` });
  if (has(m.wechat)) out.push({ kind: "copy", channel: "wechat", label: "WeChat", value: m.wechat.trim() });
  if (has(m.kakao)) out.push({ kind: "link", channel: "kakao", label: "KakaoTalk", url: m.kakao.trim() });
  if (has(m.messenger)) {
    const id = m.messenger.trim().replace(/^https?:\/\//, "").replace(/^m\.me\//, "");
    out.push({ kind: "link", channel: "messenger", label: "Messenger", url: `https://m.me/${id}` });
  }
  if (has(m.phone)) out.push({ kind: "link", channel: "phone", label: "Phone", url: `tel:${m.phone.trim()}` });
  if (has(m.email)) out.push({ kind: "link", channel: "email", label: "Email", url: `mailto:${m.email.trim()}` });
  return out;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- lib/messengers.test.ts`
Expected: PASS (6).

- [ ] **Step 5: 메신저 버튼 컴포넌트(복사 처리 위해 클라이언트)**

Create `components/hospitals/MessengerButtons.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { buildMessengerLinks } from "@/lib/messengers";

export default function MessengerButtons({ messengers }: { messengers: Record<string, string> | null | undefined }) {
  const t = useTranslations("Detail");
  const [copied, setCopied] = useState<string | null>(null);
  const links = buildMessengerLinks(messengers);
  if (links.length === 0) return null;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
      <h3 className="font-bold text-lg mb-4">{t("messengers")}</h3>
      <div className="flex flex-wrap gap-2">
        {links.map((l) =>
          l.kind === "link" ? (
            <a key={l.channel} href={l.url} target="_blank" rel="noopener noreferrer"
               className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-gray-800">
              {l.label}
            </a>
          ) : (
            <button key={l.channel} type="button"
              onClick={() => { navigator.clipboard?.writeText(l.value); setCopied(l.channel); }}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200">
              {l.label}: {l.value} ({copied === l.channel ? t("copied") : t("copy")})
            </button>
          ),
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 운영시간 표 컴포넌트**

Create `components/hospitals/OperatingHoursTable.tsx`:
```tsx
import { useTranslations, useLocale } from "next-intl";
import { resolveText } from "@/lib/i18n/text";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_LABEL: Record<string, Record<string, string>> = {
  ko: { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" },
  en: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
  zh: { mon: "周一", tue: "周二", wed: "周三", thu: "周四", fri: "周五", sat: "周六", sun: "周日" },
  ja: { mon: "月", tue: "火", wed: "水", thu: "木", fri: "金", sat: "土", sun: "日" },
};

type DayHours = { open: string; close: string; closed: boolean };

export default function OperatingHoursTable({ hours }: { hours: any }) {
  const t = useTranslations("Detail");
  const locale = useLocale();
  if (!hours) return null;
  const labels = DAY_LABEL[locale] ?? DAY_LABEL.ko;
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
      <h3 className="font-bold text-lg mb-4">{t("hours")}</h3>
      <table className="w-full text-sm">
        <tbody>
          {DAYS.map((d) => {
            const dh: DayHours | undefined = hours[d];
            return (
              <tr key={d} className="border-b border-gray-50 last:border-0">
                <td className="py-2 font-medium text-gray-700 w-16">{labels[d]}</td>
                <td className="py-2 text-gray-600">
                  {!dh || dh.closed ? t("closed") : `${dh.open} ~ ${dh.close}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {hours.note && resolveText(hours.note, locale) && (
        <p className="text-xs text-gray-400 mt-3">{t("note")}: {resolveText(hours.note, locale)}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 7: 상세 페이지에 메신저·운영시간 삽입**

`app/[locale]/hospitals/[id]/page.tsx`에서:
- import 추가: `import MessengerButtons from "@/components/hospitals/MessengerButtons";`, `import OperatingHoursTable from "@/components/hospitals/OperatingHoursTable";`, `import TierBadge from "@/components/hospitals/TierBadge";`
- 시술 가격표 섹션(주요 시술 가격 블록)의 닫는 `)}` 다음에 추가:
```tsx
        <OperatingHoursTable hours={hospital.operatingHours} />
        <MessengerButtons messengers={hospital.messengers as Record<string, string>} />
        {hospital.tier === "BENEFIT" && resolveText(hospital.benefits, locale) && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-4">
            <h3 className="font-bold text-lg mb-2 text-amber-800">★ {/* Tier.benefitsTitle */}</h3>
            <p className="text-gray-700 text-sm whitespace-pre-line">{resolveText(hospital.benefits, locale)}</p>
          </div>
        )}
```
- 히어로 제목 옆에 등급 배지: `<h2 ...>{resolveText(hospital.name, locale)}</h2>` 뒤에 `<TierBadge tier={hospital.tier} />` 추가(헤더 영역). benefitsTitle은 server 컴포넌트이므로 `getTranslations("Tier")`로 가져와 라벨 대체(또는 간단히 "Benefits" 텍스트). getTranslations 사용 시: 함수 상단에서 `const tt = await getTranslations("Tier");` 후 `★ {tt("benefitsTitle")}`.

- [ ] **Step 8: 빌드 + 커밋**

Run: `npm run build` (성공)
```bash
git add lib/messengers.ts lib/messengers.test.ts components/hospitals/MessengerButtons.tsx components/hospitals/OperatingHoursTable.tsx "app/[locale]/hospitals/[id]/page.tsx"
git commit -m "feat(detail): 메신저 click-to-chat 딥링크(TDD) + 운영시간 표 + 베네핏 혜택 노출"
```

---

## Task 8: 가격비교 페이지 (카트 → /compare 나란비교)

**Files:**
- Create: `app/[locale]/compare/page.tsx`
- Modify: `components/HospitalMainSection.tsx`

- [ ] **Step 1: 비교 페이지 생성**

Create `app/[locale]/compare/page.tsx`:
```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { resolveText } from "@/lib/i18n/text";
import { Link } from "@/i18n/navigation";
import TierBadge from "@/components/hospitals/TierBadge";
import { Star, MapPin } from "lucide-react";

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { ids } = await searchParams;
  const t = await getTranslations("Compare");

  const idList = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const hospitals = idList.length
    ? await db.hospital.findMany({ where: { id: { in: idList }, isPublished: true }, include: { menus: { orderBy: { order: "asc" } } } })
    : [];
  // 입력 순서 유지
  const ordered = idList.map((id) => hospitals.find((h) => h.id === id)).filter(Boolean) as typeof hospitals;

  if (ordered.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-400 mb-6">{t("empty")}</p>
        <Link href="/hospitals" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold">{t("back")}</Link>
      </div>
    );
  }

  // 시술 카테고리 합집합
  const categories = Array.from(new Set(ordered.flatMap((h) => h.menus.map((m) => m.category))));

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-3 border-b w-40">{t("treatment")}</th>
              {ordered.map((h) => (
                <th key={h.id} className="p-3 border-b text-left align-top">
                  <div className="flex items-center gap-2 mb-1"><TierBadge tier={h.tier} /></div>
                  <Link href={`/hospitals/${h.id}`} className="font-bold hover:text-blue-600">{resolveText(h.name, locale)}</Link>
                  <div className="flex items-center text-xs text-gray-500 mt-1"><Star className="w-3 h-3 text-yellow-500 fill-current mr-1" />{h.rating} · <MapPin className="w-3 h-3 mx-1" />{h.city}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => {
              // 각 병원에서 해당 카테고리 시술 1개(첫 항목) 가격 비교
              const cells = ordered.map((h) => h.menus.find((m) => m.category === cat) ?? null);
              const prices = cells.map((m) => (m && m.price != null ? m.price : null));
              const min = Math.min(...prices.filter((p): p is number => p != null));
              return (
                <tr key={cat} className="border-b">
                  <td className="p-3 font-medium text-gray-700">{cat}</td>
                  {cells.map((m, i) => (
                    <td key={i} className={`p-3 ${m && m.price === min && prices.filter((p) => p != null).length > 1 ? "bg-green-50 font-bold text-green-700" : ""}`}>
                      {m ? (
                        <>
                          <div className="text-sm">{resolveText(m.name, locale)}</div>
                          <div className="text-sm">{resolveText(m.priceText, locale) || "-"} {m.price === min && prices.filter((p) => p != null).length > 1 ? `(${t("lowest")})` : ""}</div>
                        </>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-6"><Link href="/hospitals" className="text-blue-600 underline">{t("back")}</Link></div>
    </div>
  );
}
```

- [ ] **Step 2: 카트 "비교하기"가 /compare로 이동하도록 수정**

`components/HospitalMainSection.tsx`에서 비교 버튼 동작을 모달 대신 `/compare?ids=`로 이동하게 한다(모달은 유지하되 비교 버튼은 비교 페이지로):
- 상단 import에 `import { useRouter } from "@/i18n/navigation";` 추가, 컴포넌트에 `const router = useRouter();`.
- "비교견적 받기" 버튼의 `onClick={() => setIsModalOpen(true)}`를 `onClick={() => router.push(\`/compare?ids=${compareList.join(",")}\`)}`로 교체.
(상담 모달은 그대로 두되 진입점만 비교 페이지로 변경.)

- [ ] **Step 3: 빌드 + 커밋**

Run: `npm run build` (성공)
```bash
git add "app/[locale]/compare/page.tsx" components/HospitalMainSection.tsx
git commit -m "feat(compare): 카트 선택 병원 가격 나란비교 페이지(최저가 강조) + 카트 진입점 연결"
```

---

## Task 9: 통합 검증 + 마무리

**Files:** (검증 위주, 코드 변경 최소)

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 전부 PASS (기존 22 + tier 5 + filter 7 + messengers 6 + validation 신규 2 ≈ 42). 카운트 요약 출력.

- [ ] **Step 2: 전체 빌드 + 라우트 확인**

Run: `npm run build`
Expected: 성공. 라우트에 `/[locale]`, `/[locale]/hospitals`, `/[locale]/hospitals/[id]`, `/[locale]/compare`, `/[locale]/consult`, `/[locale]/success`, `/admin/*` 포함. 중복/충돌 없음.

- [ ] **Step 3: 데이터·로케일 스모크**

`/tmp/p2smoke.mjs` 작성 후 `node /tmp/p2smoke.mjs`:
```js
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const r = (v, l) => (v && (v[l] || v.en || v.ko)) || "";
async function main() {
  const hs = await db.hospital.findMany({ where: { isPublished: true }, include: { menus: true } });
  console.log("published:", hs.length);
  const tiers = hs.map((h) => h.tier);
  console.log("tiers:", tiers);
  hs.forEach((h) => console.log(" -", r(h.name, "en"), "| tier:", h.tier, "| benefits.en:", r(h.benefits, "en") || "(none)", "| menus:", h.menus.length));
  if (!tiers.includes("BENEFIT")) throw new Error("FAIL: no BENEFIT tier");
  if (!hs.every((h) => ["RECOMMENDED", "PARTNER", "BENEFIT"].includes(h.tier))) throw new Error("FAIL: bad tier value");
  console.log("SMOKE OK");
  await db.$disconnect();
}
main().catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
```
Expected: "SMOKE OK", BENEFIT 등급 존재, 모든 tier 유효. 끝나면 /tmp 파일 삭제.

- [ ] **Step 4: 수동 UAT 체크리스트(사람이 `npm run dev`로)**

1. `/` 접속 → 미들웨어가 `/ko`로 리다이렉트.
2. 헤더 언어 스위처로 EN/CN/JP 전환 → URL prefix·UI 문구·병원명/소개가 해당 언어로 바뀜.
3. `/en/hospitals` 필터: 지역·진료과·등급·평점·키워드 적용 → 목록 갱신, 등급순(베네핏 먼저) 정렬·배지 표시.
4. 카드 담기(최대3) → "비교하기" → `/compare?ids=` 표에서 시술·가격 나란비교, 최저가 셀 강조.
5. 상세 페이지: 메신저 버튼(WhatsApp/LINE 등) 클릭·WeChat 복사, 운영시간 표, BENEFIT 병원 추가혜택 노출.
6. 관리자 `/admin/hospitals/[id]/edit`: 등급 변경, BENEFIT 선택 시 혜택 4언어 입력 강제, 저장 반영.
7. 기존 흐름 비회귀: 상담 신청, 관리자 CRUD 정상.

- [ ] **Step 5: 커밋(있으면)**

검증 중 수정이 없으면 커밋 생략. metadata 등 손봤으면:
```bash
git add -A
git commit -m "chore: Phase 2 통합 검증 완료"
```

---

## Self-Review 결과 (작성자 점검)

**1. Spec 커버리지**
- i18n URL 로케일(2.1–2.3) → Task 1·2 ✅
- 언어 스위처 → Task 2(LocaleSwitcher) ✅
- 등급 모델(3) → Task 3(스키마·검증·시드)·4(관리자)·5(정렬·배지) ✅
- 필터(4) → Task 6(빌더 TDD·FilterBar·페이지) ✅
- 가격비교(5) → Task 8 ✅
- 상세 메신저·운영시간(6) → Task 7 ✅
- 의료광고법(7) → Tier disclaimer(messages)·benefits 면책 영역 ✅(카피 선반영)
- 테스트(11) → tier/filter/messengers/validation TDD ✅

**2. Placeholder 스캔:** 코드 스텝에 실제 코드 포함. `{/* Tier.benefitsTitle */}` 주석은 Task 7 Step 7에서 `getTranslations("Tier")`로 대체 지시 명시함(플레이스홀더 아님). ✅

**3. 타입 일관성:** 등급 상수는 **`lib/hospital/tier.ts`의 `HOSPITAL_TIERS`가 단일 export 출처**(FilterBar가 import). validation.ts는 로컬 `VALID_TIERS` 배열로 검사만 하고 export 안 함 → 중복 export 없음. `tier`/`benefits`가 schema·types·validation·form·edit매핑·seed 전반 일치. `buildHospitalWhere`/`parseFilterParams`/`compareHospitalsByTier`/`buildMessengerLinks`/`resolveText(locale)` 명칭 일치. ✅
