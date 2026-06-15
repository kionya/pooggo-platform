import { Calendar, ShieldCheck, Languages, MessageCircle, Scale } from "lucide-react";
import HospitalMainSection from "@/components/HospitalMainSection";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Card } from "@/components/ui/Card";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Home");

  const cards = [
    { icon: Languages, title: t("translator"), desc: t("translatorDesc") },
    { icon: MessageCircle, title: t("messengerConsult"), desc: t("messengerConsultDesc") },
    { icon: Scale, title: t("compareQuote"), desc: t("compareQuoteDesc") },
    { icon: ShieldCheck, title: t("safety"), desc: t("safetyDesc") },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden pb-24 pt-20">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-cream to-ivory" />
        <Container className="max-w-4xl text-center">
          <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/10 px-4 py-1.5 text-sm font-bold text-gold-600">
            <ShieldCheck className="h-4 w-4" /> {t("heroBadge")}
          </span>
          <h1 className="font-serif text-4xl font-bold leading-tight text-navy-900 md:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mb-10 mt-6 max-w-2xl text-lg leading-relaxed text-stone-600">
            {t("heroSubtitle")}
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/hospitals">
                <Calendar className="h-5 w-5" /> {t("ctaFind")}
              </Link>
            </Button>
          </div>
        </Container>
      </section>

      {/* Concierge process */}
      <section id="process" className="py-20">
        <Container>
          <SectionHeading title={t("conciergeTitle")} subtitle={t("conciergeSubtitle")} />
          <div className="mt-14 grid gap-6 md:grid-cols-4">
            {cards.map((item, idx) => (
              <Card key={idx} className="p-6 transition-transform duration-300 hover:-translate-y-1">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-teal-600/10">
                  <item.icon className="h-7 w-7 text-teal-700" />
                </div>
                <h3 className="mb-3 text-lg font-bold text-navy-900">{item.title}</h3>
                <p className="text-sm leading-relaxed text-stone-600">{item.desc}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <Container className="max-w-4xl">
          <SectionHeading eyebrow={t("stampEyebrow")} title={t("stampTitle")} subtitle={t("stampSubtitle")} />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <Card key={n} className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/15 font-serif text-lg font-bold text-gold-600">
                  {n}
                </div>
                <p className="text-sm leading-relaxed text-stone-600">{t(`stampStep${n}` as "stampStep1")}</p>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-stone-400">{t("stampForeignNotice")}</p>
        </Container>
      </section>

      <HospitalMainSection />

      {/* Partners */}
      <section className="bg-navy-900 py-16 text-center text-cream">
        <Container className="max-w-5xl">
          <h2 className="font-serif text-2xl font-bold">{t("partnersTitle")}</h2>
          <p className="mt-4 text-sm text-stone-300">{t("partnersNote")}</p>
        </Container>
      </section>
    </>
  );
}
