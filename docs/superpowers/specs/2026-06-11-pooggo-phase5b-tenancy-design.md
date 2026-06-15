# PooGGo Global Hub — Phase 5B 설계서 (병원 테넌시)

작성일: 2026-06-11
대상: 병원이 자가등록하고 슈퍼관리자 승인 후, **별도 /hospital 포털에서 자기 병원 데이터·예약만** 관리하는 멀티테넌트 권한 스코핑을 구축한다.
범위: **Phase 5B — 병원 테넌시 (멀티테넌트 Phase 5의 2/3 서브페이즈)**

---

## 1. 컨텍스트 & 확정 결정

5A(인증 토대) 완료·배포됨: NextAuth + 역할(SUPER_ADMIN/HOSPITAL/PATIENT) + 세션(role·hospitalId) + User(passwordHash/hospitalId/status). 슈퍼관리자가 `/admin`에서 전체 관리 중.

5B는 그 위에 **병원 테넌시**를 올린다: 병원 자가등록 → 승인 → 자기 병원만 관리.

### 확정 결정
| 항목 | 결정 |
|---|---|
| 병원 포털 | **별도 `/hospital/(protected)`** (admin은 슈퍼관리자 전용 유지) |
| 자가등록 생성물 | **계정(HOSPITAL/PENDING) + 초안 Hospital(비공개) 연결** |
| 승인 | **슈퍼관리자 승인**(PENDING→ACTIVE), 거절(SUSPENDED) |
| 병원 수정 가능 | 병원명·소개·상세·주소·부작용·도시/구·진료과·태그·사진·운영시간·메신저·의료진 |
| 플랫폼 전용(슈퍼관리자만) | **slug·시술 가격(menus)·등급(tier)·benefits·isPublished·평점/리뷰수** |
| 가격 운영 | 병원은 가격 변경을 슈퍼관리자에 요청(폼에서 가격 섹션 숨김) |

---

## 2. 데이터 모델 (신규 모델 없음)

5A에서 준비된 필드 재사용. 추가 없음.
- `User`: role(HOSPITAL), status(PENDING/ACTIVE/SUSPENDED), hospitalId(소속 병원).
- `Hospital`: 기존 그대로. 자가등록은 초안 Hospital을 `isPublished=false`로 생성.
- 등록 시: 트랜잭션으로 `Hospital`(초안) + `User`(HOSPITAL, PENDING, hospitalId=초안.id) 동시 생성.

### 초안 Hospital 기본값
가입 입력(병원명)만 채우고 나머지는 빈 다국어/기본값으로 생성(승인 후 병원이 채움): name={ko:입력, en/zh/ja:입력}, 나머지 I18nText는 `{}`, city/district="", category="ETC", tags="", image="", operatingHours/messengers 기본 빈 구조, tier="RECOMMENDED", isPublished=false.

---

## 3. 자가등록 플로우

- 공개 라우트 `/[locale]/hospital/register` 또는 `/hospital/register`(비로케일). **결정: 비로케일 `/hospital/register`** (관리/포털은 한국어 운영 — admin과 일관).
- 폼: 이메일, 비밀번호(확인), 병원명, (선택)담당자명·연락처.
- 서버액션 `registerHospital(formData)`:
  1. `validateHospitalRegistration` (순수): 이메일 형식, 비번 최소길이(≥8), 병원명 필수.
  2. 이메일 중복 검사(`db.user`).
  3. 트랜잭션: 초안 Hospital 생성 + User(HOSPITAL/PENDING, hashed) 생성.
  4. `/hospital/register/success`(승인 대기 안내)로 이동.
- PENDING 계정은 5A authorize가 거부 → 승인 전 로그인 불가.

---

## 4. 슈퍼관리자 승인

- `/admin/(protected)/accounts/page.tsx`: status별 필터(PENDING 기본), 병원 계정 목록(이메일·병원명·status·가입일).
- 액션(슈퍼관리자):
  - `approveHospitalAccount(userId)`: status PENDING→ACTIVE.
  - `rejectHospitalAccount(userId)`: status →SUSPENDED.
  - `requireRole(["SUPER_ADMIN"])` 가드.
- 대시보드(`/admin`)에 "승인 대기(PENDING)" 카운트 카드 추가.

---

## 5. 병원 포털 `/hospital/(protected)`

- `/hospital/login`: NextAuth signIn(credentials) → 성공 시 `/hospital`.
- `/hospital/(protected)/layout.tsx`: `requireHospital()` 가드 — `requireRole(["HOSPITAL"])` + `session.user.hospitalId` 존재 확인(없으면 /hospital/login). 세션의 hospitalId 반환.
- `/hospital`(대시보드): 자기 병원 요약(공개상태·등급은 읽기전용 표시) + 자기 예약 수(상태별).
- `/hospital/profile`: 자기 병원 수정 폼(스코프) → `updateHospitalProfile`.
- `/hospital/bookings`: 자기 병원 예약 목록 + 상태 변경(`updateOwnBookingStatus`).
- 포털 헤더 네비: 대시보드/프로필/예약 + 로그아웃(signOut → /hospital/login).

---

## 6. 권한 스코핑 + 필드 분리

### 6.1 순수 로직 (TDD)
- `lib/hospital/editable.ts` `pickHospitalEditableFields(input)`: HospitalInput에서 **병원 허용 필드만** 추출(slug/menus/tier/benefits/isPublished/rating/reviews 제외). 플랫폼 전용 필드는 무시.
- `lib/hospital/editable.ts` `validateHospitalProfile(input)`: **편집 가능 필드만** 스코프 검증(name/intro/about/address/cautions 4언어 필수 + city/district + category + doctors 4언어). **menus/tier/benefits는 검증 대상 아님**(기존 `validateHospitalInput` 재사용 금지 — 가격·등급까지 강제하므로). 순수 함수, TDD.
- 업데이트는 menus/tier/isPublished/benefits/rating/reviews를 **건드리지 않음**(update data에 미포함 → 슈퍼관리자가 설정한 값 보존). doctors만 deleteMany+create로 교체.
- `lib/auth/ownership.ts` `ownsHospital(session, hospitalId)`·`ownsBooking(session, bookingHospitalId)`: 세션 hospitalId와 대상 일치 여부(순수).

### 6.2 스코프 서버액션
- `app/hospital/actions.ts`:
  - `updateHospitalProfile(input)`: `requireHospital()` → `pickHospitalEditableFields` → 자기 hospitalId의 Hospital만 update(의료진은 deleteMany+create, 가격 menus는 손대지 않음). 검증은 허용필드 한정.
  - `updateOwnBookingStatus(bookingId, next)`: `requireHospital()` → 대상 booking 조회 → `ownsBooking` 아니면 거부 → `canTransition` → update.
- 슈퍼관리자 액션은 5A 그대로(전체 권한).

### 6.3 폼 재사용
- `components/admin/HospitalForm.tsx`에 `scope?: "admin" | "hospital"` prop 추가(기본 admin). `scope==="hospital"`이면 **시술/가격 섹션·등급 select·공개 토글·benefits 숨김**. 의료진·운영시간·메신저·기본정보(가격 외)는 표시.
- 병원 프로필 페이지는 `<HospitalForm scope="hospital" mode="edit" .../>` + `updateHospitalProfile` 사용(admin updateHospital 아님).

---

## 7. 인증 라우팅 (역할별)
- `/hospital/login` signIn redirectTo `/hospital`; `/admin/login` redirectTo `/admin`.
- 교차 접근(HOSPITAL이 /admin, SUPER_ADMIN이 /hospital): 각 포털 가드가 역할 불충족 시 **해당 포털 로그인으로 리다이렉트**(루프 없음 — 로그인 페이지는 비가드). MVP 허용.
- 미들웨어(next-intl)는 `/hospital`·`/admin`·`api`를 로케일 라우팅에서 제외(현재 matcher가 admin/api 제외 → `hospital`도 추가).

---

## 8. 범위 경계 (YAGNI)
안 함: 비밀번호 재설정·찾기·이메일 인증(후순위), 공개 신청 워크플로(슈퍼관리자가 isPublished 직접 토글), 병원 다계정/멤버 초대, 병원 가격 자가수정(슈퍼관리자 전담), 환자 인증(5C). 초안 병원 자동 정리(거절 계정의 빈 병원)는 수동.

---

## 9. 성공 기준 (5B Done)
1. 병원이 `/hospital/register`로 자가등록 → 초안 병원+PENDING 계정 생성, 승인 전 로그인 불가.
2. 슈퍼관리자가 `/admin/accounts`에서 승인(ACTIVE)/거절(SUSPENDED).
3. 승인된 병원이 `/hospital/login`→`/hospital`에서 자기 병원 정보·시간·메신저·사진·의료진·부작용 수정(가격·등급·공개·평점은 불가/숨김).
4. 병원이 자기 예약만 보고 상태 변경, 타 병원 예약·데이터 접근 차단(소유권 검증).
5. 슈퍼관리자는 전체 관리(병원·가격·등급·공개·전 예약) 유지.
6. `npm test`(신규 순수로직) + `npm run build` 통과, 기존 흐름 비회귀.

---

## 10. 테스트
- 순수 TDD: `validateHospitalRegistration`(이메일·비번·병원명), `pickHospitalEditableFields`(플랫폼 필드 제외), `ownsHospital`/`ownsBooking`(소유권).
- 통합: 등록→PENDING 로그인 차단→승인→로그인→자기 병원만 수정→타 병원 update 거부→자기 예약만 상태변경. 빌드.
- 회귀: 슈퍼관리자 전체 관리·환자 화면·예약 알림 정상.
