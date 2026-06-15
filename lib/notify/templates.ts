export type BookingLike = {
  code: string; name: string; phone: string; nationality: string;
  preferredDate1: string; preferredDate2?: string; timeOfDay: string;
  treatmentInterest?: string; memo?: string;
  messengerChannel?: string; messengerHandle?: string; email?: string;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function lines(b: BookingLike, hospitalName: string): string[] {
  return [
    `Tracking code: ${b.code}`,
    `Hospital: ${hospitalName}`,
    `Patient: ${b.name} (${b.nationality})`,
    `Contact: ${b.phone}${b.messengerChannel ? ` / ${b.messengerChannel}: ${b.messengerHandle ?? ""}` : ""}`,
    `Preferred: ${b.preferredDate1}${b.preferredDate2 ? ` or ${b.preferredDate2}` : ""} (${b.timeOfDay})`,
    `Interest: ${b.treatmentInterest ?? "-"}`,
    `Memo: ${b.memo ?? "-"}`,
  ];
}

export function patientEmail(b: BookingLike, hospitalName: string): { subject: string; html: string } {
  const body = lines(b, hospitalName).map((l) => `<p>${esc(l)}</p>`).join("");
  return {
    subject: `[PooGGo] Booking received — ${b.code}`,
    html: `<h2>Your booking request was received</h2><p>This is a request; the clinic will confirm the schedule.</p>${body}`,
  };
}

export function adminMessage(b: BookingLike, hospitalName: string): string {
  return [`🆕 New booking`, ...lines(b, hospitalName)].join("\n");
}

export function hospitalEmail(b: BookingLike, hospitalName: string): { subject: string; html: string } {
  const body = lines(b, hospitalName).map((l) => `<p>${esc(l)}</p>`).join("");
  return {
    subject: `[PooGGo] New patient booking — ${hospitalName}`,
    html: `<h2>New booking request</h2>${body}`,
  };
}

const VERIFY_I18N: Record<string, { subject: string; heading: string; body: string; cta: string }> = {
  ko: { subject: "[PooGGo] 이메일 인증", heading: "이메일 인증을 완료해주세요", body: "아래 버튼을 눌러 가입을 완료하세요. 링크는 24시간 후 만료됩니다.", cta: "이메일 인증하기" },
  en: { subject: "[PooGGo] Verify your email", heading: "Verify your email", body: "Click the button below to complete signup. This link expires in 24 hours.", cta: "Verify email" },
  zh: { subject: "[PooGGo] 邮箱验证", heading: "请完成邮箱验证", body: "请点击下方按钮完成注册。链接将在24小时后失效。", cta: "验证邮箱" },
  ja: { subject: "[PooGGo] メール認証", heading: "メール認証を完了してください", body: "下のボタンを押して登録を完了してください。リンクは24時間後に失効します。", cta: "メールを認証する" },
};

export function verificationEmail(link: string, locale: string): { subject: string; html: string } {
  const t = VERIFY_I18N[locale] ?? VERIFY_I18N.ko;
  const safe = esc(link);
  return {
    subject: t.subject,
    html: `<h2>${esc(t.heading)}</h2><p>${esc(t.body)}</p><p><a href="${safe}">${esc(t.cta)}</a></p><p style="color:#888;font-size:12px">${safe}</p>`,
  };
}
