import { describe, it, expect } from "vitest";
import { canViewReviews, canWriteReview } from "./access";

describe("canViewReviews", () => {
  it("환자는 후기 열람 가능", () => expect(canViewReviews("PATIENT")).toBe(true));
  it("병원도 열람 가능", () => expect(canViewReviews("HOSPITAL")).toBe(true));
  it("슈퍼관리자도 열람 가능", () => expect(canViewReviews("SUPER_ADMIN")).toBe(true));
  it("비로그인(undefined)은 불가", () => expect(canViewReviews(undefined)).toBe(false));
  it("알 수 없는 역할은 불가", () => expect(canViewReviews("GUEST")).toBe(false));
});

describe("canWriteReview", () => {
  it("환자는 작성 가능", () => expect(canWriteReview("PATIENT")).toBe(true));
  it("비로그인은 불가", () => expect(canWriteReview(null)).toBe(false));
});
