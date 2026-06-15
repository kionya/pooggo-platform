# PooGGo Global Hub — Phase 5C 설계서 (환자 인증 + 후기 로그인 게이팅)

작성일: 2026-06-12
대상: 환자가 자가 가입/로그인(role PATIENT, 즉시 ACTIVE)하고, **Phase 4에서 의료광고법 때문에 UI에서 가렸던 후기(치료경험담)를 로그인 게이팅으로 복원**한다. 신규 후기는 로그인 계정에 귀속시켜 책임성을 강화한다.
범위: **Phase 5C — 환자 인증 (멀티테넌트 Phase 5의 3/3 서브페이즈, 마지막)**

---

## 1. 컨텍스트 & 확정 결정

5A(인증 토대)·5B(병원 테넌시) 완료·배포됨: NextAuth + 역할(SUPER_ADMIN/HOSPITAL/PATIENT) + 세션(role·hospitalId). User 모델은 role=PATIENT 기본·status=ACTIVE 기본·passwordHash·hospitalId(nullable) 보유 → **환자 가입/로그인에 추가 필드 불필요.**

Phase 4 컴플라이언스 게이트가 후기를 **스키마 플래그 없이 UI 레이어에서만** 가림(`app/[locale]/hospitals/[id]/page.tsx`의 작성폼·목록 제거, `Detail.reviewsComingSoon` 안내로 대체). `addReview` 서버액션과 `getHospitalById`의 후기 include 쿼리는 그대로 살아 있음. 데이터는 서버에 적재되나 렌더만 안 됨.

5C는 그 후기를 **로그인 게이팅으로 복원**하고, 환자 인증을 추가한다.

### 확정 결정 (브레인스토밍 합의)
| 항목 | 결정 |
|---|---|
| 범위 | **최소** — 환자 가입/로그인 + 후기 게이팅 + 계정 홈(로그아웃·내 후기). Booking·예약이력 손대지 않음 |
| 환자 가입 | **즉시 ACTIVE**(승인 불필요), hospitalId=null, Hospital 레코드 생성 안 함 |
| 인증 위치 | **로케일 하위 `app/[locale]/account/`** (환자앱이 ko/en/zh/ja 로케일이므로 일관) |
| 후기 저자 | **계정 연결** — `Review.authorUserId`(nullable FK) 추가, 신규 후기는 로그인 계정에 귀속(이름=계정명, 자유입력 이름칸 제거) |
| 후기 게이팅 | **읽기·쓰기 모두 로그인 필요**(PATIENT/HOSPITAL/SUPER_ADMIN). 비로그인은 로그인 안내 |
| 가입 후 | **자동 로그인** → 계정 홈 |
| 헤더 링크 | `components/AccountNav.tsx`(서버컴포넌트)로 홈·병원상세에 "로그인/내 계정" 노출(헤더 전면 추출은 범위 외) |

---

## 2. 데이터 모델 (마이그레이션 1건)

User 모델은 변경 없음(5A에서 준비완료). Booking 변경 없음.

```prisma
model Review {
  id           String   @id @default(uuid())
  userName     String              // 유지: 기존 익명 레거시 보존; 신규는 계정명으로 채움
  rating       Int
  content      String
  hospitalId   String
  authorUserId String?             // 신규: nullable FK → User
  createdAt    DateTime @default(now())
  hospital     Hospital @relation(fields: [hospitalId], references: [id])
  author       User?    @relation(fields: [authorUserId], references: [id], onDelete: SetNull)
  @@index([authorUserId])
}

model User {
  // ...기존 필드...
  reviews Review[]                 // 신규 역관계
}
```

- 마이그레이션 `20260612000001_review_author`: `authorUserId` nullable 컬럼 + FK(ON DELETE SET NULL) + 인덱스 추가. **하위호환**(기존 익명 후기는 authorUserId=null로 보존) → 운영 Neon 안전.
- 명명 컨벤션 `YYYYMMDDHHMMSS_snake-case` 준수(직전: `20260611000001_user_auth`).

---

## 3. 순수 로직 유닛 (TDD, lib/ + 콜로케이트 .test.ts)

5B 패턴: 순수 검증 함수는 `string[]` 에러("field: 한국어 메시지" 접두) 또는 빈 배열 반환, DB·부수효과 없음. 테스트 설명은 한국어.

- `lib/auth/patient-registration.ts` → `validatePatientSignup({email, password, passwordConfirm, name})`: 이메일 형식, 비번 ≥8, 비번 일치, 이름 필수. (5B `validateHospitalRegistration` 미러, 병원명→이름)
- `lib/reviews/access.ts` → `canViewReviews(role?: string): boolean` / `canWriteReview(role?: string): boolean`: 로그인 역할(PATIENT/HOSPITAL/SUPER_ADMIN) true, `undefined`/비역할 false.
- `lib/reviews/validation.ts` → `validateReviewInput({rating, content}): string[]`: rating 정수 1–5, content 비어있지 않음·최대 길이, **기존 `lib/compliance/forbidden.ts` 금지어 스캐너 연동**(100%/완치/보장/최저가 등 → 거부). 순수 함수, TDD.

---

## 4. 가드

- `lib/auth/guard.ts`에 `requirePatient()` 추가(5B `requireHospital()` 미러):
  - `await auth()` → `hasRole(session.user?.role, ["PATIENT"])` 확인.
  - 미인증 시 **로케일 인식 리다이렉트**: `getLocale()`(next-intl/server)로 현재 로케일 → `redirect(`/${locale}/account/login`)`. (locale 미해석 시 defaultLocale `ko` 폴백)
  - 통과 시 세션 반환.
- `pages.signIn="/admin/login"`(auth.ts)은 **변경 없음** — 환자 보호는 NextAuth 미들웨어가 아니라 서버컴포넌트 `requirePatient()` 가드로 수행하므로 충돌 없음.

---

## 5. 환자 인증 라우팅 `app/[locale]/account/`

- `account/login/page.tsx`: 인라인 `doLogin` 서버액션 → `signIn("credentials", { email, password, redirectTo: `/${locale}/account` })`. 실패 시 `?error=1`. (5B `/hospital/login` 미러, 로케일 인식)
- `account/signup/page.tsx`: 가입 폼(이메일·비번·비번확인·이름) → `registerPatient`.
- `account/(protected)/layout.tsx`: `requirePatient()` 가드 + nav(계정 홈) + 로그아웃(`signOut({ redirectTo: `/${locale}/account/login` })`).
- `account/(protected)/page.tsx`: 계정 홈 — 이름·이메일 표시, **내 후기**(authorUserId=세션 user.id 후기 목록, 병원명·rating·content), 로그아웃 버튼.
- 미들웨어 변경 불필요: `account`는 `[locale]` 하위라 next-intl이 자동 로케일 처리(5B의 hospital 제외와 달리 제외 안 함).

---

## 6. 가입 서버액션

- `app/[locale]/account/signup-actions.ts` → `registerPatient(formData)`:
  1. `validatePatientSignup`(순수) → 에러 반환.
  2. 이메일 정규화(trim·lowercase) + 중복 검사(`db.user.findUnique`).
  3. `hashPassword`(bcryptjs).
  4. `db.user.create({ role: "PATIENT", status: "ACTIVE", passwordHash, name, email })`. (트랜잭션 불필요 — Hospital 생성 없음)
  5. **자동 로그인**: `signIn("credentials", { email, password, redirectTo: `/${locale}/account` })`.
- 반환 형태는 5B와 동일 `{ ok: boolean; errors: string[] }`(자동 로그인 redirect 전 검증 에러만 클라이언트로).

---

## 7. 후기 게이팅 복원

### 7.1 상세 페이지 `app/[locale]/hospitals/[id]/page.tsx`
- 상단 `const session = await auth()`.
- `canViewReviews(session?.user?.role)` 참:
  - 후기 목록 렌더(평점·내용·작성일, 작성자명=userName) + 작성 폼(이름 입력칸 **제거**, 계정명 사용) + `Compliance.reviewDisclaimer` 노출.
  - 후기 수 배지 표시.
- 거짓(비로그인):
  - `Detail.reviewsLoginRequired`("로그인 후 후기를 확인하고 작성할 수 있습니다") + `account/login` 링크. (현 `reviewsComingSoon` 대체)
  - 후기 수 배지도 게이팅(노출 안 함 또는 "—").
- 컴플라이언스 disclaimer는 client 훅(`useTranslations`)이라 폼 레벨 자식 컴포넌트로 분리(기존 `components/ComplianceNotice.tsx` `key="reviewDisclaimer"` 재사용).

### 7.2 작성 서버액션 `app/actions.ts` `addReview`
- **로그인 필수**: 세션 확인 → `canWriteReview(role)` 거짓이면 거부.
- `authorUserId = session.user.id`, `userName = session.user.name`(없으면 이메일 local-part) 서버에서 채움 — 클라이언트 이름 입력 무시.
- `validateReviewInput({rating, content})`(금지어 포함) 통과 시 생성, 위반 시 에러 반환.
- 생성 후 `revalidatePath` (상세 페이지 후기 갱신).

---

## 8. i18n · 헤더 (4개 로케일 동기 — ko/en/zh/ja)

- 신규 `Account` 네임스페이스: `loginTitle/signupTitle/email/password/passwordConfirm/name/submit/logout/myAccount/myReviews/alreadyHaveAccount/noAccount` + 검증 메시지(`emailRequired/emailInvalid/passwordTooShort/passwordsMismatch/emailExists/invalidCredentials`). 4개 파일 동시 추가(누락 시 런타임 에러).
- `Detail.reviewsLoginRequired` 추가. 기존 `Detail.reviewName`(→ 작성자 표기 라벨로 의미 조정)·`reviewContent`·`reviewSubmit` 재사용. `reviewsComingSoon`은 미사용 처리(키 유지 가능).
- `components/AccountNav.tsx`(서버컴포넌트): `auth()` → 미로그인 "로그인"(account/login 링크), 로그인 "내 계정"(account 링크) + 로그아웃. 홈(`app/[locale]/page.tsx`) 헤더 + 병원 상세에 배치. 헤더 전면 추출은 범위 외.

---

## 9. 의료광고법 5중 방어 (운영 매뉴얼 섹션 2 준수)

게이팅 자체가 Phase 4에서 승인된 컴플라이언스 조치([[phase4-compliance-followups]] #1 해소). 추가 방어:
1. **읽기·쓰기 모두 로그인 게이팅** — 불특정 다수 공개 노출(사전심의·유인 리스크) 차단.
2. **제출 시 금지어 스캐너**(`lib/compliance/forbidden.ts`) — 효과 보장·과장 표현(100%/완치/보장 등) 차단.
3. **`reviewDisclaimer` 상시 노출** — 치료경험담 주의 고지 유지.
4. **authorUserId 책임성** — 익명 자유입력 제거, 실계정 귀속.
- ⚠️ 최종 산출물 문구(게이트 안내·면책·검증 메시지)는 구현 후 **medical_compliance_checker로 마지막 게이트 교차검증**(Chief_Director 게이트). 게이팅 후에도 의료법 적용 — disclaimer 유지 필수.

---

## 10. 범위 경계 (YAGNI)
안 함: 비밀번호 재설정·찾기·이메일 인증, 내 예약 이력(Booking.userId FK·익명예약 클레임), 소셜로그인/MFA, 후기 수정·삭제 UI(작성·열람만), 후기 관리자 승인 워크플로(isPublished). 환자 프로필 편집(이름·연락처 수정)도 후순위.

---

## 11. 성공 기준 (5C Done)
1. 비회원이 `/[locale]/account/signup`로 가입 → 즉시 ACTIVE PATIENT 생성 → **자동 로그인** → 계정 홈.
2. 기존 PATIENT가 `/[locale]/account/login`→ 계정 홈, 로그아웃 동작.
3. **로그인 상태**에서 병원 상세의 후기 목록 열람 + 작성(계정명 귀속, authorUserId 저장), disclaimer 노출.
4. **비로그인** 상태에서 후기 목록·작성폼 차단, 로그인 안내 노출.
5. 금지어 포함 후기 제출 거부.
6. 계정 홈에서 본인 작성 후기 목록 확인.
7. `npm test`(신규 순수로직: patient-registration, reviews/access, reviews/validation) + `npm run build` 통과, 기존 흐름(예약·병원 포털·admin) 비회귀.

---

## 12. 테스트
- 순수 TDD: `validatePatientSignup`(이메일·비번·일치·이름), `canViewReviews`/`canWriteReview`(역할별), `validateReviewInput`(rating 범위·내용·금지어).
- 통합(수동 UAT, 운영DB 쓰기 스모크는 사람이 `npm run dev`): 가입→자동로그인→후기 작성/열람→비로그인 차단→금지어 거부→내 후기 표시. 빌드.
- 회귀: 비로그인 병원 탐색·예약·병원 포털·admin 정상.
