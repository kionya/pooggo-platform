import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function PatientLoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error } = await searchParams;
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">{t("loginTitle")}</h1>
        {error && <p className="text-red-500 text-sm mb-4 text-center">{t("loginFailed")}</p>}
        <form action={doLogin} className="space-y-4">
          <input name="email" type="email" placeholder={t("email")} required autoFocus className="w-full border border-gray-300 px-4 py-3 rounded-lg" />
          <input name="password" type="password" placeholder={t("password")} required className="w-full border border-gray-300 px-4 py-3 rounded-lg" />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg">{t("loginSubmit")}</button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4">
          <Link href="/account/signup" className="hover:underline">{t("noAccount")}</Link>
        </p>
      </div>
    </div>
  );
}
