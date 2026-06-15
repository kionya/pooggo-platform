import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/ui/Logo";

export async function SiteFooter() {
  const f = await getTranslations("Footer");
  return (
    <footer className="border-t border-stone-200 bg-cream px-4 py-12 text-sm text-stone-600 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-8 md:flex-row">
        <div>
          <Logo />
          <p className="mb-2 mt-4">{f("address")}</p>
          <p>{f("regNo")}</p>
          <p className="mt-1 text-xs text-stone-400">{f("agencyNotice")}</p>
        </div>
        <div className="md:text-right">
          <p className="mb-2 font-bold text-navy-900">{f("customerCenter")}</p>
          <p className="mb-1 text-lg font-bold text-navy-900">{f("phone")}</p>
          <p className="text-xs">{f("hours")}</p>
          <p className="mt-8 text-xs text-stone-400">{f("rights")}</p>
        </div>
      </div>
    </footer>
  );
}
