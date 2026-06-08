export const TIME_OF_DAY = ["MORNING", "AFTERNOON", "EVENING"] as const;
export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export const MESSENGER_CHANNELS = ["whatsapp", "line", "wechat", "kakao"] as const;

export type BookingInput = {
  hospitalIds: string[];
  locale: string;
  name: string;
  phone: string;
  nationality: string;
  email: string;
  age: number | null;
  gender: string;
  messengerChannel: string;
  messengerHandle: string;
  treatmentInterest: string;
  memo: string;
  preferredDate1: string;
  preferredDate2: string;
  timeOfDay: string;
  consent: boolean;
};
