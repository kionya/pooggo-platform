import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function AccountNav() {
  const session = await auth();
  const t = await getTranslations("Account");
  if (session?.user) {
    return (
      <Link href="/account" className="text-sm font-medium text-gray-700 hover:text-blue-600">
        {t("myAccount")}
      </Link>
    );
  }
  return (
    <Link href="/account/login" className="text-sm font-medium text-gray-700 hover:text-blue-600">
      {t("login")}
    </Link>
  );
}
