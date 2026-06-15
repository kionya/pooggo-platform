# PooGGo Global Hub — Phase 1 설계서

작성일: 2026-06-08
대상: PooGGo 플랫폼을 외국인환자 ↔ K-Beauty/K-Medical 병원 허브 네트워크로 업그레이드
이 문서 범위: **Phase 1 (기반: 데이터모델 확장 + 중앙 관리자 CRUD)**

---

## 1. 비전 & 전체 로드맵

외국에서 K-Beauty/K-Medical 병원을 찾는 외국인 환자와 국내 병원을 잇는 글로벌 커넥티드 허브.
환자는 병원을 발견·비교·견적·예약하고, 병원/플랫폼은 메신저로 연결된다.

### 확정된 사업·기술 결정

| 항목 | 결정 | 근거 |
|---|---|---|
| 1차 타겟 | **외국인 환자 전용** | 「의료 해외진출법」상 외국인환자 유치업자 등록 시 수수료 모델 합법 (의료법 제27조③ 환자 유인·알선 예외) |
| 데이터 운영 | **플랫폼 중앙 관리 (단일 관리자)** | MVP 속도. 병원별 로그인은 Phase 5로 분리 |
| 예약 방식 | **희망일시 요청형** | 병원이 확인 후 확정. 실시간 슬롯은 후순위 |
| 다국어 | **KR + EN + CN + JP 4개 전부 필수** | 인바운드 핵심 시장 풀커버 |
| 이미지 | **URL 붙여넣기 (MVP)** | 스토리지 셋업 생략, 실업로드는 후순위 |

### 5단계 분해

```
Phase 1 [기반]  병원 데이터모델 확장 + 중앙 관리자 CRUD   ← 본 문서
Phase 2 [발견]  환자용 리스트/필터 + 가격비교 페이지 + 상세(운영시간·메신저 click-to-chat) + 다국어 적용
Phase 3 [예약]  장바구니 → 개인정보+희망일시 예약폼 → 관리자 예약관리(상태 파이프라인)
Phase 4 [확장]  i18n 전수 적용 + 의료광고법 전수 검수
Phase 5 [선택]  병원별 로그인(멀티테넌트 SaaS)
```

각 Phase는 독립적으로 완성·검증된다. 본 문서는 Phase 1만 상세화한다.

---

## 2. 현황 (Phase 1 시작 시점)

- 스택: Next.js 16 (App Router) + React 19 + Prisma 5 + **Neon Postgres** (Vercel) + Tailwind 4
- 기존 모델: `User, Hospital, Doctor, Menu, Review, Treatment, Lead, Settlement, Consultation`
- 기존 병원 데이터: 코드 하드코딩(`app/actions.ts` `seedInitialHospitals`, 5건)
- 기존 관리자: `/admin?pass=1234` (주소창 비밀번호 — 노출 위험)
- `prisma/dev.db`(SQLite)는 초기 잔재. 실DB는 Neon Postgres. **무시/삭제 대상**

### 한계 (Phase 1이 해결)
- 병원에 **운영시간·메신저·상세소개** 필드 없음
- 관리자가 병원을 **추가·수정할 UI 없음** (코드로만 입력)
- 다국어 콘텐츠 저장 구조 없음
- 가격이 문자열("150만원~")이라 비교·정렬 불가
- 관리자 인증이 주소창 비밀번호로 취약

---

## 3. 데이터 모델 설계

### 3.1 번역 저장 전략 (2계층)

| 계층 | 대상 | 방식 |
|---|---|---|
| UI 골격 | 버튼·네비·라벨·고정문구 | i18n 사전 파일 4종 (우리가 1회 번역, Phase 2에서 화면 적용) |
| 병원 콘텐츠 | 병원명·소개·시술명·전문분야·주소 | DB에 **JSON 1필드** `{ ko, en, zh, ja }` |

- **4개 언어 전부 필수.** 관리자 폼은 필드별 KR/EN/CN/JP 탭, 4개 모두 채워야 저장.
- 폴백 로직(`ja → en → ko`)은 안전장치로만 유지(데이터 누락 시 화면 깨짐 방지).
- 가격(숫자)·운영시간(시각)은 언어 무관 → 번역 안 함. 통화/단위 라벨만 UI i18n.

다국어 값의 표준 타입(개념):
```ts
type I18nText = { ko: string; en: string; zh: string; ja: string }
```
Prisma에서는 `Json` 컬럼으로 저장. 애플리케이션 계층에서 위 형태로 검증.

### 3.2 Hospital 모델 (확장)

신규/변경 필드 (★ = 신규, ⤳ = 타입변경):

| 필드 | 타입 | 비고 |
|---|---|---|
| id | String @id | 유지 |
| ★ slug | String @unique | URL용 (예: `rejuel-gangnam`) |
| ⤳ name | Json (I18nText) | 병원명 다국어 |
| ⤳ intro | Json (I18nText) | 한 줄 소개 (기존 `desc` 흡수) |
| ★ about | Json (I18nText) | 병원 상세 소개 (긴 글) |
| ★ address | Json (I18nText) | 상세주소 다국어 |
| ★ city | String | 예: Seoul (필터용) |
| ★ district | String | 예: Gangnam-gu (필터용) |
| ★ lat / lng | Float? | 지도용(선택) |
| category | String | PLASTIC / DERMA / DENTAL / OPHTHALMOLOGY / HAIR / ETC |
| tags | String | 콤마 구분 유지 |
| image | String | 대표 이미지 URL |
| ★ images | String[] | 추가 이미지 URL 배열 |
| rating | Float @default(0) | 유지 |
| reviews | Int @default(0) | 유지 |
| ★ operatingHours | Json | 요일별 `{ mon:{open,close,closed}, ... , note:I18nText }` |
| ★ messengers | Json | `{ whatsapp, line, wechat, kakao, messenger, phone, email }` 각 string? |
| ★ isPublished | Boolean @default(false) | 관리자 공개 토글 (false면 환자화면 미노출) |
| ★ updatedAt | DateTime @updatedAt | |
| createdAt | DateTime @default(now()) | 유지 |
| 관계 | doctors, menus, userReviews, treatments, leads | 유지 |

`operatingHours` JSON 형태(예):
```json
{
  "mon": { "open": "10:00", "close": "19:00", "closed": false },
  "sun": { "open": "", "close": "", "closed": true },
  "note": { "ko": "공휴일 휴무", "en": "Closed on holidays", "zh": "...", "ja": "..." }
}
```

`messengers` JSON 형태(예):
```json
{
  "whatsapp": "+8210...",   "line": "@pooggo",
  "wechat": "pooggo_kr",   "kakao": "http://pf.kakao.com/...",
  "messenger": "m.me/pooggo", "phone": "+8210...", "email": "info@..."
}
```
각 키는 선택(빈 값 허용). Phase 2에서 채워진 것만 click-to-chat 버튼으로 렌더.

### 3.3 Doctor 모델 (확장)

| 필드 | 타입 | 비고 |
|---|---|---|
| ⤳ name | Json (I18nText) | 다국어 |
| ⤳ specialty | Json (I18nText) | 전문분야 다국어 |
| image | String? | 유지 |
| ★ order | Int @default(0) | 표시 순서 |
| hospitalId / hospital | 관계 | 유지 |

### 3.4 Menu 모델 (확장) — 가격비교의 핵심

| 필드 | 타입 | 비고 |
|---|---|---|
| ⤳ name | Json (I18nText) | 시술명 다국어 |
| ★ category | String | 비교 그룹핑 (예: LIFTING, RHINOPLASTY) |
| ★ price | Int? | **숫자 가격(비교·정렬용), 단위 KRW** |
| ★ priceText | Json (I18nText)? | 표기용 문구 (예: "150,000 KRW~") |
| ★ currency | String @default("KRW") | |
| ★ order | Int @default(0) | |
| hospitalId / hospital | 관계 | 유지 |

> 숫자 `price`와 표기 `priceText`를 분리하는 이유: Phase 2 가격비교 페이지에서 같은 `category`끼리 정렬·비교하려면 숫자가 필수. "별도 상담" 같은 비공개 가격은 `price=null` + `priceText`로 표기.

### 3.5 손대지 않는 모델
`User, Review, Treatment, Lead, Settlement, Consultation` — Phase 1에서 스키마 변경 없음.
(`Lead`/예약 구조는 Phase 3에서 재설계, `Settlement` 수수료 구조는 유치업자 등록 후 Phase 3+에서 다룸.)

### 3.6 마이그레이션 계획
1. 기존 `Hospital.name`(String) → `Json` 전환은 파괴적. 기존 시드 5건을 먼저 `{ ko: 기존값, en:"", zh:"", ja:"" }`로 백필.
2. `Hospital.desc` → `intro`로 rename + Json 전환.
3. `Doctor.name/specialty`, `Menu.name` 동일 백필 후 전환.
4. 데이터 5건 + 부속이라 수동 백필 안전. 마이그레이션 스크립트로 처리.
5. `dev.db` 삭제, `seedInitialHospitals`는 신규 다국어 시드로 교체(개발용 샘플).

---

## 4. 관리자(Admin) 아키텍처

### 4.1 인증 (보안 개선)
- 현재 `/admin?pass=1234` 폐기 (비번이 URL·history 노출).
- **로그인 폼 → `ADMIN_PASSWORD`(env) 검증 → httpOnly·secure 세션 쿠키 발급.**
- `/admin/*` 접근 시 쿠키 검증(레이아웃 가드 또는 미들웨어). 미인증 시 로그인으로.
- 단일 관리자 비밀번호(MVP). 다계정/병원별 권한은 Phase 5.

### 4.2 페이지 구성

| 경로 | 역할 |
|---|---|
| `/admin/login` | 비밀번호 로그인 |
| `/admin` | 대시보드 (병원 수·공개 수·상담 수 요약) |
| `/admin/hospitals` | 병원 목록 + 추가/수정/삭제 + 공개 토글 |
| `/admin/hospitals/new` | 병원 생성 폼 |
| `/admin/hospitals/[id]/edit` | 병원 전체 수정 폼 |
| `/admin/consultations` | 기존 상담내역 열람 (기존 `/admin` 기능 이전) |

### 4.3 병원 편집 폼 구성요소
- **다국어 입력 위젯**: 필드(병원명·소개·상세·주소·시술명·전문분야)마다 KR/EN/CN/JP 탭. 4개 전부 입력해야 통과.
- **기본정보**: city, district, category, tags, 대표이미지 URL, 추가이미지 URL들
- **운영시간 그리드**: 월~일 7행 × (open/close/휴무 체크) + note 다국어
- **메신저 블록**: whatsapp/line/wechat/kakao/messenger/phone/email 입력
- **의료진 반복입력**: name·specialty(다국어)·image URL·order, 행 추가/삭제
- **시술/가격 반복입력**: name(다국어)·category·price(숫자)·priceText(다국어)·currency·order
- **부작용·주의사항 입력란**(의무): Phase 2 환자노출 대비 (의료법 제56조 중요정보 누락 방지)
- **공개 토글**: isPublished

### 4.4 서버 액션 (CRUD)
- `createHospital(formData)` / `updateHospital(id, formData)` / `deleteHospital(id)` / `togglePublish(id)`
- 의료진·시술은 병원과 함께 nested 저장(생성/수정/삭제 동기화).
- 모든 액션에 다국어 4개 필수 유효성검사 + revalidatePath.
- 기존 하드코딩 `seedInitialHospitals` 제거(또는 dev 전용 샘플로 격리).

---

## 5. 의료광고법 고려 (Phase 1)
- Phase 1은 **내부 관리자 도구**라 광고 노출이 낮음 → 본격 검수는 Phase 2 환자화면 게이트.
- 단, 데이터 구조에 **부작용·주의사항 필드**를 지금 심어 Phase 2에서 중요정보 표기를 강제할 토대 마련.
- 가격·후기·전후사진의 환자노출 규칙(최저가 보장·효과 단정·치료경험담 광고전용 금지)은 Phase 2 설계에서 `medical_compliance_checker` 게이트로 처리.

---

## 6. 범위 경계 (YAGNI)
Phase 1이 **하지 않는** 것:
- 병원별 로그인/권한 (Phase 5)
- 예약 캘린더·슬롯 (Phase 3)
- 환자화면(리스트/상세/가격비교) 개편 — 신규 필드는 만들되 노출은 Phase 2
- 자동번역 API — 관리자 수기 입력
- 실제 이미지 업로드(Blob) — URL 붙여넣기로 대체
- 결제·정산 로직

---

## 7. 성공 기준 (Phase 1 Done 정의)
1. 관리자가 코드 수정 없이 **웹 UI에서 병원을 추가/수정/삭제**할 수 있다.
2. 병원에 **운영시간·메신저·다국어(4개) 소개·숫자가격**이 저장된다.
3. 관리자 인증이 **주소창 비밀번호가 아닌 쿠키 세션**으로 동작한다.
4. 기존 5개 병원 데이터가 **다국어 구조로 무손실 마이그레이션**된다.
5. 다국어 필드 4개 미입력 시 저장이 **거부**된다.
6. `npm run build` 통과 + 기존 환자화면(메인/상세)이 깨지지 않는다(신규 필드 폴백).

---

## 8. 테스트 접근
- 마이그레이션: 백업 → 마이그레이션 → 기존 5건 다국어 구조 확인.
- 관리자 CRUD: 병원 생성→목록 노출→수정→공개토글→삭제 수동 시나리오.
- 유효성: 다국어 1개 누락 시 저장 거부 확인.
- 인증: 쿠키 없이 `/admin/hospitals` 접근 시 로그인 리다이렉트 확인.
- 회귀: 기존 메인페이지·병원상세가 신규 스키마에서 정상 렌더(폴백 동작).
