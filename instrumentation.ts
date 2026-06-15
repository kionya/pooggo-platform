// Next.js instrumentation — 서버 인스턴스가 부팅될 때 1회 실행된다.
// 필수 환경변수를 부팅 시점에 검증해, 누락 시 NextAuth의 모호한
// "server configuration" 에러 대신 명확한 메시지로 즉시 실패시킨다.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertRequiredEnv } = await import("./lib/env");
    assertRequiredEnv();
  }
}
