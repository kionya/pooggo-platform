import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const t = (ko: string, en: string, zh: string, ja: string) => ({ ko, en, zh, ja });

const hours = {
  mon: { open: "10:00", close: "19:00", closed: false },
  tue: { open: "10:00", close: "19:00", closed: false },
  wed: { open: "10:00", close: "19:00", closed: false },
  thu: { open: "10:00", close: "21:00", closed: false },
  fri: { open: "10:00", close: "19:00", closed: false },
  sat: { open: "10:00", close: "16:00", closed: false },
  sun: { open: "", close: "", closed: true },
  note: t("일요일·공휴일 휴무", "Closed on Sundays & holidays", "周日及节假日休息", "日曜・祝日休診"),
};

async function main() {
  await prisma.menu.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.review.deleteMany();
  await prisma.hospital.deleteMany();

  await prisma.hospital.create({
    data: {
      slug: "rejuel-gangnam",
      name: t("리쥬엘의원 강남점", "Rejuel Clinic Gangnam", "丽珠尔医院江南店", "リジュエルクリニック江南店"),
      intro: t("프리미엄 피부 솔루션", "Premium skin solutions", "高端皮肤护理方案", "プレミアムスキンソリューション"),
      about: t("리쥬엘은 피부 안티에이징 전문 의원입니다.", "Rejuel specializes in skin anti-aging.", "丽珠尔专注于皮肤抗衰老。", "リジュエルは肌のアンチエイジング専門院です。"),
      address: t("서울 강남구 강남대로 123", "123 Gangnam-daero, Gangnam-gu, Seoul", "首尔江南区江南大路123", "ソウル江南区江南大路123"),
      cautions: t("시술 후 부기·멍이 생길 수 있습니다. 전문의 상담이 필요합니다.", "Swelling/bruising may occur. Consult a specialist.", "术后可能出现肿胀和淤青，需专业咨询。", "施術後に腫れ・内出血が生じる場合があります。専門医の相談が必要です。"),
      city: "Seoul", district: "Gangnam-gu", category: "DERMA",
      tags: "리프팅,피부관리,보톡스",
      image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80",
      images: [], rating: 4.9, reviews: 152,
      operatingHours: hours,
      messengers: { whatsapp: "+821012345678", line: "@rejuel", wechat: "rejuel_kr", kakao: "http://pf.kakao.com/_rejuel", messenger: "", phone: "+821012345678", email: "info@rejuel.kr" },
      isPublished: true,
      doctors: { create: [
        { name: t("신현진 대표원장", "Dr. Shin Hyunjin", "申贤珍院长", "シン・ヒョンジン院長"), specialty: t("피부과 전문의 / 안티에이징", "Dermatologist / Anti-aging", "皮肤科专家/抗衰老", "皮膚科専門医／アンチエイジング"), order: 0 },
      ] },
      menus: { create: [
        { name: t("슈링크 유니버스 300샷", "Shurink Universe 300 shots", "Shurink Universe 300发", "シュリンクユニバース300ショット"), category: "LIFTING", price: 150000, priceText: t("150,000원", "150,000 KRW", "150,000韩元", "150,000ウォン"), currency: "KRW", order: 0 },
      ] },
    },
  });

  await prisma.hospital.create({
    data: {
      slug: "banobagi",
      name: t("바노바기성형외과", "Banobagi Plastic Surgery", "巴诺巴奇整形外科", "バノバギ整形外科"),
      intro: t("디테일이 다른 아름다움", "Beauty in the details", "细节之美", "ディテールが違う美しさ"),
      about: t("안면윤곽·가슴 성형 중심의 대형 성형외과입니다.", "A large clinic focused on facial contouring and breast surgery.", "专注于面部轮廓和胸部整形的大型整形外科。", "輪郭・豊胸を中心とした大型整形外科です。"),
      address: t("서울 강남구 논현로 808", "808 Nonhyeon-ro, Gangnam-gu, Seoul", "首尔江南区论岘路808", "ソウル江南区論峴路808"),
      cautions: t("전신마취 수술은 위험을 동반합니다. 충분한 상담이 필요합니다.", "General anesthesia carries risks. Sufficient consultation is required.", "全身麻醉手术存在风险，需充分咨询。", "全身麻酔手術にはリスクが伴います。十分な相談が必要です。"),
      city: "Seoul", district: "Gangnam-gu", category: "PLASTIC",
      tags: "안면윤곽,양악수술,가슴성형",
      image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
      images: [], rating: 5.0, reviews: 320,
      operatingHours: hours,
      messengers: { whatsapp: "+821087654321", line: "@banobagi", wechat: "banobagi_cn", kakao: "", messenger: "m.me/banobagi", phone: "+821087654321", email: "global@banobagi.com" },
      isPublished: true,
      doctors: { create: [
        { name: t("반재상 대표원장", "Dr. Ban Jaesang", "潘在尚院长", "バン・ジェサン院長"), specialty: t("성형외과 전문의 / 가슴·바디", "Plastic surgeon / Breast·Body", "整形外科专家/胸部·身体", "形成外科専門医／胸・ボディ"), order: 0 },
      ] },
      menus: { create: [
        { name: t("모티바 가슴성형", "Motiva breast augmentation", "Motiva隆胸", "モティバ豊胸"), category: "BREAST", price: 9000000, priceText: t("900만원~", "9,000,000 KRW~", "900万韩元起", "900万ウォン～"), currency: "KRW", order: 0 },
      ] },
    },
  });

  console.log("🌱 다국어 병원 시드 완료");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
