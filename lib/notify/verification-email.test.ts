import { describe, it, expect } from "vitest";
import { verificationEmail } from "./templates";

describe("verificationEmail", () => {
  const link = "https://pooggo.example/ko/account/verify?token=abc123";
  it("제목에 브랜드, 본문에 링크 포함", () => {
    const r = verificationEmail(link, "ko");
    expect(r.subject).toContain("PooGGo");
    expect(r.html).toContain(link);
  });
  it("로케일별 제목 다름", () => {
    expect(verificationEmail(link, "en").subject).not.toBe(verificationEmail(link, "ja").subject);
  });
  it("알 수 없는 로케일은 ko 폴백", () => {
    expect(verificationEmail(link, "xx").subject).toBe(verificationEmail(link, "ko").subject);
  });
  it("HTML 이스케이프(주입 방지)", () => {
    const r = verificationEmail("https://x/verify?token=<script>", "ko");
    expect(r.html).not.toContain("<script>");
  });
});
