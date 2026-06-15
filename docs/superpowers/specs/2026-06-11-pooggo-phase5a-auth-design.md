# PooGGo Global Hub — Phase 5A 설계서 (인증 토대 · NextAuth)

작성일: 2026-06-11
대상: 단일 비밀번호 관리자(HMAC 쿠키)를 NextAuth(Auth.js v5) 기반 계정·역할 인증으로 전환한다. 슈퍼관리자 계정화 + 역할(SUPER_ADMIN/HOSPITAL/PATIENT) 토대 구축.
범위: **Phase 5A — 인증 토대 (멀티테넌트 Phase 5의 1/3 서브페이즈)**

---

## 1. 컨텍스트 & 확정 결정

Phase 1~4 완료·배포됨. 현재 `/admin`은 **단일 `ADMIN_PASSWORD` + HMAC 쿠키**(`lib/auth.ts`, `requireAdmin`)로 보호된다. Phase 5는 이를 **역할기반 멀티테넌트**로 전환하며, 3개 서브페이즈로 분해:
- **5A [인증 토대]** ← 본 문서: NextAuth + 계정/역할 모델 + 세션 + 슈퍼관리자 계정화
- 5B [병원 테넌시]: 병원 자가등록+승인, 계정↔병원 연결, 권한 스코핑
- 5C [환자 인증]: 환자 가입/로그인 + Phase 4에서 가린 후기 로그인 게이팅

### 확정 결정
| 항목 | 결정 |
|---|---|
| 인증 라이브러리 | **NextAuth (Auth.js v5)**, Credentials provider, **JWT 세션** |
| 비밀번호 | **bcryptjs 해시** (평문 `User.password` 대체) |
| 역할 | **SUPER_ADMIN / HOSPITAL / PATIENT** |
| 슈퍼관리자 초기 계정 | **env 시드** (`SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD`) |
| 기존 관리자 | **즉시 NextAuth 계정로그인으로 교체**, HMAC/`ADMIN_PASSWORD` 은퇴 |
| 배포 전제 | 슈퍼관리자 email/비번을 env에 등록해야 로그인 가능(미등록 시 로그인 불가) |

---

## 2. 계정·역할 모델 (User 확장)

`User` 모델 변경(굵게=신규/변경):
| 필드 | 변경 | 비고 |
|---|---|---|
| id, email @unique, name?, phone?, country? | 유지 | |
| ⤳ **passwordHash** `String?` | `password`→`passwordHash`로 변경 | bcrypt 해시 저장 |
| role `String @default("PATIENT")` | 유지(값 확장) | SUPER_ADMIN/HOSPITAL/PATIENT |
| ★ **hospitalId** `String?` | 신규 | HOSPITAL 역할이 소속한 병원(5B에서 활용). FK→Hospital |
| ★ **status** `String @default("ACTIVE")` | 신규 | ACTIVE/PENDING/SUSPENDED (5B 승인 대비) |
| ★ hospital `Hospital?` 관계 | 신규 | |
| leads, createdAt, updatedAt | 유지 | |

`Hospital`에 `users User[]` 역관계 추가. 마이그레이션은 **증분·비파괴**(컬럼 추가/리네임). 기존 User 데이터는 없거나 dev 시드라 안전.

> `password`(평문) → `passwordHash` 리네임은 기존 행에 평문이 있으면 손실되나, 현재 User 테이블은 사용 안 됨(빈 테이블). 안전.

---

## 3. NextAuth(Auth.js v5) 설정

- **파일**: `auth.ts`(루트, `NextAuth({...})` 설정·`auth`/`signIn`/`signOut` export), `app/api/auth/[...nextauth]/route.ts`(`export { GET, POST } from auth handlers`).
- **Provider**: `Credentials`(email, password). `authorize()`가 DB에서 User 조회 → `verifyPassword`로 bcrypt 비교 → 성공 시 `{id, email, role, hospitalId}` 반환. status!=ACTIVE면 거부.
- **세션 전략**: `jwt`(Credentials는 DB세션 불가). `callbacks.jwt`로 token에 `role`·`hospitalId`·`id` 주입, `callbacks.session`으로 session.user에 노출.
- **env**: `AUTH_SECRET`(필수, openssl rand). Prisma 어댑터는 **불필요**(credentials+JWT는 어댑터 없이 authorize에서 직접 DB 조회).
- ⚠️ **검증필요**: Auth.js v5 + Next 16 정확한 import/handler 시그니처는 구현 플랜에서 context7로 확정.

### 세션 형태
```ts
session.user = { id: string; email: string; role: "SUPER_ADMIN"|"HOSPITAL"|"PATIENT"; hospitalId: string | null }
```

---

## 4. 비밀번호 & 역할 가드 (순수 로직)

- `lib/auth/password.ts`: `hashPassword(plain): Promise<string>`(bcryptjs), `verifyPassword(plain, hash): Promise<boolean>`.
- `lib/auth/roles.ts`: `ROLES` 상수, `hasRole(userRole, allowed[]): boolean`(순수). 
- `lib/auth/guard.ts`: `requireRole(allowed[])` — `auth()` 세션 조회 후 역할 불충족 시 `redirect("/admin/login")` (또는 401). 서버컴포넌트·액션에서 사용.

---

## 5. 슈퍼관리자 시드 (env)

- `prisma/seed.ts`(또는 별도 `scripts/seed-admin.ts`)에서 `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` 읽어 슈퍼관리자 User **upsert**(email 기준): `{ role:"SUPER_ADMIN", passwordHash: hash(pw), status:"ACTIVE" }`. env 없으면 스킵(로그).
- 기존 `prisma/seed.ts`(병원 시드)와 공존: 병원 시드 후 관리자 upsert 추가.

---

## 6. 관리자 이전 (HMAC → NextAuth)

- `app/admin/login/page.tsx`: 비밀번호 1개 폼 → **이메일+비밀번호** 폼. 제출 시 NextAuth `signIn("credentials", ...)`. 실패 시 에러 표시.
- `app/admin/(protected)/layout.tsx`: `await requireAdmin()`(HMAC) → `await requireRole(["SUPER_ADMIN"])`(NextAuth 세션+역할).
- 서버액션 `app/admin/hospital-actions.ts`·`booking-actions.ts`의 모든 `await requireAdmin()` → `await requireRole(["SUPER_ADMIN"])`.
- 로그아웃: NextAuth `signOut()`.
- **은퇴/삭제**: `lib/auth.ts`(HMAC 토큰), `app/admin/auth-actions.ts`의 password `login`/`logout`/`requireAdmin`(NextAuth로 대체). `lib/auth.test.ts` 제거 또는 신규 테스트로 대체.

---

## 7. 환경변수 변경
| 키 | 변화 |
|---|---|
| `AUTH_SECRET` | **추가**(NextAuth 세션 서명) |
| `SUPER_ADMIN_EMAIL` | **추가** |
| `SUPER_ADMIN_PASSWORD` | **추가** |
| `ADMIN_PASSWORD` | **은퇴**(제거) |
| `ADMIN_SESSION_SECRET` | **은퇴**(제거) |
`.env.example` 갱신. 배포(Vercel)·로컬 양쪽 등록. **미등록 시 슈퍼관리자 로그인 불가** → 시드도 안 돔.

---

## 8. 범위 경계 (YAGNI)
5A가 **하지 않는** 것: 병원 자가등록·승인(5B), 환자 가입·후기 게이팅(5C), 소셜로그인, 비밀번호 재설정/찾기, 이메일 인증, 계정 관리 UI. `hospitalId`/`status` 필드는 만들되 5A에선 슈퍼관리자만 사용.

---

## 9. 성공 기준 (5A Done)
1. 슈퍼관리자가 **이메일+비밀번호로 `/admin` 로그인**(NextAuth), 보호 페이지 접근 가능.
2. 미인증/비SUPER_ADMIN 접근 시 로그인으로 리다이렉트.
3. 비밀번호는 **bcrypt 해시**로 저장·검증(평문 없음).
4. 기존 HMAC/`ADMIN_PASSWORD` 경로가 제거되고 관리자 기능(병원 CRUD·예약 관리)이 새 인증으로 정상 동작.
5. env 시드로 슈퍼관리자 계정이 생성된다.
6. `npm test`(신규 순수로직) + `npm run build` 통과.

---

## 10. 테스트
- 순수 TDD: `verifyPassword`(해시 매칭/불일치), `hasRole`(허용/거부), authorize 검증 로직(status·비번).
- 통합: 시드된 슈퍼관리자 로그인→대시보드, 미인증 리다이렉트, 빌드. (NextAuth 세션은 통합·수동 검증.)
- 회귀: 병원 CRUD·예약 파이프라인이 새 가드에서 정상.
