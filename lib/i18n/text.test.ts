import { describe, it, expect } from "vitest";
import { toI18n, resolveText, isCompleteI18n } from "./text";

describe("toI18n", () => {
  it("정상 객체를 그대로 정규화", () => {
    expect(toI18n({ ko: "가", en: "a", zh: "啊", ja: "あ" })).toEqual({ ko: "가", en: "a", zh: "啊", ja: "あ" });
  });
  it("누락/이상 값은 빈 문자열로", () => {
    expect(toI18n(null)).toEqual({ ko: "", en: "", zh: "", ja: "" });
    expect(toI18n({ ko: "가", en: 123 })).toEqual({ ko: "가", en: "", zh: "", ja: "" });
  });
});

describe("resolveText", () => {
  const v = { ko: "가", en: "a", zh: "", ja: "" };
  it("해당 언어 우선", () => expect(resolveText(v, "ko")).toBe("가"));
  it("없으면 en 폴백", () => expect(resolveText(v, "zh")).toBe("a"));
  it("en도 없으면 ko 폴백", () => expect(resolveText({ ko: "가", en: "", zh: "", ja: "" }, "ja")).toBe("가"));
});

describe("isCompleteI18n", () => {
  it("4개 모두 있으면 true", () => expect(isCompleteI18n({ ko: "가", en: "a", zh: "啊", ja: "あ" })).toBe(true));
  it("하나라도 비면 false", () => expect(isCompleteI18n({ ko: "가", en: "a", zh: "啊", ja: "" })).toBe(false));
  it("공백만 있으면 false", () => expect(isCompleteI18n({ ko: " ", en: "a", zh: "啊", ja: "あ" })).toBe(false));
});
