# PooGGo Global Hub — Phase 2 설계서 (발견 + 다국어)

작성일: 2026-06-09
대상: 외국인환자 허브의 환자측 발견 경험 완성 + 실제 다국어(URL 로케일)
범위: **Phase 2A(i18n 토대) + 2B(필터·가격비교·메신저) 통합 단일 스펙**

---

## 1. 컨텍스트 & 확정 결정

Phase 1 완료(병원 다국어 데이터모델 + 중앙 관리자 CRUD, main 배포됨). 본 문서는 Phase 2로, 환자가 다국어로 병원을 **발견·필터·비교·연결**하는 경험을 만든다.

| 항목 | 결정 |
|---|---|
| 구축 순서 | 한 번에(2A+2B 통합). 단 플랜은 **i18n 토대 → 등급 → 필터 → 비교 → 상세** 순서 |
| 언어 스위처 | **URL 로케일 라우팅** (`/en`, `/zh`…) — next-intl + `app/[locale]/` (SEO 우선) |
| 가격비교 | **카트 선택 병원 나란비교** (기존 담기 확장) |
| 필터 | 지역(city/district), 진료과(category), 가격대, 평점, 키워드 + **병원 등급(추천→제휴→베네핏)** |
| 관리자 | **한국어 전용 유지**(로케일 미적용) |
| benefits 필드 | **tier=BENEFIT일 때만 필수**, 그 외 선택 |
| 키워드 검색 | MVP는 **tags+도시** 매칭. 병원명 다국어 전문검색은 후순위(스키마 변경 없이 후속 추가 가능) |

### Phase 1 자산 (재사용)
- `lib/i18n/types.ts`(`LANGS`,`I18nText`), `lib/i18n/text.ts`(`resolveText`,`toI18n`,`isCompleteI18n`)
- 병원 데이터: `messengers`·`operatingHours` Json(저장됨, 미노출), Menu `price`(숫자)+`category`
- 인덱스: `Hospital(city,category)`, `Hospital(isPublished)`
- 비교 카트: `components/HospitalMainSection.tsx`(최대3 담기)
- vitest 순수로직 TDD 패턴

---

## 2. 아키텍처

### 2.1 i18n URL 로케일 라우팅 (next-intl)
- **next-intl**(최신, Next 16 App Router 호환) 도입.
- 환자화면을 `app/[locale]/`로 이동: `/` → `/[locale]`, `/hospitals` → `/[locale]/hospitals`, `/hospitals/[id]` → `/[locale]/hospitals/[id]`, `/consult`, `/success`, 신규 `/[locale]/compare`.
- `locale ∈ {ko, en, zh, ja}`, 기본 `ko`(또는 Accept-Language 감지). 미들웨어가 prefix 없는 접근을 로케일로 리다이렉트.
- UI 고정문구: `messages/{ko,en,zh,ja}.json` 4종 사전. 컴포넌트는 `useTranslations`/`getTranslations`.
- DB 콘텐츠: 기존 `resolveText(value, locale)`에 활성 로케일 전달(현재 하드코딩 "ko" → 로케일 파라미터화).
- **관리자(`/admin/*`)는 `[locale]` 밖에 그대로 유지** → 한국어 전용, 리팩터 영향 최소화.
- `next.config.ts`에 next-intl 플러그인 래핑.

### 2.2 라우팅 구조 (목표)
```
app/
  [locale]/
    layout.tsx            # next-intl provider + 헤더(언어 스위처)
    page.tsx              # 홈 (기존 app/page.tsx 이동)
    hospitals/page.tsx    # 리스트 + 필터
    hospitals/[id]/page.tsx
    compare/page.tsx      # 신규 가격비교
    consult/page.tsx
    success/page.tsx
  admin/...               # 변경 없음(한국어 전용)
  layout.tsx              # 루트(html/body, 최소)
middleware.ts             # next-intl 로케일 미들웨어
i18n/routing.ts, i18n/request.ts
messages/{ko,en,zh,ja}.json
```

### 2.3 언어 스위처
헤더 컴포넌트(`components/LocaleSwitcher.tsx`, 클라이언트): 현재 경로를 새 로케일 prefix로 `router.replace`. KR/EN/CN/JP.

---

## 3. 데이터 모델 — 병원 등급(신규)

### 3.1 스키마 추가 (Hospital)
| 필드 | 타입 | 비고 |
|---|---|---|
| `tier` | String `@default("RECOMMENDED")` | `RECOMMENDED`·`PARTNER`·`BENEFIT` |
| `benefits` | Json `@default("{}")` | 베네핏 병원 추가혜택 설명(I18nText). BENEFIT일 때만 입력 필수(검증). 그 외 빈 객체 |

- 인덱스: `@@index([tier])`(정렬/필터용).
- 마이그레이션: 신규 `tier`는 `@default("RECOMMENDED")`, `benefits`는 `@default("{}")` → 기존 행 자동 채움. 리셋 불필요(증분 마이그레이션 가능).

### 3.2 등급 정렬·표시
- 정렬 랭크: `BENEFIT`=0, `PARTNER`=1, `RECOMMENDED`=2. 목록 기본 정렬 = (tierRank asc, rating desc).
- 카드/상세에 **등급 배지**(베네핏=금색, 제휴=파랑, 추천=회색 등).
- BENEFIT 병원은 상세에 "추가혜택" 섹션 노출(`benefits` 다국어).

### 3.3 검증·관리자
- `validateHospitalInput`에 `tier` 유효성(3종) + `tier==='BENEFIT'이면 benefits 4언어 필수` 추가.
- `HospitalForm`에 등급 select + 혜택 I18nField(조건부 필수 안내).
- `HospitalInput` 타입에 `tier`, `benefits` 추가. 시드에 등급 배정(예: 리쥬엘·바노바기 BENEFIT, 삼사오 PARTNER, 나머지 RECOMMENDED).

---

## 4. 필터 (병원 리스트)

### 4.1 입력 (URL 쿼리)
`/[locale]/hospitals?city=&district=&category=&tier=&minPrice=&maxPrice=&minRating=&q=`

### 4.2 처리 (서버컴포넌트 + 순수 빌더)
- `lib/hospital/filter.ts`의 순수 함수 `buildHospitalWhere(params)` → Prisma `where`:
  - 항상 `isPublished: true`
  - city/district/category/tier: 값 있으면 `equals`
  - minRating: `rating: { gte }`
  - minPrice/maxPrice: `menus: { some: { price: { gte?, lte? } } }`(시술 최저가가 범위에 걸리는 병원)
  - q: `OR: [{ tags: { contains: q, mode:'insensitive' } }, { city: { contains: q, mode:'insensitive' } }, { district: { contains: q, mode:'insensitive' } }]` (MVP — tags+도시 한정)
- 정렬은 등급 comparator로 앱에서(작은 N). 또는 rating orderBy 후 JS 정렬.
- 필터 UI: 칩/셀렉트 바(`components/hospitals/FilterBar.tsx`, 클라이언트) → 쿼리 갱신.

> 한계 명시: 병원명(Json) 다국어 전문검색은 미포함. 후속에서 Postgres JSONB 검색 또는 검색 인덱스로 **스키마 변경 없이** 추가.

---

## 5. 가격비교 페이지 (카트 나란비교)

- 카트는 클라이언트 상태(기존 `HospitalMainSection`의 `compareList`, 최대3). "비교견적/비교하기" → `/[locale]/compare?ids=a,b,c`로 이동.
- `app/[locale]/compare/page.tsx`(서버): `ids` 파싱 → 해당 병원 + `menus`(+doctors) 로드.
- 렌더: **비교 표** — 열=병원(등급 배지·평점·위치), 행=시술. 시술은 `category`로 그룹핑, 같은 카테고리 시술끼리 가격 비교. 동일 카테고리에서 **최저가 셀 강조**.
- 가격 없는 시술(price=null)은 `priceText`("상담문의" 등) 표기.
- 각 병원 열 하단에 "상담신청"·메신저 CTA.

---

## 6. 상세 페이지 보강 (저장됐지만 미노출)

### 6.1 메신저 click-to-chat
- `lib/messengers.ts` 순수 헬퍼 `buildMessengerLinks(messengers)` → 채워진 채널만 딥링크 생성:
  - whatsapp → `https://wa.me/<숫자만>`
  - line → `https://line.me/R/ti/p/<encode(id)>`
  - wechat → 딥링크 부재 → **ID 표시 + 복사**(type: copy)
  - kakao → 저장값이 URL이면 그대로 링크
  - messenger → `https://m.me/<id>`(접두 정리)
  - phone → `tel:<숫자>`, email → `mailto:<주소>`
- 상세에 채널 버튼 그룹. 각 버튼 다국어 라벨.

### 6.2 운영시간
- `operatingHours`를 주간 표로: 요일·오픈~마감·휴무·비고(다국어). 오늘 요일 강조(선택).

---

## 7. 의료광고법 주의 (등급 시스템 — 중요)
- "추천/제휴/베네핏"은 **플랫폼 제휴등급(상업적 관계)**임을 라벨/툴팁로 명확히. 의료적 우위·치료효과 암시하는 비교·과장 표현 금지(제56조 비교·과장광고).
- "추가혜택(benefits)"은 **외국인 환자 대상(유치업자 등록 전제)**이라 허용 범위. 단 국내 환자 본인부담금 할인 프레이밍 금지(제27조③). 베네핏 섹션에 대상·조건 명시 + 면책.
- 가격비교·최저가 강조는 **객관적 게시가 기반**임을 표기, "최저가 보장" 등 단정 금지.
- 본격 전수검수는 Phase 4. 본 단계는 위 원칙을 카피/배지에 선반영.

---

## 8. 파일 구조 (신규/이동/수정)

**신규**
- `i18n/routing.ts`, `i18n/request.ts`, `middleware.ts`
- `messages/ko.json`, `en.json`, `zh.json`, `ja.json`
- `components/LocaleSwitcher.tsx`
- `components/hospitals/FilterBar.tsx`
- `app/[locale]/layout.tsx`, `app/[locale]/compare/page.tsx`
- `lib/hospital/filter.ts` (+ `filter.test.ts`)
- `lib/hospital/tier.ts` (등급 랭크/정렬 comparator + `tier.test.ts`)
- `lib/messengers.ts` (+ `messengers.test.ts`)

**이동** (→ `app/[locale]/`)
- `app/page.tsx`, `app/hospitals/page.tsx`, `app/hospitals/[id]/page.tsx`, `app/consult/page.tsx`, `app/success/page.tsx`

**수정**
- `next.config.ts`(next-intl 플러그인), `app/layout.tsx`(루트 최소화)
- `prisma/schema.prisma`(tier·benefits), `prisma/seed.ts`(등급), 마이그레이션
- `lib/hospital/types.ts`(tier·benefits), `lib/hospital/validation.ts`(등급·조건부 benefits)
- `components/admin/HospitalForm.tsx`(등급 select + benefits)
- `app/admin/(protected)/hospitals/[id]/edit/page.tsx`(매핑에 tier·benefits)
- `components/HospitalMainSection.tsx`(resolveText 로케일화 + compare로 이동 링크 + 등급 배지)
- `app/actions.ts`(getHospitals에 tier·정렬, 필터 인자)

---

## 9. 범위 경계 (YAGNI)
Phase 2가 **안 하는** 것:
- 병원명 다국어 전문검색(후속, 스키마 변경 불필요)
- 관리자 화면 다국어
- 예약 캘린더(Phase 3)
- 자동번역(관리자 수기/우리 번역 유지)
- 메신저 실시간 연동(딥링크/복사까지만)
- 등급별 과금·정산 로직(Phase 3+)

---

## 10. 성공 기준 (Phase 2 Done)
1. `/`, `/en`, `/zh`, `/ja` prefix로 같은 페이지가 해당 언어 UI로 렌더되고, 헤더 스위처로 전환된다.
2. 병원 리스트가 지역·진료과·등급·가격대·평점·키워드(tags)로 필터된다.
3. 병원에 등급(추천/제휴/베네핏)이 저장·배지표시·정렬되며, 관리자가 등급+혜택을 입력한다(BENEFIT은 혜택 4언어 필수).
4. 카트로 담은 병원들이 `/compare`에서 시술·가격 나란비교 표로 보이고 최저가가 강조된다.
5. 상세에서 메신저 버튼(딥링크/복사)과 운영시간 표가 노출된다.
6. `npm test`(신규 순수로직 포함) + `npm run build` 통과, 기존 흐름 비회귀.

---

## 11. 테스트 접근
- 순수로직 TDD(vitest): `buildHospitalWhere`(필터→where), `tierRank`/등급 comparator, `buildMessengerLinks`(딥링크), 로케일 해석 유틸.
- 통합: i18n 라우팅(로케일 prefix 렌더), 필터 쿼리, 비교 표, 상세 보강 — 빌드 + 수동 시나리오.
- 회귀: 관리자 흐름·기존 환자 흐름 유지.
