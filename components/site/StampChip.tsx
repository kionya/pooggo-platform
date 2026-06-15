import { Link } from "@/i18n/navigation";
import { Ticket } from "lucide-react";
import { STAMP_GOAL } from "@/lib/stamps/config";

// balance가 null/undefined(비로그인 또는 미주입)면 렌더하지 않는다.
export function StampChip({ balance, goal = STAMP_GOAL }: { balance?: number | null; goal?: number }) {
  if (balance === null || balance === undefined) return null;
  return (
    <Link
      href="/account/stamps"
      aria-label={`스탬프 ${Math.min(balance, goal)}/${goal}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 text-sm font-bold text-gold-600 hover:bg-gold-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory"
    >
      <Ticket className="h-4 w-4" aria-hidden="true" />
      {Math.min(balance, goal)}/{goal}
    </Link>
  );
}
