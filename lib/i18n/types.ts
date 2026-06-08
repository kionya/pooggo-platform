export const LANGS = ["ko", "en", "zh", "ja"] as const;
export type Lang = (typeof LANGS)[number];
export type I18nText = Record<Lang, string>;

export const EMPTY_I18N: I18nText = { ko: "", en: "", zh: "", ja: "" };
