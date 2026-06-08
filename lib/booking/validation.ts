import { TIME_OF_DAY } from "./types";
import type { BookingInput } from "./types";

export function validateBookingInput(input: BookingInput): string[] {
  const errors: string[] = [];
  if (input.hospitalIds.length < 1) errors.push("hospital: 병원을 1곳 이상 선택해야 합니다.");
  if (input.hospitalIds.length > 3) errors.push("hospital: 병원은 최대 3곳까지 가능합니다.");
  if (!input.name.trim()) errors.push("name: 이름은 필수입니다.");
  if (!input.phone.trim()) errors.push("phone: 연락처는 필수입니다.");
  if (!input.nationality.trim()) errors.push("nationality: 국적은 필수입니다.");
  if (!input.preferredDate1.trim()) errors.push("preferredDate1: 1지망 날짜는 필수입니다.");
  if (!(TIME_OF_DAY as readonly string[]).includes(input.timeOfDay)) errors.push("timeOfDay: 시간대가 올바르지 않습니다.");
  if (!input.consent) errors.push("consent: 개인정보 수집·이용에 동의해야 합니다.");
  if (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.push("email: 이메일 형식이 올바르지 않습니다.");
  return errors;
}
