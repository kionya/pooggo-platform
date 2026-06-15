import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isVerifyTokenExpired } from "@/lib/auth/verification";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ token?: string }> };

export default async function VerifyPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token } = await searchParams;
  const t = await getTranslations("Account");

  const user = token ? await db.user.findFirst({ where: { emailVerifyToken: token } }) : null;

  if (user && !isVerifyTokenExpired(user.emailVerifyExpires, Date.now())) {
    await db.user.update({ where: { id: user.id }, data: { status: "ACTIVE", emailVerifyToken: null, emailVerifyExpires: null } });
    redirect(`/${locale}/account/login?verified=1`);
  }

  // 실패(없음/만료)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <p className="text-red-500 text-sm mb-4">{t("verifyExpired")}</p>
        <Link href="/account/signup" className="text-blue-600 text-sm hover:underline">{t("signupTitle")}</Link>
      </div>
    </div>
  );
}
