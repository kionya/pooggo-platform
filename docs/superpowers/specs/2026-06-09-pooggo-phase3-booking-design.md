# PooGGo Global Hub — Phase 3 설계서 (예약 + 알림)

작성일: 2026-06-09
대상: 외국인 환자가 병원에 희망일시로 예약요청하고, 관리자가 파이프라인으로 관리하며, 환자·관리자·병원에 자동 알림이 가는 예약 시스템
범위: **Phase 3 (예약) — 단일 스펙**

---

## 1. 컨텍스트 & 확정 결정

Phase 1(병원 데이터+관리자), Phase 2(다국어+발견) 완료·배포됨. Phase 3는 발견 다음 단계인 **예약(전환)**을 만든다. 비회원 외국인이 병원을 골라 개인정보+희망일시를 남기면 예약이 생성되고, 관련자에게 알림이 가며, 관리자가 상태를 관리한다.

| 항목 | 결정 |
|---|---|
| 데이터 모델 | **신규 `Booking` 모델** (User FK 없음 — 비회원). 기존 Lead/Consultation/Settlement는 레거시로 유지 |
| 예약 대상 | **단일 + 다중 둘 다** (상세/비교에서 1곳, 카트에서 최대3곳 일괄) |
| 희망일시 | **1지망 + 2지망 날짜 + 시간대(오전/오후/저녁)** |
| 수집 정보 | 이름·연락처·국적(필수) + 선호 메신저 채널·계정 + 관심시술·메모 + 이메일·나이·성별(선택) + 사진 |
| 사진 | **Vercel Blob 업로드** (`BLOB_READ_WRITE_TOKEN`) |
| 알림 대상 | **관리자/플랫폼 + 환자(확인) + 병원** |
| 알림 채널 | **이메일(Resend) + 텔레그램(관리자)** |
| env 부재 시 | **기능 안 깨지고 해당 알림/업로드만 조용히 스킵 + 로그** (개발 안전) |

### 상태 파이프라인
`NEW`(접수) → `CONFIRMED`(상담확정) → `VISITED`(내원) → `DONE`(완료) / `CANCELLED`(취소)

---

## 2. 데이터 모델 — 신규 `Booking`

```prisma
model Booking {
  id            String   @id @default(uuid())
  code          String   @unique          // 추적코드 (예: RDB-7K2M9X)
  status        String   @default("NEW")  // NEW/CONFIRMED/VISITED/DONE/CANCELLED
  locale        String   @default("ko")   // 예약 시 언어(알림 언어용)

  groupId       String?                   // 다중요청 묶음(같은 폼에서 N병원 신청 시 공유)

  hospitalId    String
  hospital      Hospital @relation(fields: [hospitalId], references: [id])

  // 개인정보
  name          String
  phone         String
  nationality   String
  email         String?
  age           Int?
  gender        String?                   // MALE/FEMALE/OTHER

  // 연락(선호 메신저)
  messengerChannel String?                // whatsapp/line/wechat/kakao
  messengerHandle  String?

  // 요청 내용
  treatmentInterest String?
  memo          String?
  photo         String?                   // Vercel Blob URL

  // 희망일시
  preferredDate1 DateTime
  preferredDate2 DateTime?
  timeOfDay      String                   // MORNING/AFTERNOON/EVENING

  consent        Boolean  @default(false) // 개인정보 수집·이용 동의

  adminNote      String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([status])
  @@index([hospitalId])
  @@index([groupId])
}
```
`Hospital` 모델에 `bookings Booking[]` 관계 추가. 마이그레이션은 증분(신규 테이블 추가, 파괴적 아님).

### 상태 전이 규칙 (순수 함수 `canTransition(from, to)`)
- `NEW` → CONFIRMED | CANCELLED
- `CONFIRMED` → VISITED | CANCELLED
- `VISITED` → DONE | CANCELLED
- `DONE` → (종료)
- `CANCELLED` → (종료)
역행·점프(예: DONE→NEW) 차단.

---

## 3. 환자 예약 플로우

### 진입점 (3개)
- 상세 페이지 "예약하기" 버튼 → `/[locale]/booking?hospital=<id>`
- 비교 페이지 열별 CTA(기존 consultCta 대체) → `/[locale]/booking?hospital=<id>`
- 홈 카트 "예약요청" 버튼 → `/[locale]/booking?hospitals=<id1,id2,id3>` (다중)

### 예약 폼 `/[locale]/booking`
- 서버: 쿼리에서 병원 id(들) 파싱 → 대상 병원명 표시(다국어).
- `BookingForm`(클라이언트): 개인정보·메신저·관심시술·메모·**사진 파일**·1/2지망 날짜·시간대 + **개인정보 수집·이용 동의 체크(필수)**.
- 제출 → 서버액션 `createBooking(formData)`:
  1. 입력 검증(`validateBookingInput`) — 실패 시 에러 반환
  2. 사진 있으면 Vercel Blob 업로드 → URL
  3. 대상 병원마다 `Booking` 생성(다중이면 공유 `groupId`, 각 병원별 `code`)
  4. 알림 팬아웃(best-effort)
  5. 성공 → 단일은 `/[locale]/booking/success?code=<code>`, 다중은 `/[locale]/booking/success?group=<groupId>`
- 성공 페이지: `code`면 단건 추적코드, `group`이면 그룹 내 병원별 코드 목록 + 예약 요약 + "확인 이메일을 보냈습니다"(이메일 입력 시).

---

## 4. 사진 첨부 (Vercel Blob)
- `lib/upload/blob.ts` `uploadBookingPhoto(file): Promise<string | null>`:
  - `BLOB_READ_WRITE_TOKEN` 없으면 `null` 반환 + 로그(스킵).
  - 있으면 `@vercel/blob` `put(\`bookings/${uuid}-${name}\`, file, { access: "public" })` → URL.
- 파일 타입/크기 가드(이미지, ≤5MB). 초과 시 스킵 + 폼 경고.

---

## 5. 자동 알림 (Resend + Telegram, best-effort 팬아웃)

`lib/notify/index.ts` `sendBookingNotifications(bookings, hospitalsById)`:
- 메시지 본문은 **순수 함수 `lib/notify/templates.ts`**로 조립(TDD 대상): `patientEmail(booking, hospital)`, `adminMessage(booking, hospital)`, `hospitalEmail(booking, hospital)`.
- 전송 어댑터:
  - `lib/notify/email.ts` `sendEmail({to, subject, html})`: `RESEND_API_KEY` 없으면 스킵. 있으면 Resend API(`https://api.resend.com/emails`, `from = RESEND_FROM`)로 POST.
  - `lib/notify/telegram.ts` `sendTelegram(text)`: `TELEGRAM_BOT_TOKEN`/`TELEGRAM_ADMIN_CHAT_ID` 없으면 스킵. 있으면 Bot API `sendMessage`.

| 대상 | 채널 | 조건 |
|---|---|---|
| 환자 | 이메일 | `booking.email` 있을 때. 언어 = `booking.locale` |
| 관리자/플랫폼 | 텔레그램 + 이메일(`ADMIN_NOTIFY_EMAIL`) | 항상(키 있으면) |
| 병원 | 이메일 | `hospital.messengers.email` 있을 때 |

- 모든 발송은 `Promise.allSettled`로 **병렬·실패격리**. 예약 저장은 알림 결과와 무관하게 이미 커밋됨.
- 다중요청은 병원별 알림 + 관리자에 그룹 요약 1건.

---

## 6. 관리자 예약 관리

- `/admin/(protected)/bookings/page.tsx`: 상태 필터 목록(NEW 기본 상단), 각 행에 상태·환자·병원·희망일시.
- 행 상세/액션: 상태 변경 버튼(허용 전이만 노출), `adminNote` 입력. groupId 묶음 표시.
- 서버액션 `updateBookingStatus(id, next)`: `requireAdmin` + `canTransition` 검증 후 갱신.
- 대시보드(`/admin`)에 "신규 예약(NEW)" 카운트 카드 추가.
- 기존 `/admin/consultations`는 그대로(레거시).

---

## 7. 개인정보 & 법규
- **개인정보 수집·이용 동의** 체크 필수(이름·연락·사진·고민 = 개인/민감정보). 동의 문구 다국어. 미동의 시 제출 차단.
- 예약은 환자 발신 문의라 광고법 노출 낮음. "예약 = 시술 확정" 오인 금지 — **희망 요청이며 병원 확인 후 확정**임을 폼·성공·알림에 명시.
- 사진(전후/환부)은 민감정보 → 동의로 커버, Blob은 public URL이나 **추측 불가 경로(uuid)**.
- 본격 전수검수는 Phase 4.

---

## 8. 다국어 (i18n)
`Booking` 메시지 네임스페이스 4언어 추가: 폼 라벨(이름/연락처/국적/메신저/관심시술/메모/사진/희망일시/시간대), 시간대 옵션, 동의 문구, 상태명, 성공 안내, "확정 아님" 고지. 환자 확인 이메일 본문도 `booking.locale` 기반.

---

## 9. 환경변수 (전부 부재 시 graceful skip)
| 키 | 용도 |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 사진 업로드 |
| `RESEND_API_KEY` | Resend 이메일 |
| `RESEND_FROM` | 이메일 발신 주소(예: `noreply@pooggo...`) |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 봇 |
| `TELEGRAM_ADMIN_CHAT_ID` | 관리자 알림 채팅 ID |
| `ADMIN_NOTIFY_EMAIL` | 관리자 이메일 수신 주소 |
배포(Vercel)·로컬(.env) 양쪽 등록 필요. 미등록이면 해당 경로만 스킵(로그), 예약은 정상.

---

## 10. 범위 경계 (YAGNI)
안 함: 실시간 슬롯 캘린더(요청형 유지) / 결제·정산(Settlement, Phase 3+ 유치업자) / 환자 로그인·예약 조회 포털 / 메신저(WhatsApp/LINE) 자동발송(알림은 이메일+텔레그램까지) / 병원별 알림 채널 커스텀(병원은 messengers.email로만).

---

## 11. 파일 구조

**신규 (순수 로직 — TDD)**
- `lib/booking/types.ts` (`BookingInput`, 상태/시간대 상수)
- `lib/booking/validation.ts` (`validateBookingInput`) + `validation.test.ts`
- `lib/booking/status.ts` (`BOOKING_STATUSES`, `canTransition`) + `status.test.ts`
- `lib/booking/code.ts` (`makeBookingCode`) — 추적코드 생성
- `lib/booking/ids.ts` (`parseHospitalIds`) — 쿼리 ids 파싱 + `ids.test.ts`
- `lib/notify/templates.ts` (`patientEmail`/`adminMessage`/`hospitalEmail`) + `templates.test.ts`

**신규 (연동/UI)**
- `lib/upload/blob.ts`, `lib/notify/email.ts`, `lib/notify/telegram.ts`, `lib/notify/index.ts`
- `app/[locale]/booking/page.tsx`, `app/[locale]/booking/success/page.tsx`
- `app/[locale]/booking/actions.ts` (`createBooking`)
- `components/booking/BookingForm.tsx`
- `app/admin/(protected)/bookings/page.tsx`, `app/admin/booking-actions.ts` (`updateBookingStatus`)
- `messages/*.json`에 `Booking` 네임스페이스

**수정**
- `prisma/schema.prisma`(Booking 모델 + Hospital.bookings) + 마이그레이션
- `app/[locale]/hospitals/[id]/page.tsx`(예약하기 버튼 → /booking)
- `app/[locale]/compare/page.tsx`(consultCta → /booking)
- `components/HospitalMainSection.tsx`(카트 "예약요청" → /booking?hospitals=)
- `app/admin/(protected)/page.tsx`(NEW 예약 카운트)
- `app/admin/(protected)/layout.tsx`(네비에 "예약" 추가)

---

## 12. 성공 기준 (Phase 3 Done)
1. 상세/비교/카트에서 예약 폼 진입 → 개인정보·희망일시·동의 입력 → 예약 생성.
2. 다중(카트 3곳) 신청 시 병원별 Booking + 공유 groupId 생성.
3. 사진 첨부 시 Blob 업로드되어 `booking.photo`에 URL 저장(토큰 없으면 스킵).
4. 예약 생성 시 환자(이메일)·관리자(텔레그램+이메일)·병원(이메일)에 알림(키 없으면 해당만 스킵, 예약은 성공).
5. 관리자 `/admin/bookings`에서 상태 파이프라인으로 관리(허용 전이만, 역행 차단).
6. 동의 미체크·필수필드 누락 시 제출 거부.
7. `npm test`(신규 순수로직) + `npm run build` 통과, 기존 흐름 비회귀.

---

## 13. 테스트
- 순수 TDD: `validateBookingInput`(필수·동의·날짜), `canTransition`(전이표), `parseHospitalIds`(단일/다중/최대3), `makeBookingCode`(형식·유일성 경향), `templates`(본문에 핵심 필드 포함).
- 연동: Blob 업로드·Resend·Telegram은 env 부재 시 graceful skip을 단위로 확인(키 없을 때 호출이 throw 안 하고 skip 반환). 실제 전송은 수동 검증(키 등록 후).
- 통합: 예약 생성→DB 저장→상태 변경, 다중 groupId, 빌드, 수동 UAT.
