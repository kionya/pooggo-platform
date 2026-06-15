/**
 * 일회성 관리자 비밀번호 재설정 — 지정한 유저의 passwordHash만 갱신한다.
 * prisma/seed.ts(병원·후기 deleteMany)를 돌리지 않고 안전하게 "비번만" 교체.
 *
 * 사용법 (비밀번호는 인자/환경변수로 전달 — 코드/깃에 하드코딩 금지):
 *   RESET_ADMIN_EMAIL=admin@x.com RESET_ADMIN_PASSWORD='새비번12자이상' npx tsx scripts/reset-admin-password.ts
 *   npx tsx scripts/reset-admin-password.ts admin@x.com '새비번12자이상'
 *
 * 주의: 로컬 .env 가 운영 Neon DB를 가리키므로(공용 DB), 이 스크립트는
 * 운영 DB의 해당 계정 비밀번호를 즉시 변경한다. 변경 후 재배포는 필요 없다(비번은 DB에 저장).
 */
import { readFileSync } from "node:fs";

/** 의존성 없이 .env 를 process.env 로 로드(기존 셸 값은 덮어쓰지 않음). */
function loadDotEnv(path = ".env"): void {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (key in process.env) continue; // 셸로 넘긴 값 우선
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

async function main(): Promise<void> {
  loadDotEnv();

  const email = (process.env.RESET_ADMIN_EMAIL ?? process.argv[2] ?? "").trim().toLowerCase();
  const newPassword = process.env.RESET_ADMIN_PASSWORD ?? process.argv[3] ?? "";

  if (!email || !newPassword) {
    console.error(
      "Usage:\n" +
        "  RESET_ADMIN_EMAIL=<email> RESET_ADMIN_PASSWORD=<password> npx tsx scripts/reset-admin-password.ts\n" +
        "  npx tsx scripts/reset-admin-password.ts <email> <password>",
    );
    process.exit(1);
  }
  if (newPassword.length < 12) {
    console.error("❌ 비밀번호는 12자 이상으로 설정하세요.");
    process.exit(1);
  }

  // DB 접근은 입력 검증 통과 후에만(잘못된 호출 시 연결하지 않도록 동적 import)
  const { db } = await import("../lib/db");
  const { hashPassword } = await import("../lib/auth/password");

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`❌ 해당 이메일의 사용자가 없습니다: ${email}`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(newPassword);
  await db.user.update({ where: { email }, data: { passwordHash } });
  console.log(`✅ 비밀번호 갱신 완료: ${email} (role=${user.role}). 기존 비밀번호는 더 이상 동작하지 않습니다.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
