import { type HTMLAttributes } from "react";

type Tone = "gold" | "teal" | "stone" | "clay" | "navy";

const tones: Record<Tone, string> = {
  gold: "bg-gold-500/15 text-gold-600 border-gold-500/30",
  teal: "bg-teal-600/10 text-teal-700 border-teal-600/30",
  stone: "bg-stone-100 text-stone-600 border-stone-200",
  clay: "bg-clay-600/10 text-clay-700 border-clay-600/30",
  navy: "bg-navy-900/10 text-navy-900 border-navy-900/20",
};

export function Badge({
  tone = "stone",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
