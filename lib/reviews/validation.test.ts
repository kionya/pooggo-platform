import { describe, it, expect } from "vitest";
import { validateReviewInput } from "./validation";

function valid() {
  return { rating: 5, content: "친절하게 상담해주셔서 만족스러웠습니다." };
}

describe("validateReviewInput", () => {
  it("정상 입력은 에러 없음", () => expect(validateReviewInput(valid())).toEqual([]));
  it("평점 범위 밖(0)", () => {
    const v = valid(); v.rating = 0;
    expect(validateReviewInput(v)).toContain("REVIEW_RATING_RANGE");
  });
  it("평점 범위 밖(6)", () => {
    const v = valid(); v.rating = 6;
    expect(validateReviewInput(v)).toContain("REVIEW_RATING_RANGE");
  });
  it("내용 너무 짧음", () => {
    const v = valid(); v.content = "굿";
    expect(validateReviewInput(v)).toContain("REVIEW_TOO_SHORT");
  });
  it("금지어(보장) 포함 시 거부", () => {
    const v = valid(); v.content = "효과를 100% 보장합니다 정말 좋아요";
    expect(validateReviewInput(v)).toContain("REVIEW_FORBIDDEN");
  });
});
