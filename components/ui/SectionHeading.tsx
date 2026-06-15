export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  as?: "h1" | "h2" | "h3" | "h4";
}) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`max-w-2xl ${alignClass}`}>
      {eyebrow ? (
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-gold-600 mb-3">
          {eyebrow}
        </span>
      ) : null}
      <Tag className="font-serif text-3xl md:text-4xl font-bold text-navy-900 leading-tight">{title}</Tag>
      {subtitle ? <p className="mt-4 text-stone-600 leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}
