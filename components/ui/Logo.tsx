export function Logo({ variant = "default" }: { variant?: "default" | "inverse" }) {
  const wordmark = variant === "inverse" ? "text-cream" : "text-navy-900";
  const dot = variant === "inverse" ? "text-gold-500" : "text-gold-600";
  return (
    <span className={`font-serif text-2xl font-bold tracking-tight ${wordmark}`}>
      PooGGo<span className={dot}>.</span>
    </span>
  );
}
