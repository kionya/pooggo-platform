import { Ticket } from "lucide-react";

export function StampCard({ balance, goal }: { balance: number; goal: number }) {
  const filled = Math.max(0, Math.min(balance, goal));
  return (
    <div className="grid grid-cols-5 gap-3">
      {Array.from({ length: goal }).map((_, i) => {
        const on = i < filled;
        return (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-xl border ${
              on
                ? "border-gold-500 bg-gold-500/15 text-gold-600"
                : "border-dashed border-stone-300 bg-cream text-stone-300"
            }`}
          >
            {on ? <Ticket className="h-6 w-6" /> : <span className="text-sm font-bold">{i + 1}</span>}
          </div>
        );
      })}
    </div>
  );
}
