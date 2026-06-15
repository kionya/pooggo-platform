import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; verified?: string }>;
};

export default async function PatientLoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error, verified } = await searchParams;
  const t = await getTranslations("Account");

  async function doLogin(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: `/${locale}/account`,
      });
    } catch (e) {
      if (e instanceof AuthError) redirect(`/${locale}/account/login?error=1`);
      throw e;
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory p-4">
      <div className="bg-cream p-8 rounded-2xl border border-stone-200 shadow-[var(--shadow-card)] w-full max-w-sm">
        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-6 text-center">{t("loginTitle")}</h1>
        {verified && <p className="text-teal-600 text-sm mb-4 text-center">{t("verifiedBanner")}</p>}
        {error && (
          <div className="bg-clay-600/10 border border-clay-600/30 text-clay-700 p-3 rounded-lg text-sm mb-4 text-center">
            {t("loginFailed")}
          </div>
        )}
        <form action={doLogin} className="space-y-4">
          <input name="email" type="email" placeholder={t("email")} required autoFocus
            className={inputClass} />
          <input name="password" type="password" placeholder={t("password")} required
            className={inputClass} />
          <Button type="submit" variant="primary" className="w-full">{t("loginSubmit")}</Button>
        </form>
        <p className="text-center text-sm text-stone-400 mt-4">
          <Link href="/account/signup" className="hover:underline hover:text-navy-900">{t("noAccount")}</Link>
        </p>
      </div>
    </div>
  );
}
