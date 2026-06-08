export const BOOKING_STATUSES = ["NEW", "CONFIRMED", "VISITED", "DONE", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const NEXT: Record<string, string[]> = {
  NEW: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["VISITED", "CANCELLED"],
  VISITED: ["DONE", "CANCELLED"],
  DONE: [],
  CANCELLED: [],
};

export function canTransition(from: string, to: string): boolean {
  return (NEXT[from] ?? []).includes(to);
}
