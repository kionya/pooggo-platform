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
    subject: `[RICH DOC] Booking received — ${b.code}`,
    html: `<h2>Your booking request was received</h2><p>This is a request; the clinic will confirm the schedule.</p>${body}`,
  };
}

export function adminMessage(b: BookingLike, hospitalName: string): string {
  return [`🆕 New booking`, ...lines(b, hospitalName)].join("\n");
}

export function hospitalEmail(b: BookingLike, hospitalName: string): { subject: string; html: string } {
  const body = lines(b, hospitalName).map((l) => `<p>${esc(l)}</p>`).join("");
  return {
    subject: `[RICH DOC] New patient booking — ${hospitalName}`,
    html: `<h2>New booking request</h2>${body}`,
  };
}
