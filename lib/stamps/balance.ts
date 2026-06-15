import { STAMP_GOAL } from "./config";

export function computeBalance(events: { delta: number }[]): number {
  return events.reduce((sum, e) => sum + e.delta, 0);
}

export function progress(balance: number, goal: number = STAMP_GOAL) {
  const count = Math.max(0, Math.min(balance, goal));
  return {
    count,
    goal,
    remaining: Math.max(0, goal - count),
    complete: balance >= goal,
  };
}
