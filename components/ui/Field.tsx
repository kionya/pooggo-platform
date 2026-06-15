import { type ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  error,
  required,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-navy-900">
        {label} {required ? <span className="text-clay-600">*</span> : null}
      </label>
      {children}
      {hint ? <p className="text-xs text-stone-500">{hint}</p> : null}
      {error ? <p className="text-xs text-clay-700">{error}</p> : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-cream px-3 py-2.5 text-navy-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-600/40";
