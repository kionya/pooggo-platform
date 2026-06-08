import { describe, it, expect } from "vitest";
import { patientEmail, adminMessage, hospitalEmail } from "./templates";

const booking = {
  code: "RDB-ABC123", name: "John Doe", phone: "+8210", nationality: "US",
  preferredDate1: "2026-07-01", preferredDate2: "", timeOfDay: "MORNING",
  treatmentInterest: "Rhinoplasty", memo: "first time",
  messengerChannel: "whatsapp", messengerHandle: "+8210", email: "j@x.com",
} as any;
const hospitalName = "Rejuel Clinic";

describe("patientEmail", () => {
  const r = patientEmail(booking, hospitalName);
  it("제목·본문에 코드 포함", () => {
    expect(r.subject).toContain("RDB-ABC123");
    expect(r.html).toContain("RDB-ABC123");
  });
  it("병원명·희망일 포함", () => {
    expect(r.html).toContain("Rejuel Clinic");
    expect(r.html).toContain("2026-07-01");
  });
  it("HTML 특수문자 이스케이프(주입 방지)", () => {
    const evil = { ...booking, name: "<script>alert(1)</script>" } as any;
    const out = patientEmail(evil, hospitalName);
    expect(out.html).not.toContain("<script>");
    expect(out.html).toContain("&lt;script&gt;");
  });
});

describe("adminMessage", () => {
  it("환자·병원·코드 핵심정보 포함", () => {
    const t = adminMessage(booking, hospitalName);
    expect(t).toContain("John Doe");
    expect(t).toContain("Rejuel Clinic");
    expect(t).toContain("RDB-ABC123");
  });
});

describe("hospitalEmail", () => {
  it("제목에 병원명, 본문에 환자·일시", () => {
    const r = hospitalEmail(booking, hospitalName);
    expect(r.subject).toContain("Rejuel Clinic");
    expect(r.html).toContain("John Doe");
    expect(r.html).toContain("MORNING");
  });
});
