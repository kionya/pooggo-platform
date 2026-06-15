import { setRequestLocale, getTranslations } from "next-intl/server";
import { resendVerification } from "@/app/[locale]/account/verify-actions";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ email?: string; resent?: string }> };

export default async function VerifySentPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { email, resent } = await searchParams;
  const t = await getTranslations("Account");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-3">{t("verifySentTitle")}</h1>
        <p className="text-gray-500 text-sm mb-2">{t("verifySentBody")}</p>
        {email && <p className="text-gray-700 text-sm font-medium mb-4">{email}</p>}
        {resent && <p className="text-green-600 text-sm mb-4">{t("resendDone")}</p>}
        <form action={resendVerification} className="mt-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="email" value={email ?? ""} />
          <button className="text-sm text-blue-600 hover:underline">{t("resend")}</button>
        </form>
      </div>
    </div>
  );
}
