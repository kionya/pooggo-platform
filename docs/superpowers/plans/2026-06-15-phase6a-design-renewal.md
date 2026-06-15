# Phase 6a — 디자인 전면 리뉴얼 (프리미엄 메디컬 트러스트) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인라인 스타일이 90+ 파일에 흩어진 현 상태를, Tailwind v4 `@theme` 디자인 토큰 + 재사용 UI 프리미티브 + 공유 헤더/푸터로 정리하고 "프리미엄 메디컬 트러스트"(Navy/Ivory/Gold/Teal · serif+Pretendard) 톤으로 전면 리뉴얼한다.

**Architecture:** Tailwind v4는 config 파일 없이 `app/globals.css`의 `@theme` 블록에 색/폰트 토큰을 정의하면 `bg-navy-900`·`text-gold-500`·`font-serif` 같은 유틸리티가 자동 생성된다. 신규 `components/ui/` 프리미티브가 인라인 스타일을 대체하고, `SiteHeader`/`SiteFooter`를 `app/[locale]/layout.tsx`에서 렌더해 모든 공개 페이지에 적용한다. 운영 로직은 건드리지 않고 비주얼만 교체한다.

**Tech Stack:** Next.js 16 App Router · React 19 · Tailwind v4 (`@tailwindcss/postcss`) · next/font/google (Noto Serif KR) + Pretendard(CDN) · lucide-react · next-intl.

**검증 방식:** 이 단계는 시각/구조 작업이라 단위테스트 대상이 아니다. 각 묶음마다 `npm run build`(타입/번들 통과) + `npm run dev` 육안 확인으로 검증한다. 기존 `npm test`(vitest)는 회귀 없음을 보장하기 위해 마지막에 그린 확인한다.

---

## File Structure

**신규 (Create):**
- `app/fonts.ts` — next/font/google Noto Serif KR 로더(`--font-serif` 변수 export)
- `components/ui/Button.tsx` · `Card.tsx` · `Badge.tsx` · `Container.tsx` · `SectionHeading.tsx` · `Field.tsx` · `Logo.tsx`
- `components/ui/index.ts` — 배럴 export
- `components/site/SiteHeader.tsx` · `SiteFooter.tsx` · `StampChip.tsx`

**수정 (Modify):**
- `app/globals.css` — Pretendard `@import` + `@theme` 토큰(색/폰트), Geist·dark `@media` 제거
- `app/layout.tsx` — Geist 폰트 제거, Noto Serif KR 변수 적용, body 클래스 정리
- `app/[locale]/layout.tsx` — `SiteHeader`/`SiteFooter`로 모든 공개 페이지 래핑
- `app/[locale]/page.tsx` — 인라인 헤더/푸터 제거, 토큰/프리미티브 적용
- `app/[locale]/hospitals/page.tsx` · `hospitals/[id]/page.tsx`
- `components/hospitals/TierBadge.tsx` — amber/blue/gray → gold/teal/stone 토큰
- `components/HospitalMainSection.tsx`, `components/hospitals/FilterBar.tsx`, `components/booking/BookingForm.tsx`, `components/hospitals/ReviewForm.tsx`, `components/hospitals/MessengerButtons.tsx`, `components/AccountNav.tsx`, `components/LocaleSwitcher.tsx`
- `app/[locale]/booking/page.tsx` · `compare/page.tsx` · `consult/page.tsx`
- `app/[locale]/account/login/page.tsx` · `signup/page.tsx` · `verify/page.tsx` · `verify-sent/page.tsx` · `(protected)/page.tsx` · `(protected)/layout.tsx`
- `app/admin/(protected)/layout.tsx` + admin 페이지들, `app/admin/login/page.tsx`
- `app/hospital/(protected)/layout.tsx` + hospital 페이지들, `app/hospital/login/page.tsx`, `app/hospital/register/page.tsx`

**색상 매핑 테이블 (기계적 치환 시 기준):**

| 기존 (blue/gray/amber) | 신규 토큰 |
|---|---|
| `bg-blue-600` / `hover:bg-blue-700` (primary CTA) | `bg-gold-500` `text-navy-900` / `hover:bg-gold-600` |
| `text-blue-600` / `text-blue-900` (링크/강조) | `text-teal-600` / `text-navy-900` |
| `bg-blue-50` `text-blue-600` (태그) | `bg-teal-600/10` `text-teal-700` |
| `bg-gray-900 text-white` (다크 CTA/섹션) | `bg-navy-900 text-cream` |
| `bg-white` (카드 surface) | `bg-cream` |
| 페이지 `bg-white`/`bg-gray-50` 배경 | `bg-ivory` |
| `text-gray-900` 본문 헤딩 | `text-navy-900` + 헤딩에 `font-serif` |
| `text-gray-500/600` 보조 | `text-stone-500/600` |
| `border-gray-100/200` | `border-stone-200` |
| amber 티어(BENEFIT) | `gold`, blue 티어(PARTNER) → `teal`, gray(RECOMMENDED) → `stone` |
| 에러 `bg-red-50 border-red-200 text-red-700` | `bg-clay-600/10 border-clay-600/30 text-clay-700` |

---

## Task 1: 디자인 토큰 + 폰트

**Files:**
- Create: `app/fonts.ts`
- Modify: `app/globals.css`, `app/layout.tsx`

- [ ] **Step 1: Noto Serif KR 폰트 로더 생성**

Create `app/fonts.ts`:
```ts
import { Noto_Serif_KR } from "next/font/google";

// CJK 폰트는 용량이 커 preload 비활성(요청 시 swap). --font-serif 변수로 노출.
export const notoSerifKr = Noto_Serif_KR({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-serif-kr",
});
```

- [ ] **Step 2: globals.css 를 토큰 시스템으로 교체**

Replace entire `app/globals.css` with:
```css
@import url("https://fastly.jsdelivr.net/gh/orioncactus/pretendard@latest/dist/web/variable/pretendardvariable.min.css");
@import "tailwindcss";

@theme {
  /* Brand palette — Premium Medical Trust */
  --color-navy-900: #0b1f3a;
  --color-navy-700: #15355c;
  --color-ivory: #f7f4ec;
  --color-cream: #fffdf8;
  --color-gold-500: #c8a24b;
  --color-gold-600: #a9863a;
  --color-teal-600: #1f6f6b;
  --color-teal-700: #185955;
  --color-clay-600: #b4532f;
  --color-clay-700: #8f4126;

  /* Typography */
  --font-sans: "Pretendard Variable", Pretendard, "Noto Sans KR", "Noto Sans JP",
    system-ui, -apple-system, sans-serif;
  --font-serif: var(--font-serif-kr), "Noto Serif KR", Georgia, serif;

  /* Elevation */
  --shadow-card: 0 1px 2px rgba(11, 31, 58, 0.04), 0 4px 16px rgba(11, 31, 58, 0.06);
  --shadow-float: 0 8px 30px rgba(11, 31, 58, 0.12);
}

body {
  background: var(--color-ivory);
  color: var(--color-navy-900);
  font-family: var(--font-sans);
}
```

> 주의: `@import` 규칙은 반드시 파일 최상단(다른 규칙 앞)에 와야 한다. 기존 `:root`/dark `@media`/Geist `--font-sans` 정의는 전부 제거한다.

- [ ] **Step 3: 루트 레이아웃에서 Geist 제거 + Noto Serif KR 변수 적용**

Modify `app/layout.tsx` — 기존 Geist import/변수 제거 후:
```tsx
import type { Metadata } from "next";
import { notoSerifKr } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "PooGGo Global — K-Medical Concierge",
  description: "Trusted concierge for international patients seeking Korean medical & beauty care.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={notoSerifKr.variable}>
      <body>{children}</body>
    </html>
  );
}
```
> 기존 파일의 다른 import(있다면)와 충돌하지 않게 Geist 관련 라인만 교체한다. `notoSerifKr.variable`을 `<html>`에 부여해야 `--font-serif-kr`가 살아난다.

- [ ] **Step 4: 빌드로 토큰/폰트 검증**

Run: `npm run build`
Expected: PASS (타입/번들 에러 없음). 실패 시 globals.css `@import` 순서·`@theme` 문법 확인.

- [ ] **Step 5: Commit**
```bash
git add app/fonts.ts app/globals.css app/layout.tsx
git commit -m "feat(design): Tailwind v4 @theme 토큰 + Noto Serif KR/Pretendard 폰트 적용"
```

---

## Task 2: UI 프리미티브

**Files:**
- Create: `components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`, `Container.tsx`, `SectionHeading.tsx`, `Field.tsx`, `Logo.tsx`, `index.ts`

- [ ] **Step 1: Button**

Create `components/ui/Button.tsx`:
```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory";

const variants: Record<Variant, string> = {
  primary: "bg-gold-500 text-navy-900 hover:bg-gold-600",
  secondary: "border border-navy-900/20 bg-cream text-navy-900 hover:bg-stone-100",
  ghost: "text-navy-900 hover:bg-stone-100",
  danger: "bg-clay-600 text-white hover:bg-clay-700",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className = "", ...props },
  ref,
) {
  return (
    <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
  );
});
```

- [ ] **Step 2: Card / Container / SectionHeading**

Create `components/ui/Card.tsx`:
```tsx
import { type HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-cream border border-stone-200 rounded-2xl shadow-[var(--shadow-card)] ${className}`}
      {...props}
    />
  );
}
```

Create `components/ui/Container.tsx`:
```tsx
import { type HTMLAttributes } from "react";

export function Container({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`} {...props} />;
}
```

Create `components/ui/SectionHeading.tsx`:
```tsx
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  const a = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`max-w-2xl ${a}`}>
      {eyebrow ? (
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-gold-600 mb-3">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="font-serif text-3xl md:text-4xl font-bold text-navy-900 leading-tight">{title}</h2>
      {subtitle ? <p className="mt-4 text-stone-600 leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}
```

- [ ] **Step 3: Badge**

Create `components/ui/Badge.tsx`:
```tsx
import { type HTMLAttributes } from "react";

type Tone = "gold" | "teal" | "stone" | "clay" | "navy";

const tones: Record<Tone, string> = {
  gold: "bg-gold-500/15 text-gold-600 border-gold-500/30",
  teal: "bg-teal-600/10 text-teal-700 border-teal-600/30",
  stone: "bg-stone-100 text-stone-600 border-stone-200",
  clay: "bg-clay-600/10 text-clay-700 border-clay-600/30",
  navy: "bg-navy-900/10 text-navy-900 border-navy-900/20",
};

export function Badge({
  tone = "stone",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Field (label+input+error)**

Create `components/ui/Field.tsx`:
```tsx
import { type ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  required,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-navy-900">
        {label} {required ? <span className="text-clay-600">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-stone-500">{hint}</p> : null}
      {error ? <p className="text-xs text-clay-700">{error}</p> : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-cream px-3 py-2.5 text-navy-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-600/40";
```

- [ ] **Step 5: Logo**

Create `components/ui/Logo.tsx`:
```tsx
export function Logo({ variant = "default" }: { variant?: "default" | "inverse" }) {
  const wordmark = variant === "inverse" ? "text-cream" : "text-navy-900";
  const dot = variant === "inverse" ? "text-gold-500" : "text-gold-600";
  return (
    <span className={`font-serif text-2xl font-bold tracking-tight ${wordmark}`}>
      PooGGo<span className={dot}>.</span>
    </span>
  );
}
```

- [ ] **Step 6: 배럴 export**

Create `components/ui/index.ts`:
```ts
export { Button } from "./Button";
export { Card } from "./Card";
export { Badge } from "./Badge";
export { Container } from "./Container";
export { SectionHeading } from "./SectionHeading";
export { Field, inputClass } from "./Field";
export { Logo } from "./Logo";
```

- [ ] **Step 7: 빌드 검증 + Commit**

Run: `npm run build`
Expected: PASS.
```bash
git add components/ui
git commit -m "feat(design): 재사용 UI 프리미티브(Button/Card/Badge/Field/Container/SectionHeading/Logo)"
```

---

## Task 3: 공유 헤더/푸터 + 스탬프 칩(placeholder)

**Files:**
- Create: `components/site/SiteHeader.tsx`, `SiteFooter.tsx`, `StampChip.tsx`
- Modify: `app/[locale]/layout.tsx`

- [ ] **Step 1: StampChip (잔액은 optional — 6b에서 주입)**

Create `components/site/StampChip.tsx`:
```tsx
import { Link } from "@/i18n/navigation";
import { Ticket } from "lucide-react";

// balance가 null/undefined(비로그인 또는 미주입)면 렌더하지 않는다.
export function StampChip({ balance, goal = 10 }: { balance?: number | null; goal?: number }) {
  if (balance === null || balance === undefined) return null;
  return (
    <Link
      href="/account/stamps"
      className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 text-sm font-bold text-gold-600 hover:bg-gold-500/20"
    >
      <Ticket className="h-4 w-4" />
      {Math.min(balance, goal)}/{goal}
    </Link>
  );
}
```

- [ ] **Step 2: SiteHeader**

Create `components/site/SiteHeader.tsx`:
```tsx
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import AccountNav from "@/components/AccountNav";
import { Logo } from "@/components/ui/Logo";
import { StampChip } from "./StampChip";

export async function SiteHeader({ stampBalance }: { stampBalance?: number | null }) {
  const t = await getTranslations("Home");
  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 bg-ivory/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="PooGGo home">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex">
            <LocaleSwitcher />
          </div>
          <StampChip balance={stampBalance} />
          <AccountNav />
          <Link
            href="/booking"
            className="rounded-full bg-navy-900 px-5 py-2 text-sm font-bold text-cream transition-colors hover:bg-navy-700"
          >
            {t("bookConsultation")}
          </Link>
        </div>
      </div>
    </header>
  );
}
```
> `AccountNav`/`LocaleSwitcher`는 기존 컴포넌트 재사용. 만약 client component라 `await` 불가하면 그대로 JSX로 렌더하면 됨(서버 컴포넌트 안에서 client 컴포넌트 사용 가능).

- [ ] **Step 3: SiteFooter (홈 인라인 푸터 추출)**

Create `components/site/SiteFooter.tsx`:
```tsx
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui/Logo";

export async function SiteFooter() {
  const f = await getTranslations("Footer");
  return (
    <footer className="border-t border-stone-200 bg-cream px-4 py-12 text-sm text-stone-600 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 md:flex-row">
        <div>
          <Logo />
          <p className="mb-2 mt-4">{f("address")}</p>
          <p>{f("regNo")}</p>
          <p className="mt-1 text-xs text-stone-400">{f("agencyNotice")}</p>
        </div>
        <div className="md:text-right">
          <p className="mb-2 font-bold text-navy-900">{f("customerCenter")}</p>
          <p className="mb-1 text-lg font-bold text-navy-900">{f("phone")}</p>
          <p className="text-xs">{f("hours")}</p>
          <p className="mt-8 text-xs text-stone-400">{f("rights")}</p>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: locale 레이아웃에서 헤더/푸터 래핑**

Modify `app/[locale]/layout.tsx` — provider 내부를 header/main/footer로 감싼다:
```tsx
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

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
  return (
    <NextIntlClientProvider>
      <div className="flex min-h-screen flex-col bg-ivory">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </NextIntlClientProvider>
  );
}
```
> 6b에서 이 레이아웃이 `auth()`+`getBalance()`로 `stampBalance`를 계산해 `<SiteHeader stampBalance={...} />`로 주입한다. 6a에서는 미주입(칩 숨김).

- [ ] **Step 5: 빌드 검증 + Commit**

Run: `npm run build`
Expected: PASS.
```bash
git add components/site app/[locale]/layout.tsx
git commit -m "feat(design): 공유 SiteHeader/SiteFooter + StampChip(placeholder), locale 레이아웃 적용"
```

---

## Task 4: 홈페이지 리뉴얼

**Files:**
- Modify: `app/[locale]/page.tsx`

- [ ] **Step 1: 인라인 헤더/푸터 제거 + 프리미티브/토큰 적용**

Replace `app/[locale]/page.tsx` body (헤더/푸터는 layout이 담당하므로 삭제):
```tsx
import { Calendar, ShieldCheck, Plane, Languages, HeartHandshake } from "lucide-react";
import HospitalMainSection from "@/components/HospitalMainSection";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  const cards = [
    { icon: Languages, title: t("translator"), desc: t("translatorDesc") },
    { icon: Plane, title: t("pickup"), desc: t("pickupDesc") },
    { icon: HeartHandshake, title: t("taxRefund"), desc: t("taxRefundDesc") },
    { icon: ShieldCheck, title: t("safety"), desc: t("safetyDesc") },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-24 pt-20 sm:px-6">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-cream to-ivory" />
        <Container className="max-w-4xl text-center">
          <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1.5 text-sm font-bold text-gold-600">
            <ShieldCheck className="h-4 w-4" /> {t("heroBadge")}
          </span>
          <h1 className="font-serif text-4xl font-bold leading-tight text-navy-900 md:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mb-10 mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
            {t("heroSubtitle")}
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/hospitals">
                <Calendar className="h-5 w-5" /> {t("ctaFind")}
              </Link>
            </Button>
          </div>
        </Container>
      </section>

      {/* Concierge process */}
      <section id="process" className="px-4 py-20 sm:px-6">
        <Container>
          <SectionHeading title={t("conciergeTitle")} subtitle={t("conciergeSubtitle")} />
          <div className="mt-14 grid gap-6 md:grid-cols-4">
            {cards.map((item, idx) => (
              <Card key={idx} className="p-6 transition-transform duration-300 hover:-translate-y-1">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-teal-600/10">
                  <item.icon className="h-7 w-7 text-teal-700" />
                </div>
                <h3 className="mb-3 text-lg font-bold text-navy-900">{item.title}</h3>
                <p className="text-sm leading-relaxed text-stone-600">{item.desc}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <HospitalMainSection />

      {/* Partners */}
      <section className="bg-navy-900 px-4 py-16 text-center text-cream sm:px-6">
        <Container className="max-w-5xl">
          <h2 className="font-serif text-2xl font-bold">{t("partnersTitle")}</h2>
          <p className="mt-4 text-sm text-stone-300">{t("partnersNote")}</p>
        </Container>
      </section>
    </>
  );
}
```
> 주의: `Button`에 `asChild`를 쓰려면 Task 2의 Button이 children으로 `<Link>`를 감싸야 한다. **`asChild`는 Task 2 Button에 없다** → 대신 아래 Step 2처럼 Button 대신 Link에 직접 스타일을 주거나, Task 2 Button에 asChild 지원을 추가한다. 본 플랜은 **Step 2에서 Button을 asChild 지원하도록 확장**한다.

- [ ] **Step 2: Button에 asChild(링크 겸용) 지원 추가**

Modify `components/ui/Button.tsx` — `Slot` 없이 간단히 처리(자식이 링크일 때 스타일만 합성). 파일을 다음으로 교체:
```tsx
import { forwardRef, cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactElement } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory";
const variants: Record<Variant, string> = {
  primary: "bg-gold-500 text-navy-900 hover:bg-gold-600",
  secondary: "border border-navy-900/20 bg-cream text-navy-900 hover:bg-stone-100",
  ghost: "text-navy-900 hover:bg-stone-100",
  danger: "bg-clay-600 text-white hover:bg-clay-700",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", asChild = false, className = "", children, ...props },
  ref,
) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, { className: `${cls} ${child.props.className ?? ""}`.trim() });
  }
  return (
    <button ref={ref} className={cls} {...props}>
      {children}
    </button>
  );
});
```

- [ ] **Step 3: 빌드 + 육안 확인**

Run: `npm run build` → PASS.
Run: `npm run dev`, 열기 `http://localhost:3000/ko` — 아이보리 배경, serif 헤드라인, gold CTA, sticky 헤더 확인.

- [ ] **Step 4: Commit**
```bash
git add app/[locale]/page.tsx components/ui/Button.tsx
git commit -m "feat(design): 홈페이지 리뉴얼 + Button asChild 지원"
```

---

## Task 5: 병원 목록/상세 + TierBadge

**Files:**
- Modify: `components/hospitals/TierBadge.tsx`, `components/HospitalMainSection.tsx`, `components/hospitals/FilterBar.tsx`, `app/[locale]/hospitals/page.tsx`, `app/[locale]/hospitals/[id]/page.tsx`

- [ ] **Step 1: TierBadge 토큰화**

`components/hospitals/TierBadge.tsx` 의 스타일 맵을 신규 Badge tone으로 교체. 핵심은 BENEFIT→gold, PARTNER→teal, RECOMMENDED→stone. 기존 구조 유지하되 className을 다음 매핑으로 치환:
```tsx
// 기존 STYLE 객체를 아래로 교체 (라벨/구조는 유지)
const STYLE: Record<string, string> = {
  BENEFIT: "bg-gold-500/15 text-gold-600 border border-gold-500/30",
  PARTNER: "bg-teal-600/10 text-teal-700 border border-teal-600/30",
  RECOMMENDED: "bg-stone-100 text-stone-600 border border-stone-200",
};
// 컨테이너 className: `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${STYLE[tier] ?? STYLE.RECOMMENDED}`
```
> 실제 파일의 변수명/JSX에 맞춰 STYLE 매핑 값만 바꾼다. amber/blue/gray 클래스 제거.

- [ ] **Step 2: 병원 목록 페이지 + 카드 섹션 색상 매핑 적용**

`app/[locale]/hospitals/page.tsx`, `components/HospitalMainSection.tsx`, `components/hospitals/FilterBar.tsx`에 상단 **색상 매핑 테이블**을 기계적으로 적용:
- 페이지 배경 → `bg-ivory`
- 카드 컨테이너 → `Card`(또는 `bg-cream border-stone-200 rounded-2xl shadow-[var(--shadow-card)]`)
- 태그칩 `bg-blue-50 text-blue-600` → `bg-teal-600/10 text-teal-700`
- 별점 `text-yellow-500` 유지(평점 시인성), 보조 텍스트 `text-gray-*` → `text-stone-*`
- sticky 비교 카트 CTA `bg-blue-600` → `bg-gold-500 text-navy-900`
- 필터 라벨 `text-gray-500` → `text-stone-500`, input border → `border-stone-300`

- [ ] **Step 3: 병원 상세 페이지 매핑 적용**

`app/[locale]/hospitals/[id]/page.tsx`:
- 헤딩에 `font-serif text-navy-900`
- 의사/메뉴/리뷰 카드 → `Card`
- BENEFIT 혜택 박스(현 amber): `bg-gold-500/10 border border-gold-500/30 text-navy-900`, 제목 `text-gold-600`
- 가격표/리뷰 섹션 보조색 stone 계열
- CTA/메신저 버튼 → `Button` 또는 gold/teal 토큰

- [ ] **Step 4: 빌드 + 육안 확인 + Commit**

Run: `npm run build` → PASS. `/ko/hospitals`, `/ko/hospitals/<slug>` 확인.
```bash
git add components/hospitals/TierBadge.tsx components/HospitalMainSection.tsx components/hospitals/FilterBar.tsx app/[locale]/hospitals
git commit -m "feat(design): 병원 목록/상세/TierBadge 리뉴얼"
```

---

## Task 6: 예약/비교/상담 + 계정/인증

**Files:**
- Modify: `app/[locale]/booking/page.tsx`, `components/booking/BookingForm.tsx`, `app/[locale]/compare/page.tsx`, `app/[locale]/consult/page.tsx`, `components/hospitals/ReviewForm.tsx`, `components/hospitals/MessengerButtons.tsx`, `app/[locale]/account/login/page.tsx`, `signup/page.tsx`, `verify/page.tsx`, `verify-sent/page.tsx`, `(protected)/page.tsx`, `(protected)/layout.tsx`, `components/AccountNav.tsx`, `components/LocaleSwitcher.tsx`

- [ ] **Step 1: 폼 컴포넌트에 Field/inputClass/Button 적용**

`BookingForm.tsx`, `ReviewForm.tsx`: 인라인 input/select/textarea를 `inputClass`로, 라벨을 `Field`로, 제출 버튼을 `Button`으로 교체. 에러 박스는 `bg-clay-600/10 border-clay-600/30 text-clay-700`.

- [ ] **Step 2: 계정/인증 페이지 카드 레이아웃 통일**

`account/login|signup|verify|verify-sent`: 중앙 카드(`Card` + `max-w-sm mx-auto`), 배경 `bg-ivory`, 입력 `inputClass`, 버튼 `Button`, 에러 토큰 적용. `(protected)/page.tsx`(대시보드)·`(protected)/layout.tsx`: 카드/토큰 적용, 로그아웃 버튼 `Button variant="secondary"`.

- [ ] **Step 3: AccountNav / LocaleSwitcher / MessengerButtons 색상 매핑**

링크/버튼 색을 navy/teal/gold 토큰으로. 매핑 테이블 기준 적용.

- [ ] **Step 4: 비교/상담 페이지 매핑 적용**

`compare/page.tsx`(비교표 하이라이트 `bg-yellow-50` → `bg-gold-500/10`), `consult/page.tsx` 토큰 적용.

- [ ] **Step 5: 빌드 + 육안 + Commit**

Run: `npm run build` → PASS. `/ko/booking`, `/ko/account/login`, `/ko/compare` 확인.
```bash
git add app/[locale]/booking app/[locale]/compare app/[locale]/consult app/[locale]/account components/booking components/hospitals/ReviewForm.tsx components/hospitals/MessengerButtons.tsx components/AccountNav.tsx components/LocaleSwitcher.tsx
git commit -m "feat(design): 예약/비교/상담/계정/인증 화면 리뉴얼"
```

---

## Task 7: 관리자 포털 리뉴얼

**Files:**
- Modify: `app/admin/(protected)/layout.tsx`, `app/admin/login/page.tsx`, `app/admin/(protected)/page.tsx`(대시보드), `hospitals/page.tsx`, `hospitals/new/page.tsx`, `hospitals/[id]/edit/page.tsx`, `bookings/page.tsx`, `consultations/page.tsx`, `accounts/page.tsx`, `reviews/page.tsx`, `components/admin/HospitalForm.tsx`, `I18nField.tsx`, `DeleteHospitalButton.tsx`

- [ ] **Step 1: admin 레이아웃 nav 토큰화**

`app/admin/(protected)/layout.tsx`: 상단 nav `bg-navy-900 text-cream`, 활성 링크 `text-gold-500`, 본문 영역 `bg-ivory`. `next/link` 유지(포털은 비로컬라이즈).

- [ ] **Step 2: admin 페이지/폼 매핑 적용**

전 admin 페이지: 컨테이너 `bg-cream` 카드, 버튼 `Button`(hide=secondary, delete=danger, approve=primary), 입력 `inputClass`. `I18nField` 활성탭 `bg-blue-600` → `bg-navy-900 text-cream`, 미완성 표시 `text-clay-600`. 대시보드 카운트 카드 토큰화.

- [ ] **Step 3: 빌드 + 육안 + Commit**

Run: `npm run build` → PASS. `/admin/login`, `/admin` 확인.
```bash
git add app/admin components/admin
git commit -m "feat(design): 관리자 포털 리뉴얼"
```

---

## Task 8: 병원 포털 리뉴얼

**Files:**
- Modify: `app/hospital/(protected)/layout.tsx`, `app/hospital/login/page.tsx`, `app/hospital/register/page.tsx`, `register/success/page.tsx`, `(protected)/page.tsx`, `profile/page.tsx`, `bookings/page.tsx`

- [ ] **Step 1: hospital 레이아웃 + 페이지 매핑 적용**

admin과 동일 패턴(nav `bg-navy-900 text-cream`, 본문 `bg-ivory`, 카드 `bg-cream`, 버튼/입력 프리미티브). `next/link` 유지.

- [ ] **Step 2: 빌드 + 육안 + Commit**

Run: `npm run build` → PASS. `/hospital/login`, `/hospital` 확인.
```bash
git add app/hospital
git commit -m "feat(design): 병원 포털 리뉴얼"
```

---

## Task 9: 회귀 검증 + 마무리

- [ ] **Step 1: 전체 빌드 + 테스트 그린**

Run: `npm run build` → PASS.
Run: `npm test` → 기존 vitest 전부 PASS(디자인 변경이 lib 로직을 깨지 않았음 확인).

- [ ] **Step 2: 잔여 blue/amber 색상 스캔**

Run: `grep -rnE "blue-[0-9]|amber-[0-9]|bg-gray-900|text-gray-900" app components | grep -v node_modules`
Expected: 의도된 잔여(별점 yellow 등) 외 brand 외 색상이 남지 않았는지 확인. 남으면 매핑 테이블로 정리.

- [ ] **Step 3: 최종 Commit (잔여 정리분이 있으면)**
```bash
git add -A
git commit -m "chore(design): 잔여 색상 토큰 정리 + 회귀 검증"
```

---

## Self-Review 메모 (작성자 확인 완료)
- 스펙 §3(디자인 시스템) 전 항목 → Task 1~3에서 토큰·폰트·프리미티브·헤더/푸터로 커버.
- 스펙 §3.3(범위: 공개/관리자/병원) → Task 4~8.
- StampChip은 6a에서 placeholder(잔액 미주입), 6b에서 실주입 — 의존 방향 단방향.
- `Button.asChild`는 Task 4 Step 2에서 도입(홈 CTA 링크용) — 이후 모든 링크형 버튼에 사용.
- 운영 로직 무변경: 액션/가드/스키마 미수정, 시각/마크업만 교체.
