import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { auth } from "@/auth";
import { getBalance } from "@/lib/stamps";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await auth();
  let stampBalance: number | null = null;
  if (session?.user?.role === "PATIENT" && session.user.id) {
    stampBalance = await getBalance(session.user.id);
  }

  return (
    <NextIntlClientProvider>
      <div className="flex min-h-screen flex-col bg-ivory">
        <SiteHeader stampBalance={stampBalance} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </NextIntlClientProvider>
  );
}
