import { EMPTY_I18N } from "@/lib/i18n/types";
import type { HospitalInput, OperatingHours, Messengers } from "./types";

// 순수 데이터 팩토리 — 서버/클라이언트 양쪽에서 import 가능해야 한다.
// (이전엔 "use client"인 HospitalForm.tsx에 있어, 서버 컴포넌트가 호출하면
//  "Attempted to call ... from the server but ... is on the client" 런타임 에러가 났다.)

export function emptyHours(): OperatingHours {
  const d = () => ({ open: "10:00", close: "19:00", closed: false });
  return { mon: d(), tue: d(), wed: d(), thu: d(), fri: d(), sat: d(), sun: { open: "", close: "", closed: true }, note: { ...EMPTY_I18N } };
}

export function emptyMessengers(): Messengers {
  return { whatsapp: "", line: "", wechat: "", kakao: "", messenger: "", phone: "", email: "" };
}

export function emptyHospitalInput(): HospitalInput {
  return {
    slug: "", name: { ...EMPTY_I18N }, intro: { ...EMPTY_I18N }, about: { ...EMPTY_I18N },
    address: { ...EMPTY_I18N }, cautions: { ...EMPTY_I18N },
    city: "Seoul", district: "", category: "PLASTIC", tags: { ...EMPTY_I18N },
    image: "", images: [], operatingHours: emptyHours(), messengers: emptyMessengers(),
    isPublished: false,
    tier: "RECOMMENDED", benefits: { ...EMPTY_I18N },
    doctors: [], menus: [],
  };
}
