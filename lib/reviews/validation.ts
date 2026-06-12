import { scanForbidden } from "@/lib/compliance/forbidden";

export type ReviewInput = { rating: number; content: string };

export function validateReviewInput(input: ReviewInput): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    errors.push("rating: 평점은 1~5점이어야 합니다.");
  }
  const content = input.content.trim();
  if (content.length < 5) errors.push("content: 후기는 5자 이상이어야 합니다.");
  if (content.length > 1000) errors.push("content: 후기는 1000자 이하여야 합니다.");
  const forbidden = scanForbidden(content);
  if (forbidden.length) errors.push(`content: 사용할 수 없는 표현이 포함되어 있습니다(${forbidden.join(", ")}).`);
  return errors;
}
