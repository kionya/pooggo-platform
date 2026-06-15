import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import HospitalForm from "@/components/admin/HospitalForm";
import { toI18n } from "@/lib/i18n/text";
import type { HospitalInput } from "@/lib/hospital/types";

export default async function EditHospitalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await db.hospital.findUnique({ where: { id }, include: { doctors: { orderBy: { order: "asc" } }, menus: { orderBy: { order: "asc" } } } });
  if (!h) notFound();

  const initial: HospitalInput = {
    slug: h.slug,
    name: toI18n(h.name), intro: toI18n(h.intro), about: toI18n(h.about),
    address: toI18n(h.address), cautions: toI18n(h.cautions),
    city: h.city, district: h.district, category: h.category, tags: h.tags,
    image: h.image, images: h.images,
    operatingHours: h.operatingHours as any,
    messengers: h.messengers as any,
    isPublished: h.isPublished,
    tier: h.tier,
    benefits: toI18n(h.benefits),
    doctors: h.doctors.map((d) => ({ name: toI18n(d.name), specialty: toI18n(d.specialty), image: d.image ?? "", order: d.order })),
    menus: h.menus.map((m) => ({ name: toI18n(m.name), category: m.category, price: m.price, priceText: toI18n(m.priceText), currency: m.currency, order: m.order })),
  };

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-navy-900 mb-6">병원 수정</h1>
      <HospitalForm mode="edit" hospitalId={h.id} initial={initial} />
    </div>
  );
}
