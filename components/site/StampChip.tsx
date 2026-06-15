import { Link } from "@/i18n/navigation";
import { Ticket } from "lucide-react";

// balance가 null/undefined(비로그인 또는 미주입)면 렌더하지 않는다.
export function StampChip({ balance, goal = 10 }: { balance?: number | null; goal?: number }) {
  if (balance === null || balance === undefined) return null;
  return (
    <Link
      href="/account/stamps"
      className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 text-sm font-bold text-gold-600 hover:bg-gold-500/20"
    >
      <Ticket className="h-4 w-4" />
      {Math.min(balance, goal)}/{goal}
    </Link>
  );
}
