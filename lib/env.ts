// 필수 환경변수 검증 — 부재 시 부팅 시점에 명확히 실패시켜
// "There was a problem with the server configuration" 같은 런타임 미스터리 에러를 방지한다.

export const REQUIRED_ENV = [
  "AUTH_SECRET", // NextAuth 세션 서명 (없으면 프로덕션에서 Configuration 에러)
  "POSTGRES_PRISMA_URL", // Prisma 풀링 연결
  "POSTGRES_URL_NON_POOLING", // Prisma 직통 연결(directUrl)
] as const;

export type RequiredEnvKey = (typeof REQUIRED_ENV)[number];

/** 부재(undefined)하거나 공백뿐인 값을 누락으로 간주해 누락 키 목록을 반환한다. */
export function findMissingEnv(
  env: Record<string, string | undefined>,
  keys: readonly string[] = REQUIRED_ENV,
): string[] {
  return keys.filter((k) => {
    const v = env[k];
    return v === undefined || v.trim() === "";
  });
}

/** 누락 env가 하나라도 있으면 누락 키를 모두 나열한 명확한 에러를 던진다. */
export function assertRequiredEnv(
  env: Record<string, string | undefined> = process.env,
  keys: readonly string[] = REQUIRED_ENV,
): void {
  const missing = findMissingEnv(env, keys);
  if (missing.length > 0) {
    throw new Error(
      `[env] Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Set them in the deployment environment (e.g. Vercel → Settings → Environment Variables) and redeploy.`,
    );
  }
}
