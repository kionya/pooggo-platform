import { Calendar, ShieldCheck, Globe, Plane, Languages, HeartHandshake } from "lucide-react";
import HospitalMainSection from "@/components/HospitalMainSection";
import { setRequestLocale, getTranslations } from "next-intl/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import AccountNav from "@/components/AccountNav";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const f = await getTranslations("Footer");

  const cards = [
    { icon: Languages, title: t("translator"), desc: t("translatorDesc") },
    { icon: Plane, title: t("pickup"), desc: t("pickupDesc") },
    { icon: HeartHandshake, title: t("taxRefund"), desc: t("taxRefundDesc") },
    { icon: ShieldCheck, title: t("safety"), desc: t("safetyDesc") },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            <div className="text-2xl font-bold text-blue-900 tracking-tight">PooGGo <span className="text-xs text-blue-500 font-normal">GLOBAL</span></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex"><LocaleSwitcher /></div>
            <AccountNav />
            <a href="#hospitals" className="bg-gray-900 text-white px-5 py-2 rounded-full font-bold text-sm hover:bg-gray-800 transition">{t("bookConsultation")}</a>
          </div>
        </div>
      </header>

      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white -z-10"></div>
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-blue-200 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold mb-8 shadow-sm">
            <Globe className="w-4 h-4" /> {t("heroBadge")}
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">{t("heroTitle")}</h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">{t("heroSubtitle")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#hospitals" className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200">
              <Calendar className="w-5 h-5" /> {t("ctaFind")}
            </a>
            <a href="#process" className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition">
              <ShieldCheck className="w-5 h-5" /> {t("ctaHow")}
            </a>
          </div>
        </div>
      </section>

      <section id="process" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t("conciergeTitle")}</h2>
            <p className="text-gray-500">{t("conciergeSubtitle")}</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {cards.map((item, idx) => (
              <div key={idx} className="bg-gray-50 p-6 rounded-2xl hover:-translate-y-2 transition duration-300 border border-transparent hover:border-blue-100">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6">
                  <item.icon className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold mb-3">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HospitalMainSection />

      <section className="py-16 px-4 bg-gray-900 text-white text-center">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">{t("partnersTitle")}</h2>
          <p className="text-sm text-gray-400">{t("partnersNote")}</p>
        </div>
      </section>

      <footer className="bg-white border-t border-gray-200 py-12 px-4 text-sm text-gray-600">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">PooGGo <Globe className="w-4 h-4 text-blue-500"/></h3>
            <p className="mb-2">{f("address")}</p>
            <p>{f("regNo")}</p>
            <p className="mt-1 text-xs text-gray-400">{f("agencyNotice")}</p>
          </div>
          <div className="md:text-right">
            <p className="font-bold mb-2">{f("customerCenter")}</p>
            <p className="text-lg font-bold text-gray-900 mb-1">{f("phone")}</p>
            <p className="text-xs">{f("hours")}</p>
            <p className="mt-8 text-xs text-gray-400">{f("rights")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
