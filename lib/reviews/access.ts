import { hasRole } from "@/lib/auth/roles";

const LOGGED_IN_ROLES = ["PATIENT", "HOSPITAL", "SUPER_ADMIN"];

export function canViewReviews(role?: string | null): boolean {
  return hasRole(role, LOGGED_IN_ROLES);
}

export function canWriteReview(role?: string | null): boolean {
  return hasRole(role, LOGGED_IN_ROLES);
}
