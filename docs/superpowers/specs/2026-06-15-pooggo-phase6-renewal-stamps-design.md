# PooGGo Phase 6 — 디자인 전면 리뉴얼 + 통합 스탬프(이용쿠폰) 서비스

- **작성일**: 2026-06-15
- **상태**: 설계 확정 (구현 전)
- **선행 단계**: phase1~5c (글로벌 허브 · 디스커버리 · 예약 · 컴플라이언스/i18n · 인증 · 테넌시 · 하드닝)
- **전제 결정** (사용자 확정):
  - 디자인 방향 = **프리미엄 메디컬 트러스트** (Navy/Ivory/Gold + Teal, serif display + Pretendard body)
  - 쿠폰/스탬프 대상 = **외국인환자 전용** (의료관광 규율 적용)
  - 적립 단위 = **통합 스탬프 1통장** (10개 모으면 베네핏 병원 선택 → 무료시술 교환)
  - 범위 = **공개 사이트 + 관리자 + 병원 포털 전부**
  - 적립 금액·자동화 규칙은 **추후 설계** → 본 단계는 골격(수동 발급 + 교환 전체 흐름)만 구현

---

## 1. 목표 / 비목표

### 목표
1. 인라인 스타일이 90+ 파일에 흩어진 현 상태를 **디자인 토큰 + 공유 UI 프리미티브**로 정리하고, 프리미엄 메디컬 트러스트 톤으로 **전면 리뉴얼**한다.
2. 외국인환자 대상 **통합 스탬프(이용쿠폰) 서비스**를 추가한다: 스탬프 적립 → 10개 도달 → 베네핏 병원 선택 → 무료시술 교환 신청/처리.
3. 운영 프로세스(리뷰 모더레이션, 예약 상태머신, 역할 가드, i18n, 계정 상태 게이트)는 **그대로 보존**한다.
4. 의료광고법(외국인환자 유치 규율)을 준수하는 카피/구조로 구현한다.

### 비목표 (이번 단계에서 하지 않음)
- 스탬프 **자동 적립 규칙·금액·수수료(Settlement) 연동** 확정 — placeholder/수동만.
- 다크모드 활성화(토큰은 라이트 우선; 다크는 후순위).
- 병원 포털의 교환 **완료처리 액션**(1차는 읽기 전용, 관리자가 완료 처리).
- 결제/실제 정산 로직.
- 폰트 CJK(ja/zh) 정밀 서브셋 최적화(폴백 스택으로 1차 처리).

---

## 2. 현재 상태 요약 (구현 시 반드시 준수)

- **스택**: Next.js 16 (App Router) · React 19 · Tailwind v4(`@tailwindcss/postcss`, **config 파일 없음**) · Prisma + PostgreSQL(Vercel) · NextAuth v5(beta) · next-intl v4.
- **라우팅**: 공개는 `app/[locale]/*` (locales: `ko`(기본)/`en`/`zh`/`ja`). `/admin`·`/hospital`은 **비로컬라이즈** 포털 (middleware matcher에서 제외).
- **i18n 텍스트**: `Hospital.name/intro/about/address/cautions/benefits` 등은 JSON `{ko,en,zh,ja}`. 표시 시 `resolveText(value, lang)` 사용(`lib/i18n/text.ts`). 폼은 `isCompleteI18n`로 4언어 강제.
- **인증**: `const session = await auth()` → `session.user.{id,role,hospitalId}`. 역할 가드 `requirePatient()/requireHospital()/requireRole([...])` (`lib/auth/guard.ts`)는 실패 시 redirect — **반드시 await, 조건부 호출 금지**.
- **DB 클라이언트**: `import { db } from "@/lib/db"`.
- **서버액션 규약**: `{ ok, errors: string[] }` 튜플 반환, 변경 후 `revalidatePath`.
- **테스트**: vitest. `lib/**`에 순수 함수 + `*.test.ts` 단위테스트 패턴 존재(예: `lib/booking/status.test.ts`).
- **i18n 라우팅 컴포넌트**: 공개 페이지는 `@/i18n/navigation`의 `Link`(NOT `next/link`). 포털은 `next/link`.

### 핵심 주의 (gotchas)
- 모든 `[locale]` 라우트의 `params`는 **Promise** → `const { locale } = await params` 후 `setRequestLocale(locale)`.
- `getHospitalById`는 `menus`/`doctors`를 명시 include 해야 상세에 표시됨.
- 병원 삭제는 트랜잭션 cascade(리뷰/메뉴/닥터 삭제, Lead.hospitalId null) — **신규 Redemption FK가 삭제를 막지 않도록** `onDelete` 정책을 명시한다(아래 5절).
- TypeScript build 에러 무시 설정 → 런타임 안전은 테스트로 보장.

---

## 3. 디자인 시스템

### 3.1 토큰 (`app/globals.css` 의 `@theme`)
Tailwind v4 방식으로 `@theme`에 브랜드 토큰을 정의(별도 config 파일 없이).

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-navy-900` | `#0B1F3A` | foreground/브랜드 딥 |
| `--color-navy-700` | `#15355C` | 헤더/딥 섹션 |
| `--color-ivory` | `#F7F4EC` | 페이지 background |
| `--color-cream` | `#FFFDF8` | 카드 surface |
| `--color-gold-500` | `#C8A24B` | primary CTA/강조 |
| `--color-gold-600` | `#A9863A` | CTA hover |
| `--color-teal-600` | `#1F6F6B` | secondary/링크 |
| `--color-clay-600` | `#B4532F` | danger |
| `--color-stone-*` | warm gray 스케일 | 중립 텍스트/보더 |
| `--font-serif` | Noto Serif KR, Georgia, serif | display/헤드라인 |
| `--font-sans` | Pretendard, "Noto Sans KR", "Noto Sans JP", system-ui, sans-serif | body |
| `--radius` / `--radius-pill` | `0.75rem` / `999px` | 모서리 |
| `--shadow-card` / `--shadow-float` | soft 2단계 | 그림자 |

- 폰트: **Noto Serif KR**은 `next/font/google`로 self-host(`--font-serif` 변수), **Pretendard**는 globals.css 상단 CDN `@import`(폴백 스택 명시). 기존 Geist 변수는 제거.
- 다크모드 `@media` 블록은 **제거 또는 보류**(미사용 + 컴포넌트에 `dark:` 없음).

### 3.2 공유 UI 프리미티브 (`components/ui/`)
각 컴포넌트는 단일 책임 · 토큰 기반 · 인라인 스타일 대체용.

| 컴포넌트 | 역할 |
|---|---|
| `Button.tsx` | variant: `primary`(gold)·`secondary`(navy outline)·`ghost`·`danger`, size, `asChild`(링크 겸용) |
| `Card.tsx` | cream surface + shadow-card + radius |
| `Badge.tsx` | tier/status 배지 (TierBadge가 내부 사용하도록 통일) |
| `Field.tsx` | label + input/select/textarea + error 표시(폼 일관성) |
| `Container.tsx` | max-width + padding 래퍼 |
| `SectionHeading.tsx` | serif 헤딩 + subcopy |
| `Logo.tsx` | PooGGo 워드마크(SVG inline, 단색/역상 variant) |
| `SiteHeader.tsx` | 공개 사이트 공통 헤더 — 로고 · LocaleSwitcher · AccountNav · **StampChip** · 예약 CTA |
| `SiteFooter.tsx` | 공개 사이트 공통 푸터(현 홈 인라인 푸터 추출) |
| `StampChip.tsx` | 로그인 환자에게 `🎫 N/10` 표시, 스탬프 페이지 링크(서버에서 잔액 주입) |

> 헤더/푸터는 현재 `app/[locale]/page.tsx`에 인라인. 공통 컴포넌트로 추출하여 모든 `[locale]` 페이지에서 재사용한다.

### 3.3 적용 범위별 처리
- **공개 `[locale]`**: 홈·hospitals(list)·hospitals/[id]·booking(+success)·compare·consult·account(login/signup/verify/대시보드)·success → 풀 리스타일.
- **관리자 `/admin`**: layout nav + 페이지 카드/버튼/폼을 프리미티브/토큰으로 통일(내부용이라 픽셀 완성도보다 일관성 우선).
- **병원 포털 `/hospital`**: 동일 토큰 적용.
- **TierBadge**: BENEFIT=gold, PARTNER=teal, RECOMMENDED=stone 으로 토큰화(기존 amber/blue/gray 대체).

---

## 4. 통합 스탬프 — 도메인 개념

- 사용자(환자)는 **단일 통합 스탬프 통장**을 가진다. 잔액 = `sum(StampEvent.delta)`.
- 스탬프가 **`STAMP_GOAL`(=10)** 에 도달하면 **무료시술 교환(Redemption)** 을 신청할 수 있다.
- 교환 신청 시 **`REDEEM_COST`(=10)** 만큼 즉시 차감(hold) → 관리자 승인/거절 → 거절·취소 시 환급.
- 교환 대상 병원은 **`tier === "BENEFIT"` & `isPublished`** 인 병원만.
- 금액/적립규칙은 `lib/stamps/config.ts` 상수로 분리하고 **"⚠️ 금액·규칙 추후 확정"** 주석.

---

## 5. 데이터 모델 (Prisma 신규)

```prisma
// 스탬프 원장 — 통합 1통장: 잔액 = sum(delta)
model StampEvent {
  id           String      @id @default(uuid())
  userId       String
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  delta        Int         // +1 적립 / -10 교환차감 / +10 환급 / ± 보정
  reason       String      // EARN_BOOKING | EARN_REVIEW | ADMIN_GRANT | REDEEM | REFUND | ADJUST
  sourceType   String?     // "Booking" | "Review" | "Redemption" | null
  sourceId     String?
  note         String?
  adminId      String?     // 발급/보정한 관리자 user id
  redemptionId String?
  redemption   Redemption? @relation(fields: [redemptionId], references: [id], onDelete: SetNull)
  createdAt    DateTime    @default(now())

  @@index([userId])
  @@index([reason])
}

// 무료시술 교환 신청
model Redemption {
  id                 String       @id @default(uuid())
  code               String       @unique          // 병원 제시용 교환 코드
  userId             String
  user               User         @relation(fields: [userId], references: [id])
  hospitalId         String                          // 선택한 베네핏 병원
  hospital           Hospital     @relation(fields: [hospitalId], references: [id])
  stampCost          Int          @default(10)
  status             String       @default("REQUESTED") // REQUESTED→APPROVED→FULFILLED / REJECTED | CANCELLED
  note               String?      // 환자 메모(희망 시술 등)
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

**기존 모델 관계 추가**:
- `User`: `stampEvents StampEvent[]`, `redemptions Redemption[]`
- `Hospital`: `redemptions Redemption[]`

**삭제 정책 주의**: `Redemption.hospital` 관계는 기본 `Restrict`. 병원 삭제 트랜잭션(`deleteHospital`)이 Redemption 존재 시 실패할 수 있으므로, 삭제 로직에서 해당 병원의 Redemption 처리(예: 진행 중 건 차단 또는 보존 정책)를 명시한다. 1차 정책: **진행 중(REQUESTED/APPROVED) Redemption이 있으면 병원 삭제를 막고 경고**(데이터 보존 우선).

**마이그레이션**: `prisma migrate dev --name phase6_stamps` 로 생성. Vercel Postgres 대상이므로 `.env`의 `POSTGRES_PRISMA_URL`/`POSTGRES_URL_NON_POOLING` 연결 확인 후 적용. `prisma generate`는 postinstall로 자동.

---

## 6. 비즈니스 로직 (`lib/stamps/`) — 순수 함수 + 테스트

| 파일 | 내용 |
|---|---|
| `config.ts` | `STAMP_GOAL=10`, `REDEEM_COST=10`, `DEFAULT_BOOKING_STAMPS=1`, reason/상태 enum 상수. ⚠️추후확정 주석. |
| `balance.ts` | `computeBalance(events)`, `progress(balance)` → `{count, goal, remaining, complete}` (순수). |
| `balance.test.ts` | 적립/차감/환급/보정 합산, 음수 방지, 진행률 경계 테스트. |
| `redemption.ts` | `canRedeem(balance)`, `nextRedemptionStatus(current, action)` 상태머신(`approve/reject/fulfill/cancel`), `validateRedemptionInput`(hospital 선택·BENEFIT 여부), `generateRedemptionCode()`. |
| `redemption.test.ts` | 상태 전이 유효/무효, 잔액 부족 차단, BENEFIT 아닌 병원 차단. |
| `index.ts` | DB 연동 헬퍼: `getBalance(userId)`, `grantStamps({userId, delta, reason, source, adminId})`, `requestRedemption(...)`(트랜잭션: 잔액검증→Redemption생성→REDEEM 이벤트), `processRedemption(...)`(승인/거절/완료, 거절 시 REFUND 이벤트). |

상태머신(스탬프 기존 `lib/booking/status.ts` 패턴 차용):
```
REQUESTED --approve--> APPROVED --fulfill--> FULFILLED
REQUESTED --reject--> REJECTED (+REFUND)
REQUESTED --cancel(user)--> CANCELLED (+REFUND)
APPROVED  --reject--> REJECTED (+REFUND)
APPROVED  --cancel--> CANCELLED (+REFUND)
(FULFILLED/REJECTED/CANCELLED = 종단)
```

---

## 7. 서버 액션

### 공개(환자) — `app/[locale]/account/(protected)/stamps/actions.ts`
- `requestRedemptionAction(formData)`: `requirePatient()` → 잔액≥REDEEM_COST & 병원 BENEFIT 검증 → `requestRedemption()` 트랜잭션 → revalidate. `{ok,errors}`.
- `cancelRedemptionAction(id)`: 본인 소유 & REQUESTED/APPROVED 상태만 → CANCELLED + 환급.

### 관리자 — `app/admin/stamp-actions.ts`
- `grantStampsAction(formData)`: `requireRole(['SUPER_ADMIN'])` → 이메일로 유저 조회 → `grantStamps(ADMIN_GRANT 또는 ADJUST)`.
- `processRedemptionAction(id, action)`: 승인/거절/완료 (`approve|reject|fulfill`), 상태머신 검증, 거절 시 환급.
- (선택) `grantBookingStampAction(bookingId)`: 예약상세에서 수동 `EARN_BOOKING` 지급(placeholder, 기본 +1).

모든 액션은 기존 규약(`{ok,errors}` + `revalidatePath`) 준수. 권한 가드 우선 호출.

---

## 8. 화면

### 공개 `[locale]`
- **SiteHeader**: 로그인 환자에 `StampChip`(`🎫 N/10`) 노출 → 스탬프 페이지 링크.
- **신규 `/[locale]/account/(protected)/stamps/page.tsx`**:
  - 10칸 스탬프 카드 비주얼 + 진행바(`progress()` 사용).
  - 적립 내역(원장) 타임라인.
  - 잔액 ≥ 10이면 **교환 신청 폼**: BENEFIT 병원 셀렉트(다국어 이름 `resolveText`) + 희망시술 메모 + **유의사항/부작용 고지 블록(필수 노출)** + consent 체크.
  - 진행 중/과거 교환 목록 + 상태 배지 + 코드 + 취소 버튼(가능 상태).
- **홈(`page.tsx`)**: 스탬프 프로그램 소개 섹션("How PooGGo Stamps work", 외국인환자 대상 명시, 비단정 카피).
- **account 대시보드(`account/(protected)/page.tsx`)**: 스탬프 요약 카드(잔액 + 링크) 추가.
- **병원 상세(BENEFIT)**: "Free-treatment redemption available here" 배지(컴플라이언스 카피).

### 관리자 `/admin/(protected)`
- **신규 `stamps/page.tsx`**: 이메일로 사용자 검색 → 잔액·내역 표시 → 발급/보정 폼.
- **신규 `redemptions/page.tsx`**: 교환 신청 목록(상태/병원/유저/코드/일시), 승인·거절·완료 버튼. 상태별 정렬.
- **대시보드(`page.tsx`)**: `REQUESTED` 교환 건수 카운트 카드 추가.
- **layout nav**: Stamps, Redemptions 메뉴 추가.

### 병원 포털 `/hospital/(protected)`
- **신규 `redemptions/page.tsx`**: 자기 병원(`session.user.hospitalId`)의 교환 건 **읽기 전용** 목록(코드 확인용). 완료처리는 2차.
- **layout nav**: Redemptions 메뉴 추가.

---

## 9. i18n (메시지)
- `messages/{ko,en,zh,ja}.json`에 **`Stamps` 네임스페이스** 신규 추가(제목, 진행, 적립방법 설명, 교환 폼 라벨, 상태명, 유의사항/부작용 고지, 약관). 4언어 모두 채움.
- 관리자/병원 포털 신규 화면은 비로컬라이즈(기존 포털과 동일하게 한국어 고정).
- 홈 `Home` 네임스페이스에 스탬프 소개 키 추가.

---

## 10. 의료광고법 준수 (외국인환자 유치)
- 프로그램 카피에 **"외국인환자 대상"** 명시, 내국인 유인 표현 배제.
- 교환 화면에 대상 병원 **`cautions`(부작용·주의사항) 강제 노출** + 유의사항/약관 블록.
- 금지: "선착순/무조건 무료/100% 완치/부작용 없음/최고·1위" 등 — 기존 `lib/compliance/forbidden.ts` 사전과 정합.
- **머지 게이트**: 사용자 노출 카피(ko/en/zh/ja) 확정 후 `medical_compliance_checker` 통과 전까지 머지 금지.

---

## 11. 구현 단계 (phasing) & 검증
1. **디자인 토큰 + 폰트 + UI 프리미티브 + SiteHeader/SiteFooter**.
2. **공개 사이트 리스타일**(홈→hospitals→상세→booking→account→auth).
3. **관리자·병원 포털 리스타일**.
4. **스탬프 스키마 + 마이그레이션 + `lib/stamps`(+단위테스트)**.
5. **스탬프 UI + 서버액션**(공개/관리자/병원).
6. **i18n 4언어 + 컴플라이언스 카피 검수 + `npm run build` + `npm test` 그린**.

### 완료 기준 (Acceptance)
- [ ] 디자인 토큰/프리미티브로 공개·관리자·병원 전 화면 일관 적용, 기존 운영 흐름 회귀 없음.
- [ ] 환자: 관리자 발급으로 스탬프 적립 → 10개 도달 → 베네핏 병원 선택 교환 신청 → 차감 확인 → 관리자 승인/완료 또는 거절 시 환급까지 E2E 동작.
- [ ] `lib/stamps` 단위테스트 통과, `npm run build`·`npm test` 그린.
- [ ] 4언어 메시지 완비, 컴플라이언스 카피 게이트 통과.
- [ ] 잔액은 항상 `sum(delta)`로 재계산 일치(원장 무결성).

---

## 12. 리스크 / 가정
- ⚠️ **마이그레이션**: Vercel Postgres 연결 필요. 로컬에서 마이그레이션 생성/검증 후 배포 시 적용. 운영 DB 직접변경 금지.
- ⚠️ **잔액 집계**: `sum(delta)` 실시간 집계는 현 규모 충분. 대량 시 `User.stampBalance` denormalize는 추후.
- ⚠️ **동시성**: 교환 신청 시 잔액 검증→차감은 **트랜잭션**으로 원자 처리(이중 차감 방지).
- ⚠️ **폰트**: Pretendard CDN + CJK 폴백 스택으로 1차. ja/zh 정밀 서브셋은 추후.
- 가정: 교환 완료처리는 1차에 관리자 중심. 병원 포털은 읽기 전용.
- 가정: 적립 자동화/금액/수수료 연동은 추후 별도 설계(본 단계는 수동+placeholder).
