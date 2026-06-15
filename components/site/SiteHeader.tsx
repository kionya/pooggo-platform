import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import AccountNav from "@/components/AccountNav";
import { Logo } from "@/components/ui/Logo";
import { StampChip } from "./StampChip";

export async function SiteHeader({ stampBalance }: { stampBalance?: number | null }) {
  const t = await getTranslations("Home");
  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 bg-ivory/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="PooGGo home">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex">
            <LocaleSwitcher />
          </div>
          <StampChip balance={stampBalance} />
          <AccountNav />
          <Link
            href="/booking"
            className="rounded-full bg-navy-900 px-5 py-2 text-sm font-bold text-cream transition-colors hover:bg-navy-700"
          >
            {t("bookConsultation")}
          </Link>
        </div>
      </div>
    </header>
  );
}
