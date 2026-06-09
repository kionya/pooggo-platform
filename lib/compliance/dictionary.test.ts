import { describe, it, expect } from "vitest";
import { scanForbidden } from "./forbidden";

// 마케팅 카피 네임스페이스만 스캔. Compliance(면책 — '보장하지 않음' 등 부정형 포함)는 제외.
const MARKETING = ["Nav", "Filters", "Tier", "Compare", "Detail", "Hospitals", "Booking", "Home", "Footer"];

function strings(msgs: Record<string, any>): string[] {
  const out: string[] = [];
  for (const ns of MARKETING) {
    const sub = msgs[ns];
    if (!sub) continue;
    for (const v of Object.values(sub)) if (typeof v === "string") out.push(v);
  }
  return out;
}

describe("메시지 사전 금지표현 0건", () => {
  for (const locale of ["ko", "en", "zh", "ja"]) {
    it(`${locale} 마케팅 카피가 깨끗함`, async () => {
      const msgs = (await import(`../../messages/${locale}.json`)).default as Record<string, any>;
      const hits = strings(msgs).flatMap((s) => scanForbidden(s).map((label) => `${label} :: "${s}"`));
      expect(hits).toEqual([]);
    });
  }
});
