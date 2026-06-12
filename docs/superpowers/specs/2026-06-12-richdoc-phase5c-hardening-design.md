# RICH DOC Global Hub — Phase 5C 강화 설계서 (후기 모더레이션 + 이메일 인증)

작성일: 2026-06-12
대상: Phase 5C(환자 인증+후기 게이팅) 후속으로, 의료광고법 자문([[2026-06-12-medical-ad-prereview-analysis]])의 결론 두 가지를 코드로 반영한다 — **② 후기 신고·사후 모더레이션**(큐레이션 회피·효과오인 후기 사후차단)와 **③ 이메일 인증**(게이팅 폐쇄성 강화로 "누구나 즉시가입→불특정다수성" 리스크 완화).
범위: **Phase 5C 강화 (후속 #1·#3)** — 단일 스펙·단일 PR.

---

## 1. 컨텍스트 & 확정 결정

Phase 5C 완료·배포됨: 환자 가입/로그인(즉시 ACTIVE+자동로그인), 후기 로그인 게이팅(읽기·쓰기), Review.authorUserId 계정귀속, 금지어 스캐너+면책.

법률 자문(deep-research) 핵심:
- **로그인 게이팅 ≠ 자동 면제**: 누구나 즉시 가입(ACTIVE)이면 불특정다수성 유지(복지부 해석) → **③ 이메일 인증으로 진입장벽**.
- **플랫폼 큐레이션 = 광고화 위험**: 후기를 추천·정렬·강조하면 안 됨. 효과오인 후기는 **사후 차단** → **② 신고·모더레이션**(공개는 시간순 중립 유지).

### 확정 결정 (브레인스토밍 합의)
| 항목 | 결정 |
|---|---|
| ③ 인증 강도 | **엄격** — 가입 시 status=PENDING, 이메일 인증 링크 클릭 전 로그인·열람·작성 전부 차단. **자동로그인 폐지** |
| ③ 토큰 저장 | User에 `emailVerifyToken`·`emailVerifyExpires` 2필드(단일 토큰, 재발송 시 갱신). 별도 모델 안 둠 |
| ③ status 의미 | 환자 PENDING=미인증 / ACTIVE=인증완료. 병원 PENDING(관리자 승인대기)과 **역할로 구분**(충돌 없음) |
| ③ 이메일 | Resend(`lib/notify/email.ts`) 재사용. **4개 로케일** 제목/본문. dev 폴백=키 미설정 시 인증링크 콘솔 로그 |
| ② 저장 | **Report 모델**(reviewId·reporterUserId·reason·createdAt, `@@unique`) + **Review.isHidden** 소프트숨김 |
| ② 조치 | 관리자 숨김(soft, 데이터 보존)/숨김해제/삭제. 공개·내후기에서 숨김 제외 |
| ② 큐레이션 | 공개는 **시간순 중립** 유지, 평균평점 우열강조 안 함(자문 §3 준수) |
| 대시보드 | 관리자 대시보드 "신고된 후기" 카운트 **포함** |

---

## 2. 데이터 모델 (마이그레이션 1건: `20260612000002_review_moderation_email_verify`)

```prisma
model Review {
  // ...기존(authorUserId 포함)...
  isHidden  Boolean  @default(false)   // 신규: 소프트숨김
  reports   Report[]                    // 신규 역관계
}

model Report {                          // 신규: 후기 신고
  id             String   @id @default(uuid())
  reviewId       String
  review         Review   @relation(fields: [reviewId], references: [id], onDelete: Cascade)
  reporterUserId String?
  reporter       User?    @relation(fields: [reporterUserId], references: [id], onDelete: SetNull)
  reason         String?
  createdAt      DateTime @default(now())
  @@unique([reviewId, reporterUserId])  // 1인 1신고
  @@index([reviewId])
}

model User {
  // ...기존...
  emailVerifyToken   String?            // 신규
  emailVerifyExpires DateTime?          // 신규
  reports            Report[]           // 신규 역관계
}
```
- 마이그레이션: Review.isHidden 컬럼(default false, 하위호환) + Report 테이블·FK·인덱스·유니크 + User 2컬럼. 명명 `20260612000002_review_moderation_email_verify`.

---

## 3. ③ 이메일 인증 (엄격)

### 3.1 순수 로직 (TDD) `lib/auth/verification.ts`
- `VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000`.
- `generateVerifyToken(): string` — `crypto.randomUUID()` 2개 결합(충분한 엔트로피, 추측불가).
- `isVerifyTokenExpired(expires: Date | null, now: number): boolean` — null이면 true(만료 취급).
- 콜로케이트 테스트: 토큰 비어있지 않음·매번 다름, 만료 판정(과거/미래/null).

### 3.2 가입 변경 `app/[locale]/account/signup-actions.ts` `registerPatient`
1. 검증·중복검사(기존) → `hashPassword`.
2. `generateVerifyToken()` + 만료(now+TTL).
3. `User.create({ role:"PATIENT", status:"PENDING", emailVerifyToken, emailVerifyExpires, ... })`. **(즉시 ACTIVE·자동 signIn 제거)**
4. `sendEmail`(verificationEmail, 링크 `/{locale}/account/verify?token=…`). 발송 skip(키 미설정) 시 인증링크 `console.info`.
5. `redirect('/{locale}/account/verify-sent?email=…')`.

### 3.3 인증 페이지 `app/[locale]/account/verify/page.tsx` (server)
- `?token` 조회 `db.user.findFirst({ where:{ emailVerifyToken: token } })`.
- 없음/만료(`isVerifyTokenExpired`) → 안내(만료 시 재발송 링크).
- 정상 → `update({ status:"ACTIVE", emailVerifyToken:null, emailVerifyExpires:null })` → `redirect('/{locale}/account/login?verified=1')`.
- 로그인 페이지: `?verified=1`이면 "인증 완료, 로그인하세요" 노출.

### 3.4 안내·재발송 `app/[locale]/account/verify-sent/page.tsx`
- "인증 메일을 보냈습니다(<email>)" + 재발송 폼.
- `resendVerification(formData)`(server action, `app/[locale]/account/verify-actions.ts`): 이메일로 User 조회 → PENDING이면 토큰 갱신+재발송, ACTIVE면 무시(동일 안내). 이메일 열거 방지 위해 항상 동일 응답.

### 3.5 이메일 템플릿 `lib/notify/templates.ts`
- `verificationEmail(link: string, locale: string): { subject; html }` — 4개 로케일(ko/en/zh/ja) 제목·본문 맵, HTML 이스케이프(`esc`). 면책/유치 표현 없음(중립). 콜로케이트 테스트(링크 포함·이스케이프).

### 3.6 영향
- auth.ts `authorize`는 이미 `status==="ACTIVE"`만 허용 → **변경 없음**(PENDING 자동 차단).
- 기존 5C 자동로그인 UAT 시나리오는 "가입→메일확인→인증→로그인"으로 대체.
- ⚠️ **기존 5B 관리자 승인 큐 보정(필수)**: 환자도 PENDING이 되므로, `/admin/accounts` 목록과 대시보드 "승인 대기" 카운트가 **role=HOSPITAL로 스코핑**되어야 한다(환자 PENDING이 병원 승인 큐에 섞여 관리자가 이메일 인증을 우회 승인하는 것 방지). 쿼리에 `where: { role: "HOSPITAL", status: "PENDING" }` 추가.

---

## 4. ② 후기 신고·모더레이션 (Report + 소프트숨김)

### 4.1 순수 로직 (TDD) `lib/reviews/report.ts`
- `canReport(role?: string): boolean` — 로그인(PATIENT/HOSPITAL/SUPER_ADMIN) true(`canViewReviews` 재사용 가능하나 의미 분리).
- `validateReportReason(reason: string): string[]` — 길이(≤300) + 금지어(`scanForbidden`) 선택 검증. 빈 사유 허용.

### 4.2 신고 액션 `app/actions.ts` `reportReview`
- `reportReview(formData)`(로그인 필수): `canReport` 확인 → reviewId·reason 추출 → `validateReportReason` → 본인 후기(authorUserId===세션) 신고 차단 → `db.report.create`(중복 시 `@@unique` 위반 catch→무시, "이미 신고함") → `{ ok }`.
- 상세 후기 목록 각 항목에 `components/hospitals/ReportButton.tsx`(client) — 사유 선택적 입력·신고 호출·완료표시.

### 4.3 공개·내후기 필터
- `app/actions.ts` `getHospitalById`: `userReviews: { where: { isHidden: false }, orderBy: { createdAt: "desc" } }` (시간순 중립 유지).
- 계정 "내 후기"(`account/(protected)/page.tsx`): 본인 것 전부 표시, `isHidden`이면 "숨김 처리됨" 라벨.

### 4.4 관리자 모더레이션 `app/admin/(protected)/reviews/`
- `page.tsx`: `requireRole(["SUPER_ADMIN"])`. 후기 목록(병원명·작성자·내용·신고수·숨김상태), **신고 많은 순** 정렬(관리자 내부용). 페이지네이션은 간단(최근 N).
- `app/admin/review-actions.ts`: `hideReview(id)`/`unhideReview(id)`/`deleteReview(id)` — `requireRole(["SUPER_ADMIN"])`, `revalidatePath`. 삭제는 Report도 Cascade.
- 네비/대시보드: `/admin` 대시보드에 "신고된 후기(미숨김 + report>0)" 카운트 카드 + `/admin/reviews` 링크.

### 4.5 자문(§3) 준수
- 공개 노출은 시간순 중립, 플랫폼이 후기를 추천·강조·정렬하지 않음. 관리자 정렬(신고순)은 비공개 내부 도구.

---

## 5. i18n
- `Account`: `verifySentTitle`, `verifySentBody`, `resend`, `verifiedBanner`, `verifyExpired`, `verifyInvalid`, `checkEmail`(4 로케일).
- `Detail`: `reportReview`, `reportReason`, `reported`, `reportAlready`, `reviewHidden`(4 로케일).
- 관리자 페이지는 비로케일 → ko 하드코딩(기존 admin 일관).
- 이메일 본문은 템플릿 내 4언어 맵(§3.5).

---

## 6. 범위 경계 (YAGNI)
안 함: 자동 숨김 임계치, 신고 사유 enum 분류, 후기 수정, 비밀번호 재설정·찾기(별건), 알림(신고 시 관리자 텔레그램은 후순위), 이메일 인증 외 본인확인(휴대폰 등).

---

## 7. 성공 기준 (Done)
1. 신규 가입 → status=PENDING, 인증메일(또는 dev 콘솔 링크) → **인증 전 로그인 불가**.
2. 인증 링크 클릭 → ACTIVE → 로그인 가능, 로그인 페이지 "인증 완료" 배너. 만료 토큰 안내·재발송.
3. 로그인 환자가 타인 후기 신고 → Report 생성(중복 차단), 본인 후기 신고 차단.
4. 관리자가 `/admin/reviews`에서 숨김 → 공개 상세·내후기(라벨)에서 제외, 숨김해제·삭제 동작.
5. 대시보드 "신고된 후기" 카운트 표시.
6. 공개 후기는 시간순 중립 노출(큐레이션 없음).
7. `npm test`(신규 순수로직) + `npm run build` 통과, 기존 흐름 비회귀.

---

## 8. 테스트·배포
- 순수 TDD: `generateVerifyToken`/`isVerifyTokenExpired`, `validateReportReason`/`canReport`, `verificationEmail`(템플릿).
- 수동 UAT: 가입→PENDING(로그인 차단)→인증→로그인→후기 신고→관리자 숨김/삭제→공개 제외 확인. 운영DB 쓰기는 사람이 `npm run dev`(Resend 키 또는 콘솔 링크).
- ⚠️ **배포 필수**: `RESEND_API_KEY`·`RESEND_FROM` 등록(미설정 시 인증메일 미발송→가입 PENDING 묶임). 마이그레이션 `20260612000002_*` `migrate deploy`.
- 회귀: 기존 예약·병원포털·admin·5C 게이팅 정상.
