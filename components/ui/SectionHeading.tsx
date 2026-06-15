export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  const a = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`max-w-2xl ${a}`}>
      {eyebrow ? (
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-gold-600 mb-3">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="font-serif text-3xl md:text-4xl font-bold text-navy-900 leading-tight">{title}</h2>
      {subtitle ? <p className="mt-4 text-stone-600 leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}
