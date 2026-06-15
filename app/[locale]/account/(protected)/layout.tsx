import { signOut } from "@/auth";
import { requirePatient } from "@/lib/auth/guard";
import { Link } from "@/i18n/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export default async function AccountLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePatient();
  const t = await getTranslations("Account");

  async function logout() {
    "use server";
    await signOut({ redirectTo: `/${locale}/account/login` });
  }

  return (
    <div className="min-h-screen bg-ivory">
      <header className="bg-cream border-b border-stone-200 px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <nav className="flex gap-5 text-sm font-medium text-stone-600">
          <Link href="/account" className="hover:text-teal-600 transition-colors">{t("myAccount")}</Link>
        </nav>
        <form action={logout}>
          <button className="text-sm border border-navy-900/20 bg-cream text-navy-900 hover:bg-stone-100 px-4 py-1.5 rounded-lg font-semibold transition-colors">{t("logout")}</button>
        </form>
      </header>
      <main className="p-6 max-w-3xl mx-auto">{children}</main>
    </div>
  );
}
