import type { I18nText } from "@/lib/i18n/types";

export type DayHours = { open: string; close: string; closed: boolean };
export type OperatingHours = {
  mon: DayHours; tue: DayHours; wed: DayHours; thu: DayHours;
  fri: DayHours; sat: DayHours; sun: DayHours;
  note: I18nText;
};

export type Messengers = {
  whatsapp: string; line: string; wechat: string; kakao: string;
  messenger: string; phone: string; email: string;
};

export type DoctorInput = { name: I18nText; specialty: I18nText; image: string; order: number };
export type MenuInput = {
  name: I18nText; category: string;
  price: number | null; priceText: I18nText; currency: string; order: number;
};

export type HospitalInput = {
  slug: string;
  name: I18nText; intro: I18nText; about: I18nText; address: I18nText;
  cautions: I18nText;
  city: string; district: string; category: string; tags: I18nText; // 언어별 콤마구분 태그 (Prisma Json 컬럼)
  image: string; images: string[];
  operatingHours: OperatingHours;
  messengers: Messengers;
  isPublished: boolean;
  tier: string;
  benefits: I18nText;
  doctors: DoctorInput[];
  menus: MenuInput[];
};
