import { scanForbidden } from "@/lib/compliance/forbidden";

export type ReviewInput = { rating: number; content: string };

// 에러 코드 반환(messages의 Errors 네임스페이스로 클라이언트에서 번역).
export function validateReviewInput(input: ReviewInput): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    errors.push("REVIEW_RATING_RANGE");
  }
  const content = input.content.trim();
  if (content.length < 5) errors.push("REVIEW_TOO_SHORT");
  if (content.length > 1000) errors.push("REVIEW_TOO_LONG");
  if (scanForbidden(content).length) errors.push("REVIEW_FORBIDDEN");
  return errors;
}
