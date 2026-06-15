import { db } from "@/lib/db";
import { requireHospital } from "@/lib/auth/guard";
import HospitalForm from "@/components/admin/HospitalForm";
import { toI18n } from "@/lib/i18n/text";
import type { HospitalInput } from "@/lib/hospital/types";

export default async function HospitalProfilePage() {
  const session = await requireHospital();
  const hospitalId = session.user.hospitalId as string;
  const h = await db.hospital.findUnique({ where: { id: hospitalId }, include: { doctors: { orderBy: { order: "asc" } }, menus: { orderBy: { order: "asc" } } } });
  if (!h) return <p className="text-stone-400">병원 정보를 찾을 수 없습니다.</p>;

  const initial: HospitalInput = {
    slug: h.slug,
    name: toI18n(h.name), intro: toI18n(h.intro), about: toI18n(h.about), address: toI18n(h.address), cautions: toI18n(h.cautions),
    city: h.city, district: h.district, category: h.category, tags: h.tags, image: h.image, images: h.images,
    operatingHours: h.operatingHours as any, messengers: h.messengers as any,
    isPublished: h.isPublished, tier: h.tier, benefits: toI18n(h.benefits),
    doctors: h.doctors.map((d) => ({ name: toI18n(d.name), specialty: toI18n(d.specialty), image: d.image ?? "", order: d.order })),
    menus: h.menus.map((m) => ({ name: toI18n(m.name), category: m.category, price: m.price, priceText: toI18n(m.priceText), currency: m.currency, order: m.order })),
  };

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-navy-900 mb-6">병원 정보 수정</h1>
      <p className="text-sm text-stone-500 mb-4">시술 가격·등급·공개 여부는 플랫폼 관리 항목이라 여기서 수정되지 않습니다.</p>
      <HospitalForm mode="edit" hospitalId={h.id} initial={initial} scope="hospital" />
    </div>
  );
}
