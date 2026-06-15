import { forwardRef, cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactElement } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ivory";
const variants: Record<Variant, string> = {
  primary: "bg-gold-500 text-navy-900 hover:bg-gold-600",
  secondary: "border border-navy-900/20 bg-cream text-navy-900 hover:bg-stone-100",
  ghost: "text-navy-900 hover:bg-stone-100",
  danger: "bg-clay-600 text-white hover:bg-clay-700",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", asChild = false, className = "", children, ...props },
  ref,
) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, { className: `${cls} ${child.props.className ?? ""}`.trim() });
  }
  return (
    <button ref={ref} className={cls} {...props}>
      {children}
    </button>
  );
});
