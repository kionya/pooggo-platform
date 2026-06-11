import type { HospitalInput } from "./types";
import { isCompleteI18n } from "@/lib/i18n/text";

export type HospitalEditable = Pick<
  HospitalInput,
  "name" | "intro" | "about" | "address" | "cautions" | "city" | "district" | "category" | "tags" | "image" | "images" | "operatingHours" | "messengers" | "doctors"
>;

// 병원이 수정 가능한 필드만 추출. slug/menus/tier/benefits/isPublished/rating/reviews 제외(플랫폼 전용).
export function pickHospitalEditableFields(input: HospitalInput): HospitalEditable {
  return {
    name: input.name, intro: input.intro, about: input.about, address: input.address, cautions: input.cautions,
    city: input.city, district: input.district, category: input.category, tags: input.tags,
    image: input.image, images: input.images, operatingHours: input.operatingHours, messengers: input.messengers,
    doctors: input.doctors,
  };
}

// 편집 가능 필드만 검증. menus/tier/benefits는 검증하지 않음(슈퍼관리자 전용).
export function validateHospitalProfile(input: HospitalInput): string[] {
  const errors: string[] = [];
  const i18nFields: [string, unknown][] = [
    ["name", input.name], ["intro", input.intro], ["about", input.about], ["address", input.address], ["cautions", input.cautions],
  ];
  for (const [key, val] of i18nFields) {
    if (!isCompleteI18n(val)) errors.push(`${key}: 4개 언어 모두 입력해야 합니다.`);
  }
  if (!input.city.trim()) errors.push("city는 필수입니다.");
  if (!input.district.trim()) errors.push("district는 필수입니다.");
  input.doctors.forEach((d, i) => {
    if (!isCompleteI18n(d.name)) errors.push(`의료진 ${i + 1}: 이름 4언어 필수`);
    if (!isCompleteI18n(d.specialty)) errors.push(`의료진 ${i + 1}: 전문분야 4언어 필수`);
  });
  return errors;
}
