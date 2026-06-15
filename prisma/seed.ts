import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

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
      tags: { ko: "리프팅,피부관리,보톡스", en: "Lifting,Skin Care,Botox", zh: "提升,皮肤管理,肉毒素", ja: "リフティング,スキンケア,ボトックス" },
      image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80",
      images: [], rating: 4.9, reviews: 152,
      operatingHours: hours,
      messengers: { whatsapp: "+821012345678", line: "@rejuel", wechat: "rejuel_kr", kakao: "http://pf.kakao.com/_rejuel", messenger: "", phone: "+821012345678", email: "info@rejuel.kr" },
      isPublished: true,
      tier: "BENEFIT", benefits: t("외국인 환자 전용 통역·픽업 지원", "Free interpreter & pickup for international patients", "外籍患者专享翻译及接送", "外国人患者向け通訳・送迎サポート"),
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
      tags: { ko: "안면윤곽,양악수술,가슴성형", en: "Facial Contouring,Two-jaw Surgery,Breast Augmentation", zh: "面部轮廓,正颌手术,丰胸", ja: "輪郭,両顎手術,豊胸" },
      image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
      images: [], rating: 5.0, reviews: 320,
      operatingHours: hours,
      messengers: { whatsapp: "+821087654321", line: "@banobagi", wechat: "banobagi_cn", kakao: "", messenger: "m.me/banobagi", phone: "+821087654321", email: "global@banobagi.com" },
      isPublished: true,
      tier: "BENEFIT", benefits: t("술후 관리 패키지 제공", "Post-op care package included", "提供术后护理套餐", "術後ケアパッケージ提供"),
      doctors: { create: [
        { name: t("반재상 대표원장", "Dr. Ban Jaesang", "潘在尚院长", "バン・ジェサン院長"), specialty: t("성형외과 전문의 / 가슴·바디", "Plastic surgeon / Breast·Body", "整形外科专家/胸部·身体", "形成外科専門医／胸・ボディ"), order: 0 },
      ] },
      menus: { create: [
        { name: t("모티바 가슴성형", "Motiva breast augmentation", "Motiva隆胸", "モティバ豊胸"), category: "BREAST", price: 9000000, priceText: t("900만원~", "9,000,000 KRW~", "900万韩元起", "900万ウォン～"), currency: "KRW", order: 0 },
      ] },
    },
  });

  await prisma.hospital.create({
    data: {
      slug: "goeunmom",
      name: t("고운몸의원", "Goeunmom Clinic", "高云蒙医院", "コウンモムクリニック"),
      intro: t("건강하고 아름다운 바디라인", "Healthy, beautiful body lines", "健康而美丽的身体曲线", "健康で美しいボディライン"),
      about: t("고운몸의원은 비만·체형 관리 전문 의원입니다.", "Goeunmom Clinic specializes in obesity and body-contouring care.", "高云蒙医院专注于肥胖与体型管理。", "コウンモムクリニックは肥満・体型管理の専門院です。"),
      address: t("서울 강남구 테헤란로 152", "152 Teheran-ro, Gangnam-gu, Seoul", "首尔江南区德黑兰路152", "ソウル江南区テヘラン路152"),
      cautions: t("시술 후 부기·멍이 생길 수 있습니다. 전문의 상담이 필요합니다.", "Swelling/bruising may occur after the procedure. Consult a specialist.", "术后可能出现肿胀和淤青，需专业咨询。", "施術後に腫れ・内出血が生じる場合があります。専門医の相談が必要です。"),
      city: "Seoul", district: "Gangnam-gu", category: "ETC",
      tags: { ko: "다이어트,체형교정,지방분해", en: "Diet,Body Contouring,Fat Reduction", zh: "减肥,体型矫正,溶脂", ja: "ダイエット,体型矯正,脂肪分解" },
      image: "https://images.unsplash.com/photo-1571772996211-2f02c9727629?auto=format&fit=crop&w=800&q=80",
      images: [], rating: 4.8, reviews: 98,
      operatingHours: hours,
      messengers: { whatsapp: "+821033334444", line: "@goeunmom", wechat: "goeunmom_kr", kakao: "", messenger: "", phone: "+821033334444", email: "info@goeunmom.kr" },
      isPublished: true,
      tier: "RECOMMENDED", benefits: t("", "", "", ""),
      doctors: { create: [
        { name: t("김희경 대표원장", "Dr. Kim Heekyung", "金喜京院长", "キム・ヒギョン院長"), specialty: t("가정의학과 전문의 / 비만클리닉", "Family medicine specialist / Obesity clinic", "家庭医学专家/肥胖门诊", "家庭医学科専門医／肥満クリニック"), order: 0 },
      ] },
      menus: { create: [
        { name: t("MPPL 지방분해 주사 (1세트)", "MPPL fat-dissolving injection (1 set)", "MPPL溶脂针（1组）", "MPPL脂肪分解注射（1セット）"), category: "BODY", price: 99000, priceText: t("9.9만원", "99,000 KRW", "9.9万韩元", "9.9万ウォン"), currency: "KRW", order: 0 },
        { name: t("삭센다 처방 (1펜)", "Saxenda prescription (1 pen)", "诺和盈处方（1支）", "サクセンダ処方（1ペン）"), category: "DIET", price: 120000, priceText: t("12만원", "120,000 KRW", "12万韩元", "12万ウォン"), currency: "KRW", order: 1 },
      ] },
    },
  });

  await prisma.hospital.create({
    data: {
      slug: "vibe",
      name: t("바이브성형외과", "Vibe Plastic Surgery", "Vibe整形外科", "バイブ整形外科"),
      intro: t("나만의 분위기를 찾다", "Find your own vibe", "找到属于你的气质", "あなただけの雰囲気を見つける"),
      about: t("바이브성형외과는 눈·코 성형 중심의 트렌디한 의원입니다.", "Vibe is a trendy clinic focused on eye and nose surgery.", "Vibe是专注于眼鼻整形的时尚诊所。", "バイブは目・鼻整形を中心としたトレンディなクリニックです。"),
      address: t("서울 강남구 도산대로 415", "415 Dosan-daero, Gangnam-gu, Seoul", "首尔江南区岛山大路415", "ソウル江南区島山大路415"),
      cautions: t("시술 후 부기·멍이 생길 수 있습니다. 전문의 상담이 필요합니다.", "Swelling/bruising may occur after the procedure. Consult a specialist.", "术后可能出현肿胀和淤青，需专业咨询。", "施術後に腫れ・内出血が生じる場合があります。専門医の相談が必要です。"),
      city: "Seoul", district: "Gangnam-gu", category: "PLASTIC",
      tags: { ko: "눈성형,코성형,트렌디", en: "Eye Surgery,Rhinoplasty,Trendy", zh: "眼部整形,鼻部整形,时尚", ja: "目の整形,鼻整形,トレンディ" },
      image: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=800&q=80",
      images: [], rating: 4.7, reviews: 85,
      operatingHours: hours,
      messengers: { whatsapp: "+821055556666", line: "@vibe", wechat: "vibe_kr", kakao: "", messenger: "m.me/vibeps", phone: "+821055556666", email: "global@vibe.kr" },
      isPublished: true,
      tier: "RECOMMENDED", benefits: t("", "", "", ""),
      doctors: { create: [
        { name: t("유영문 대표원장", "Dr. Yoo Youngmoon", "刘永文院长", "ユ・ヨンムン院長"), specialty: t("성형외과 전문의 / 눈·코 성형", "Plastic surgeon / Eye·Nose", "整形外科专家/眼·鼻整形", "形成外科専門医／目・鼻整形"), order: 0 },
      ] },
      menus: { create: [
        { name: t("자연유착 쌍꺼풀", "Natural-adhesion double eyelid", "自然粘连双眼皮", "自然癒着二重まぶた"), category: "EYE", price: 990000, priceText: t("99만원", "990,000 KRW", "99万韩元", "99万ウォン"), currency: "KRW", order: 0 },
        { name: t("직반버선 코성형", "Rhinoplasty", "隆鼻手术", "鼻整形"), category: "RHINOPLASTY", price: 2500000, priceText: t("250만원~", "2,500,000 KRW~", "250万韩元起", "250万ウォン～"), currency: "KRW", order: 1 },
      ] },
    },
  });

  await prisma.hospital.create({
    data: {
      slug: "ps345",
      name: t("삼사오성형외과", "345 Plastic Surgery", "345整形外科", "サムサオ整形外科"),
      intro: t("365일 4계절 5감 만족", "Satisfaction all year round", "全年四季五感满足", "365日4季5感の満足"),
      about: t("삼사오성형외과는 안전을 지향하는 종합 성형외과입니다.", "345 is a safety-oriented full-service plastic surgery clinic.", "345是注重安全的综合整形外科。", "サムサオは安全を志向する総合整形外科です。"),
      address: t("서울 서초구 강남대로 305", "305 Gangnam-daero, Seocho-gu, Seoul", "首尔瑞草区江南大路305", "ソウル瑞草区江南大路305"),
      cautions: t("전신마취 수술은 위험을 동반합니다. 충분한 상담이 필요합니다.", "General anesthesia carries risks. Sufficient consultation is required.", "全身麻醉手术存在风险，需充分咨询。", "全身麻酔手術にはリスクが伴います。十分な相談が必要です。"),
      city: "Seoul", district: "Seocho-gu", category: "PLASTIC",
      tags: { ko: "안전지향,대형병원,종합성형", en: "Safety-first,Large Hospital,Full Plastic Surgery", zh: "注重安全,大型医院,综合整形", ja: "安全志向,大型病院,総合整形" },
      image: "https://images.unsplash.com/photo-1516549655169-df83a0674503?auto=format&fit=crop&w=800&q=80",
      images: [], rating: 4.9, reviews: 210,
      operatingHours: hours,
      messengers: { whatsapp: "+821077778888", line: "@345ps", wechat: "ps345_kr", kakao: "", messenger: "", phone: "+821077778888", email: "info@345ps.kr" },
      isPublished: true,
      tier: "PARTNER", benefits: t("", "", "", ""),
      doctors: { create: [
        { name: t("박종림 대표원장", "Dr. Park Jonglim", "朴钟林院长", "パク・ジョンリム院長"), specialty: t("성형외과 전문의 / 거상·안티에이징", "Plastic surgeon / Lifting·Anti-aging", "整形外科专家/提升·抗衰老", "形成外科専門医／リフト・アンチエイジング"), order: 0 },
        { name: t("한규남 원장", "Dr. Han Gyunam", "韩奎南院长", "ハン・ギュナム院長"), specialty: t("성형외과 전문의 / 눈·코 재수술", "Plastic surgeon / Eye·Nose revision", "整形外科专家/眼·鼻修复", "形成外科専門医／目・鼻再手術"), order: 1 },
      ] },
      menus: { create: [
        { name: t("345 딥플레인 안면거상", "345 Deep-plane facelift", "345深层面部提升", "345ディーププレーンフェイスリフト"), category: "LIFTING", price: 8000000, priceText: t("800만원~", "8,000,000 KRW~", "800万韩元起", "800万ウォン～"), currency: "KRW", order: 0 },
        { name: t("하안검 수술", "Lower blepharoplasty", "下眼睑手术", "下眼瞼手術"), category: "EYE", price: 1500000, priceText: t("150만원", "1,500,000 KRW", "150万韩元", "150万ウォン"), currency: "KRW", order: 1 },
      ] },
    },
  });

  const adminEmail = process.env.SUPER_ADMIN_EMAIL;
  const adminPw = process.env.SUPER_ADMIN_PASSWORD;
  if (adminEmail && adminPw) {
    await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      update: { role: "SUPER_ADMIN", status: "ACTIVE", passwordHash: await hashPassword(adminPw) },
      create: { email: adminEmail.toLowerCase(), role: "SUPER_ADMIN", status: "ACTIVE", passwordHash: await hashPassword(adminPw) },
    });
    console.log("👑 슈퍼관리자 계정 준비:", adminEmail.toLowerCase());
  } else {
    console.warn("⚠️ SUPER_ADMIN_EMAIL/PASSWORD 미설정 — 슈퍼관리자 시드 스킵");
  }

  console.log("🌱 다국어 병원 시드 완료");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
