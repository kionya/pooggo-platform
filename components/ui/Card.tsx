import { type HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-cream border border-stone-200 rounded-2xl shadow-[var(--shadow-card)] ${className}`}
      {...props}
    />
  );
}
