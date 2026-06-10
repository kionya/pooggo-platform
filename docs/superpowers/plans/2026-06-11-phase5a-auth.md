# RICH DOC Phase 5A — 인증 토대(NextAuth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 단일 비밀번호 HMAC 관리자 인증을 NextAuth(Auth.js v5) 이메일+비밀번호 계정 인증으로 전환하고, 역할(SUPER_ADMIN/HOSPITAL/PATIENT)·세션 토대를 구축한다.

**Architecture:** Auth.js v5 Credentials provider + JWT 세션. 비밀번호는 bcryptjs 해시(순수 함수, TDD). 세션/JWT에 `role`·`hospitalId` 주입. 슈퍼관리자는 env 시드. 기존 `/admin` 가드(HMAC `requireAdmin`)를 세션+역할 가드 `requireRole`로 교체하고 HMAC/`ADMIN_PASSWORD`를 은퇴.

**Tech Stack:** Next.js 16 App Router, Auth.js v5 (`next-auth@beta`), bcryptjs, Prisma + Neon Postgres, vitest.

**참고 설계서:** `docs/superpowers/specs/2026-06-11-richdoc-phase5a-auth-design.md`

> **순서:** 순수 로직(T1 password, T2 roles) → 스키마(T3) → NextAuth 설정·가드(T4) → 슈퍼관리자 시드(T5) → 관리자 이전·HMAC 은퇴(T6) → 검증(T7). 각 태스크는 `npm run build` 통과로 끝낸다.
> **⚠️ 리스크:** `next-auth@beta`(v5) + Next 16 + React 19 조합. 설치 시 peer 경고 가능 → 빌드·런타임을 각 태스크에서 확인. 문제 시 BLOCKED 보고.

---

## File Structure

**신규 (순수 로직 — TDD)**
- `lib/auth/password.ts` (+ `password.test.ts`) — `hashPassword`/`verifyPassword`
- `lib/auth/roles.ts` (+ `roles.test.ts`) — `ROLES`, `hasRole`

**신규 (NextAuth)**
- `auth.ts` (루트) — NextAuth 설정(Credentials + callbacks), export `handlers/signIn/signOut/auth`
- `app/api/auth/[...nextauth]/route.ts` — `export { GET, POST } = handlers`
- `types/next-auth.d.ts` — 세션/JWT 타입 보강(role, hospitalId)
- `lib/auth/guard.ts` — `requireRole(allowed[])`

**수정**
- `prisma/schema.prisma` — User(passwordHash/hospitalId/status) + Hospital.users + 마이그레이션
- `prisma/seed.ts` — 슈퍼관리자 upsert(env)
- `app/admin/login/page.tsx` — 이메일+비밀번호 signIn
- `app/admin/(protected)/layout.tsx` — requireRole + signOut
- `app/admin/hospital-actions.ts`, `app/admin/booking-actions.ts` — requireAdmin → requireRole
- `.env.example`

**삭제(은퇴)**
- `lib/auth.ts`, `lib/auth.test.ts`, `app/admin/auth-actions.ts`

---

## Task 1: bcryptjs 설치 + 비밀번호 해시 (TDD)

**Files:**
- Create: `lib/auth/password.ts`, Test: `lib/auth/password.test.ts`

- [ ] **Step 1: 설치**

Run: `npm i bcryptjs && npm i -D @types/bcryptjs`
Expected: 설치 성공.

- [ ] **Step 2: 실패하는 테스트**

Create `lib/auth/password.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("해시는 평문과 다름", async () => {
    const h = await hashPassword("secret123!");
    expect(h).not.toBe("secret123!");
    expect(h.length).toBeGreaterThan(20);
  });
  it("올바른 비번은 검증 통과", async () => {
    const h = await hashPassword("secret123!");
    expect(await verifyPassword("secret123!", h)).toBe(true);
  });
  it("틀린 비번은 거부", async () => {
    const h = await hashPassword("secret123!");
    expect(await verifyPassword("wrong", h)).toBe(false);
  });
  it("빈 해시는 false", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -- lib/auth/password.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 4: 구현**

Create `lib/auth/password.ts`:
```ts
import bcrypt from "bcryptjs";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -- lib/auth/password.test.ts`
Expected: PASS (4).

- [ ] **Step 6: 커밋**

```bash
git add lib/auth/password.ts lib/auth/password.test.ts package.json package-lock.json
git commit -m "feat(auth): bcryptjs 비밀번호 해시/검증(TDD)"
```

---

## Task 2: 역할 상수·가드 로직 (TDD) + 타입 보강

**Files:**
- Create: `lib/auth/roles.ts`, Test: `lib/auth/roles.test.ts`
- Create: `types/next-auth.d.ts`

- [ ] **Step 1: 실패하는 테스트**

Create `lib/auth/roles.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { ROLES, hasRole } from "./roles";

describe("roles", () => {
  it("ROLES 3종", () => expect([...ROLES]).toEqual(["SUPER_ADMIN", "HOSPITAL", "PATIENT"]));
  it("허용 역할 true", () => expect(hasRole("SUPER_ADMIN", ["SUPER_ADMIN"])).toBe(true));
  it("비허용 역할 false", () => expect(hasRole("HOSPITAL", ["SUPER_ADMIN"])).toBe(false));
  it("undefined/빈 역할 false", () => {
    expect(hasRole(undefined, ["SUPER_ADMIN"])).toBe(false);
    expect(hasRole("", ["SUPER_ADMIN"])).toBe(false);
  });
  it("여러 허용 중 하나 매칭 true", () => expect(hasRole("HOSPITAL", ["SUPER_ADMIN", "HOSPITAL"])).toBe(true));
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- lib/auth/roles.test.ts`
Expected: FAIL.

- [ ] **Step 3: 구현**

Create `lib/auth/roles.ts`:
```ts
export const ROLES = ["SUPER_ADMIN", "HOSPITAL", "PATIENT"] as const;
export type Role = (typeof ROLES)[number];

export function hasRole(role: string | undefined | null, allowed: string[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- lib/auth/roles.test.ts`
Expected: PASS (5).

- [ ] **Step 5: 세션/JWT 타입 보강**

Create `types/next-auth.d.ts`:
```ts
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      hospitalId: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    role?: string;
    hospitalId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    hospitalId?: string | null;
  }
}
```

- [ ] **Step 6: 커밋**

```bash
git add lib/auth/roles.ts lib/auth/roles.test.ts types/next-auth.d.ts
git commit -m "feat(auth): 역할 상수·hasRole(TDD) + NextAuth 세션 타입 보강"
```

---

## Task 3: User 스키마 확장 + 마이그레이션

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: User 모델 수정 + Hospital 관계**

`prisma/schema.prisma`의 `model User { ... }`를 아래로 교체:
```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String?
  role          String    @default("PATIENT")
  name          String?
  phone         String?
  country       String?   @default("KR")

  hospitalId    String?
  hospital      Hospital? @relation(fields: [hospitalId], references: [id])
  status        String    @default("ACTIVE")

  leads         Lead[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([role])
  @@index([hospitalId])
}
```
그리고 `model Hospital { ... }`의 관계 목록(`bookings Booking[]` 근처)에 추가:
```prisma
  users     User[]
```

- [ ] **Step 2: 증분 마이그레이션 (비대화형)**

Run: `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script > /tmp/user.sql`
`/tmp/user.sql` 확인 — `ALTER TABLE "User"`에 `passwordHash`/`hospitalId`/`status` 컬럼 추가, `password` 컬럼 DROP, 인덱스·FK 추가만. (기존 User 테이블은 비어있어 `password` DROP 안전.) 파괴적이지만 데이터 없음. 만약 다른 테이블 변경이 섞이면 STOP/BLOCKED.
폴더 `prisma/migrations/20260611000001_user_auth/` 생성, `/tmp/user.sql`을 `migration.sql`로 복사, 맨 위 주석 `-- User 인증 확장(passwordHash/hospitalId/status) — 기존 User 비어있음`.
Run: `npx prisma migrate deploy`
Run: `npx prisma migrate status`(up to date) + `npx prisma generate`.

- [ ] **Step 3: 확인 + 빌드 + 커밋**

Run: `node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().user.count().then(c=>{console.log('user table ok, count=',c);process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})"`
Expected: `user table ok, count= 0`.
Run: `npm run build` (성공 — 아직 auth.ts 없음, 스키마만)
```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(auth): User 인증 확장(passwordHash/hospitalId/status/role) + 마이그레이션"
```

---

## Task 4: NextAuth(Auth.js v5) 설정 + 가드

**Files:**
- Create: `auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `lib/auth/guard.ts`
- Modify: `.env` (AUTH_SECRET 추가 — 커밋 안 됨)

- [ ] **Step 1: NextAuth 설치**

Run: `npm i next-auth@beta`
Expected: 설치 성공(peer 경고 가능 — 무시). 설치된 버전 보고.

- [ ] **Step 2: NextAuth 설정**

Create `auth.ts` (repo root):
```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const email = String(credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || user.status !== "ACTIVE" || !user.passwordHash) return null;
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, hospitalId: user.hospitalId };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role?: string }).role;
        token.hospitalId = (user as { hospitalId?: string | null }).hospitalId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = (token.role as string) ?? "PATIENT";
        session.user.hospitalId = (token.hospitalId as string | null) ?? null;
      }
      return session;
    },
  },
});
```

- [ ] **Step 3: 라우트 핸들러**

Create `app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 4: 역할 가드**

Create `lib/auth/guard.ts`:
```ts
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasRole } from "./roles";

// 세션 + 역할 가드. 불충족 시 /admin/login 으로 리다이렉트.
export async function requireRole(allowed: string[]) {
  const session = await auth();
  if (!session || !hasRole(session.user?.role, allowed)) {
    redirect("/admin/login");
  }
  return session;
}
```

- [ ] **Step 5: AUTH_SECRET 추가**

`.env`에 추가(값은 임의 생성 — `openssl rand -hex 32` 권장):
```
AUTH_SECRET=replace-with-openssl-rand-hex-32
```

- [ ] **Step 6: 빌드 확인**

Run: `npm run build`
Expected: 성공. `/api/auth/[...nextauth]` 라우트 생성. (아직 /admin은 기존 HMAC 사용 — T6에서 교체.)

- [ ] **Step 7: 커밋**

```bash
git add auth.ts "app/api/auth/[...nextauth]/route.ts" lib/auth/guard.ts package.json package-lock.json
git commit -m "feat(auth): NextAuth(Auth.js v5) Credentials+JWT 설정 + 역할 가드 requireRole"
```

---

## Task 5: 슈퍼관리자 env 시드

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `.env` (SUPER_ADMIN_* — 커밋 안 됨)

- [ ] **Step 1: 시드에 슈퍼관리자 upsert 추가**

`prisma/seed.ts`를 READ. 파일 상단 import에 추가: `import { hashPassword } from "../lib/auth/password";`
`main()` 함수의 병원 생성들 뒤, `console.log("🌱 ...")` 직전에 추가:
```ts
  const adminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminPw = process.env.SUPER_ADMIN_PASSWORD;
  if (adminEmail && adminPw) {
    await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      update: { role: "SUPER_ADMIN", status: "ACTIVE", passwordHash: await hashPassword(adminPw) },
      create: { email: adminEmail.toLowerCase(), role: "SUPER_ADMIN", status: "ACTIVE", passwordHash: await hashPassword(adminPw) },
    });
    console.log("👑 슈퍼관리자 계정 준비:", adminEmail.toLowerCase());
  } else {
    console.warn("⚠️ SUPER_ADMIN_EMAIL/PASSWORD 미설정 — 슈퍼관리자 시드 스킵");
  }
```
> 시드는 `tsx prisma/seed.ts`로 실행되며 `../lib/auth/password`는 bcryptjs import 가능.

- [ ] **Step 2: .env에 슈퍼관리자 자격 추가 + 시드 실행**

`.env`에 추가(값은 임의):
```
SUPER_ADMIN_EMAIL=admin@richdoc.local
SUPER_ADMIN_PASSWORD=changeme-admin-1234
```
Run: `npx prisma db seed` (또는 `npx tsx prisma/seed.ts`)
Expected: "👑 슈퍼관리자 계정 준비: admin@richdoc.local" 출력.

- [ ] **Step 3: 계정 확인**

Run: `node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().user.findMany({where:{role:'SUPER_ADMIN'}}).then(u=>{console.log(u.map(x=>({email:x.email,role:x.role,status:x.status,hasHash:!!x.passwordHash})));process.exit(0)})"`
Expected: 1건, role SUPER_ADMIN, status ACTIVE, hasHash true.

- [ ] **Step 4: 커밋**

```bash
git add prisma/seed.ts
git commit -m "feat(auth): 슈퍼관리자 env 시드(SUPER_ADMIN_EMAIL/PASSWORD upsert)"
```

---

## Task 6: 관리자 이전 (HMAC → NextAuth) + 은퇴

**Files:**
- Modify: `app/admin/login/page.tsx`, `app/admin/(protected)/layout.tsx`, `app/admin/hospital-actions.ts`, `app/admin/booking-actions.ts`, `.env.example`
- Delete: `lib/auth.ts`, `lib/auth.test.ts`, `app/admin/auth-actions.ts`

- [ ] **Step 1: 로그인 페이지 — 이메일+비밀번호 signIn**

Replace `app/admin/login/page.tsx` ENTIRELY:
```tsx
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  async function doLogin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/admin",
      });
    } catch (e) {
      if (e instanceof AuthError) redirect("/admin/login?error=1");
      throw e; // NEXT_REDIRECT 등은 재전파
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">RICH DOC 관리자</h1>
        <p className="text-gray-500 mb-6 text-sm text-center">이메일과 비밀번호로 로그인하세요.</p>
        {error && <p className="text-red-500 text-sm mb-4 text-center">이메일 또는 비밀번호가 올바르지 않습니다.</p>}
        <form action={doLogin} className="space-y-4">
          <input name="email" type="email" placeholder="이메일" required autoFocus className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="password" type="password" placeholder="비밀번호" required className="w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition">접속하기</button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 보호 레이아웃 — requireRole + signOut**

Replace `app/admin/(protected)/layout.tsx` ENTIRELY:
```tsx
import Link from "next/link";
import { signOut } from "@/auth";
import { requireRole } from "@/lib/auth/guard";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["SUPER_ADMIN"]);
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex gap-5 text-sm font-medium text-gray-700">
          <Link href="/admin" className="hover:text-blue-600">대시보드</Link>
          <Link href="/admin/hospitals" className="hover:text-blue-600">병원관리</Link>
          <Link href="/admin/bookings" className="hover:text-blue-600">예약</Link>
          <Link href="/admin/consultations" className="hover:text-blue-600">상담내역</Link>
        </nav>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/admin/login" }); }}>
          <button className="text-sm text-gray-400 hover:text-gray-700">로그아웃</button>
        </form>
      </header>
      <main className="p-6 max-w-5xl mx-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: 서버액션 가드 교체**

`app/admin/hospital-actions.ts`: import에서 `import { requireAdmin } from "./auth-actions";` 를 `import { requireRole } from "@/lib/auth/guard";` 로 바꾸고, 파일 내 모든 `await requireAdmin();` 를 `await requireRole(["SUPER_ADMIN"]);` 로 교체.
`app/admin/booking-actions.ts`: 동일하게 import + 모든 `await requireAdmin();` → `await requireRole(["SUPER_ADMIN"]);`.

- [ ] **Step 4: 은퇴 파일 삭제**

```bash
rm lib/auth.ts lib/auth.test.ts app/admin/auth-actions.ts
```
Run: `grep -rn "from \"@/lib/auth\"\|from \"./auth-actions\"\|requireAdmin\|ADMIN_COOKIE\|ADMIN_PASSWORD\|ADMIN_SESSION_SECRET" app lib --include=*.ts --include=*.tsx`
Expected: **빈 출력**(모든 참조 제거됨). 남아 있으면 그 파일도 교체.

- [ ] **Step 5: .env.example 갱신**

`.env.example`에서 `ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET` 블록을 아래로 교체:
```
# ── 인증: NextAuth (Phase 5A) ────────────────────────────────────────
AUTH_SECRET=               # NextAuth 세션 서명. 생성: openssl rand -hex 32
SUPER_ADMIN_EMAIL=         # 슈퍼관리자 로그인 이메일
SUPER_ADMIN_PASSWORD=      # 슈퍼관리자 초기 비밀번호 (시드 후 변경 권장)
```

- [ ] **Step 6: 빌드 + 커밋**

Run: `npm run build`
Expected: 성공. `/admin/login`, `/admin/*` 라우트 정상. 중복/오류 없음.
```bash
git add -A app/admin auth.ts lib .env.example
git commit -m "feat(auth): /admin을 NextAuth 계정로그인으로 이전 + HMAC/ADMIN_PASSWORD 은퇴"
```

---

## Task 7: 통합 검증 + 마무리

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 전부 PASS. password(4) + roles(5) 신규, 은퇴된 lib/auth.test.ts(auth 토큰 6개) 제거 반영. 카운트 요약(기존 102 − 6 auth + 9 신규 ≈ 105).

- [ ] **Step 2: 전체 빌드 + 라우트**

Run: `npm run build`
Expected: 성공. `/api/auth/[...nextauth]`, `/admin/login`, `/admin/*` 포함.

- [ ] **Step 3: 인증 스모크(슈퍼관리자 존재·해시 검증)**

Run:
`node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const u=await p.user.findFirst({where:{role:'SUPER_ADMIN'}});if(!u||!u.passwordHash)throw new Error('no super admin');const bcrypt=require('bcryptjs');const ok=await bcrypt.compare(process.env.SUPER_ADMIN_PASSWORD||'changeme-admin-1234',u.passwordHash);console.log('super admin:',u.email,'| pw match:',ok);await p.\$disconnect();process.exit(ok?0:1)})().catch(e=>{console.error(e);process.exit(1)})"`
Expected: `super admin: <email> | pw match: true`.

- [ ] **Step 4: 수동 UAT(사람이 `npm run dev`)**

1. `/admin` 접속 → `/admin/login`으로 리다이렉트(미인증).
2. 슈퍼관리자 이메일+비번 입력 → `/admin` 대시보드.
3. 틀린 비번 → "이메일 또는 비밀번호가 올바르지 않습니다".
4. 병원 CRUD·예약 관리(상태 변경)가 정상(새 가드).
5. 로그아웃 → `/admin` 재접속 시 로그인 요구.
6. 비회귀: 환자 화면(홈/필터/예약)·알림 정상.

- [ ] **Step 5: 커밋(있으면)**

검증 중 수정 없으면 생략.

---

## Self-Review 결과 (작성자 점검)

**1. Spec 커버리지**
- 계정·역할 모델(§2) → T3 ✅
- NextAuth 설정(§3) → T4 ✅ / 비번·역할 순수(§4) → T1·T2 ✅
- 슈퍼관리자 시드(§5) → T5 ✅
- 관리자 이전·은퇴(§6) → T6 ✅
- env 변경(§7) → T4(AUTH_SECRET)·T5(SUPER_ADMIN_*)·T6(.env.example) ✅
- 성공기준 1~6 → T7 검증 ✅

**2. Placeholder 스캔:** 코드 스텝 실제 코드. AUTH_SECRET/SUPER_ADMIN 값은 사용자 환경값(플레이스홀더 명시). ✅

**3. 타입 일관성:** `hashPassword`/`verifyPassword`(password.ts)가 auth.ts authorize·seed에서 사용 일치. `hasRole`(roles.ts)·`requireRole`(guard.ts)·세션 `role`/`hospitalId`(types/next-auth.d.ts) 일치. `auth`/`signIn`/`signOut`/`handlers`(auth.ts) export가 route·login·layout·guard에서 사용 일치. `requireAdmin` 제거 후 모든 호출이 `requireRole`로 교체됨(T6 Step4 grep으로 강제). ✅

> 주의(구현 시): (a) `next-auth@beta`(v5)+Next16 peer 경고 가능 — 빌드 통과 우선. (b) T3 마이그레이션은 빈 User 테이블 전제(`password` DROP 안전). (c) login 서버액션의 `signIn` 성공 시 NEXT_REDIRECT를 재전파해야 함(AuthError만 에러 처리) — 코드에 반영됨.
