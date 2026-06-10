import { describe, it, expect } from "vitest";
import { ROLES, hasRole } from "./roles";

describe("roles", () => {
  it("ROLES 3종", () => expect([...ROLES]).toEqual(["SUPER_ADMIN", "HOSPITAL", "PATIENT"]));
  it("허용 역할 true", () => expect(hasRole("SUPER_ADMIN", ["SUPER_ADMIN"])).toBe(true));
  it("비허용 역할 false", () => expect(hasRole("HOSPITAL", ["SUPER_ADMIN"])).toBe(false));
  it("undefined/빈 역할 false", () => {
    expect(hasRole(undefined, ["SUPER_ADMIN"])).toBe(false);
    expect(hasRole("", ["SUPER_ADMIN"])).toBe(false);
  });
  it("여러 허용 중 하나 매칭 true", () => expect(hasRole("HOSPITAL", ["SUPER_ADMIN", "HOSPITAL"])).toBe(true));
});
