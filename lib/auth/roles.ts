export const ROLES = ["SUPER_ADMIN", "HOSPITAL", "PATIENT"] as const;
export type Role = (typeof ROLES)[number];

export function hasRole(role: string | undefined | null, allowed: string[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}
