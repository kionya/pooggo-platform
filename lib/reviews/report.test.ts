import { describe, it, expect } from "vitest";
import { canReport, validateReportReason } from "./report";

describe("canReport", () => {
  it("로그인 환자 가능", () => expect(canReport("PATIENT")).toBe(true));
  it("비로그인 불가", () => expect(canReport(undefined)).toBe(false));
});

describe("validateReportReason", () => {
  it("빈 사유 허용", () => expect(validateReportReason("")).toEqual([]));
  it("정상 사유 허용", () => expect(validateReportReason("효과 과장 후기 같습니다")).toEqual([]));
  it("300자 초과 거부", () => expect(validateReportReason("가".repeat(301)).some((e) => e.includes("reason"))).toBe(true));
});
