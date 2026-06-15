import { hasRole } from "@/lib/auth/roles";

export function canReport(role?: string | null): boolean {
  return hasRole(role, ["PATIENT", "HOSPITAL", "SUPER_ADMIN"]);
}

// 에러 코드 반환(messages의 Errors 네임스페이스로 클라이언트에서 번역).
export function validateReportReason(reason: string): string[] {
  const errors: string[] = [];
  if (reason.length > 300) errors.push("REPORT_REASON_TOO_LONG");
  return errors;
}
