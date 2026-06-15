import { TIME_OF_DAY } from "./types";
import type { BookingInput } from "./types";

// 에러 코드 반환(messages의 Errors 네임스페이스로 클라이언트에서 번역).
export function validateBookingInput(input: BookingInput): string[] {
  const errors: string[] = [];
  if (input.hospitalIds.length < 1) errors.push("BOOKING_HOSPITAL_MIN");
  if (input.hospitalIds.length > 3) errors.push("BOOKING_HOSPITAL_MAX");
  if (!input.name.trim()) errors.push("REQUIRED_NAME");
  if (!input.phone.trim()) errors.push("REQUIRED_PHONE");
  if (!input.nationality.trim()) errors.push("REQUIRED_NATIONALITY");
  if (!input.preferredDate1.trim()) errors.push("REQUIRED_DATE1");
  if (input.preferredDate1.trim() && Number.isNaN(new Date(input.preferredDate1).getTime())) errors.push("INVALID_DATE1");
  if (input.preferredDate2.trim() && Number.isNaN(new Date(input.preferredDate2).getTime())) errors.push("INVALID_DATE2");
  if (!(TIME_OF_DAY as readonly string[]).includes(input.timeOfDay)) errors.push("INVALID_TIMEOFDAY");
  if (!input.consent) errors.push("REQUIRED_CONSENT");
  if (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.push("INVALID_EMAIL");
  return errors;
}
