import { hasRole } from "@/lib/auth/roles";

export function canReport(role?: string | null): boolean {
  return hasRole(role, ["PATIENT", "HOSPITAL", "SUPER_ADMIN"]);
}

export function validateReportReason(reason: string): string[] {
  const errors: string[] = [];
  if (reason.length > 300) errors.push("reason: 신고 사유는 300자 이하여야 합니다.");
  return errors;
}
