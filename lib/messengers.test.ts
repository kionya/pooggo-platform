import { describe, it, expect } from "vitest";
import { buildMessengerLinks } from "./messengers";

describe("buildMessengerLinks", () => {
  it("빈 입력은 빈 배열", () => {
    expect(buildMessengerLinks(null)).toEqual([]);
    expect(buildMessengerLinks({})).toEqual([]);
  });
  it("whatsapp 숫자만 추출해 wa.me", () => {
    const r = buildMessengerLinks({ whatsapp: "+82 10-1234-5678" });
    expect(r[0]).toMatchObject({ kind: "link", channel: "whatsapp", url: "https://wa.me/821012345678" });
  });
  it("wechat은 복사 타입", () => {
    const r = buildMessengerLinks({ wechat: "pooggo_kr" });
    expect(r[0]).toMatchObject({ kind: "copy", channel: "wechat", value: "pooggo_kr" });
  });
  it("messenger m.me 접두 제거", () => {
    const r = buildMessengerLinks({ messenger: "https://m.me/pooggo" });
    expect(r[0].url).toBe("https://m.me/pooggo");
  });
  it("phone/email 스킴", () => {
    const r = buildMessengerLinks({ phone: "+8210", email: "a@b.com" });
    expect(r.find((x) => x.channel === "phone")?.url).toBe("tel:+8210");
    expect(r.find((x) => x.channel === "email")?.url).toBe("mailto:a@b.com");
  });
  it("빈 문자열 채널은 제외", () => {
    expect(buildMessengerLinks({ whatsapp: "", line: "  " })).toEqual([]);
  });
  it("line ID는 line.me 링크", () => {
    const r = buildMessengerLinks({ line: "pooggo" });
    expect(r[0]).toMatchObject({ kind: "link", channel: "line", url: "https://line.me/R/ti/p/pooggo" });
  });
  it("kakao URL이면 링크, plain ID면 복사", () => {
    expect(buildMessengerLinks({ kakao: "https://pf.kakao.com/_abc" })[0]).toMatchObject({ kind: "link", channel: "kakao", url: "https://pf.kakao.com/_abc" });
    expect(buildMessengerLinks({ kakao: "pooggo_kr" })[0]).toMatchObject({ kind: "copy", channel: "kakao", value: "pooggo_kr" });
  });
});
