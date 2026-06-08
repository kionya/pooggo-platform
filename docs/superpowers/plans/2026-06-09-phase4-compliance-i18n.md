# RICH DOC Phase 4 — 의료광고법 전수검수 + i18n 전수 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모든 환자화면 플랫폼 카피에서 의료광고법 위반(허위 인증·정부표방·100%·상위1%·보장 단정)을 제거·재작성하고, 부작용·주의사항·면책을 노출하며, 남은 하드코딩 문구를 4언어로 번역한다. 금지표현 자동 스캔으로 회귀를 막는다.

**Architecture:** 위반 카피를 준수 카피로 재작성해 next-intl 메시지(`Home`/`Footer`/`Compliance` 4언어)로 이전. 면책은 재사용 `ComplianceNotice` 컴포넌트로 표준화. 부작용·주의사항(저장됐으나 미노출)을 상세에 노출. 금지표현 스캐너(`lib/compliance/forbidden.ts`)와 사전 테스트로 회귀 방지. 최종 `medical_compliance_checker` 게이트.

**Tech Stack:** Next.js 16 App Router, next-intl, Tailwind 4, vitest.

**참고 설계서:** `docs/superpowers/specs/2026-06-09-richdoc-phase4-compliance-i18n-design.md`

> **순서:** 스캐너(T1) → 메시지+사전테스트(T2) → ComplianceNotice(T3) → 홈 재작성(T4) → 상세 면책·부작용(T5) → 비교 면책(T6) → 게이트·검증(T7). 각 태스크는 `npm run build` 통과로 끝낸다.

---

## File Structure

**신규 (순수 로직 — TDD)**
- `lib/compliance/forbidden.ts` (+ `forbidden.test.ts`) — `scanForbidden(text)`
- `lib/compliance/dictionary.test.ts` — 마케팅 네임스페이스 금지어 0건 강제

**신규 (컴포넌트)**
- `components/ComplianceNotice.tsx`

**수정**
- `messages/{ko,en,zh,ja}.json` — `Home`/`Footer`/`Compliance` 네임스페이스 추가
- `app/[locale]/page.tsx` — 위반 제거 + i18n
- `app/[locale]/hospitals/[id]/page.tsx` — cautions 노출 + 가격/후기 면책
- `app/[locale]/compare/page.tsx` — 최저가 "게시가 기준" + 가격 면책

---

## Task 1: 금지표현 스캐너 (TDD)

**Files:**
- Create: `lib/compliance/forbidden.ts`, Test: `lib/compliance/forbidden.test.ts`

- [ ] **Step 1: 실패하는 테스트**

Create `lib/compliance/forbidden.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { scanForbidden } from "./forbidden";

describe("scanForbidden", () => {
  it("깨끗한 문구는 빈 배열", () => {
    expect(scanForbidden("검증된 한국 병원을 비교하세요")).toEqual([]);
    expect(scanForbidden("Compare verified Korean clinics")).toEqual([]);
  });
  it("100% 감지", () => expect(scanForbidden("대리수술 100% 차단")).toContain("100%"));
  it("상위 1% 감지", () => expect(scanForbidden("상위 1% 병원")).toContain("상위 1%"));
  it("world class 감지(대소문자 무시)", () => expect(scanForbidden("World Class K-Beauty")).toContain("world class"));
  it("government verified 감지", () => expect(scanForbidden("Government Verified Partners")).toContain("government verified"));
  it("official 감지(단어경계)", () => expect(scanForbidden("Official Platform")).toContain("official"));
  it("guarantee 감지", () => expect(scanForbidden("Safety Guarantee")).toContain("guarantee"));
  it("보장 감지", () => expect(scanForbidden("효과를 보장합니다")).toContain("보장"));
  it("완치 감지", () => expect(scanForbidden("완치 가능")).toContain("완치"));
  it("부작용 없음 감지", () => expect(scanForbidden("부작용 없는 시술")).toContain("부작용 없음"));
  it("best 단어경계 — 'best' 감지하나 'bestseller'는 무시", () => {
    expect(scanForbidden("Find Best Clinic")).toContain("best");
    expect(scanForbidden("bestseller list")).not.toContain("best");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- lib/compliance/forbidden.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

Create `lib/compliance/forbidden.ts`:
```ts
const FORBIDDEN: { pattern: RegExp; label: string }[] = [
  { pattern: /100\s*%/, label: "100%" },
  { pattern: /상위\s*1\s*%/, label: "상위 1%" },
  { pattern: /\bworld[-\s]?class\b/i, label: "world class" },
  { pattern: /government\s+verified/i, label: "government verified" },
  { pattern: /\bofficial\b/i, label: "official" },
  { pattern: /\bguarantee/i, label: "guarantee" },
  { pattern: /보장/, label: "보장" },
  { pattern: /완치/, label: "완치" },
  { pattern: /부작용\s*없/, label: "부작용 없음" },
  { pattern: /최고|국내\s*1\s*위|업계\s*1\s*위/, label: "최고/1위" },
  { pattern: /\bbest\b/i, label: "best" },
  { pattern: /no\s+side\s+effect/i, label: "no side effect" },
];

export function scanForbidden(text: string): string[] {
  return FORBIDDEN.filter((f) => f.pattern.test(text)).map((f) => f.label);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- lib/compliance/forbidden.test.ts`
Expected: PASS (11).

- [ ] **Step 5: 커밋**

```bash
git add lib/compliance/forbidden.ts lib/compliance/forbidden.test.ts
git commit -m "feat(compliance): 금지표현 스캐너 scanForbidden(TDD)"
```

---

## Task 2: 준수 메시지(Home/Footer/Compliance) 4언어 + 사전 스캔 테스트

**Files:**
- Modify: `messages/ko.json`, `messages/en.json`, `messages/zh.json`, `messages/ja.json`
- Create: `lib/compliance/dictionary.test.ts`

- [ ] **Step 1: 4개 메시지 파일에 3개 네임스페이스 추가**

각 `messages/*.json`에 최상위 키 `Home`, `Footer`, `Compliance`를 추가(기존 마지막 키 뒤에 콤마 후, 유효 JSON 유지). 아래 내용을 정확히 사용.

`messages/ko.json`:
```json
  "Home": { "heroBadge": "외국인 환자를 위한 K-Beauty·K-Medical 허브", "heroTitle": "한국의 K-Beauty & K-Medical 병원을 한곳에서", "heroSubtitle": "검증된 한국 병원을 비교하고, 통역·픽업·사후관리 안내를 받아보세요.", "ctaFind": "병원 찾기", "ctaHow": "이용 방법", "bookConsultation": "상담 예약", "conciergeTitle": "외국인 환자 지원 안내", "conciergeSubtitle": "입국부터 출국까지 필요한 지원을 안내해 드립니다.", "translator": "1:1 의료 통역", "translatorDesc": "영어·중국어·일본어 등 의료 통역사 동행을 안내합니다.", "pickup": "공항 픽업", "pickupDesc": "공항에서 병원·호텔까지 이동 지원을 안내합니다.", "taxRefund": "세금 환급 안내", "taxRefundDesc": "외국인 환자 세금 환급 절차를 안내합니다.", "safety": "안전 정보", "safetyDesc": "수술 실명제·CCTV 참관 등 병원별 안전 시스템을 안내합니다.", "partnersTitle": "제휴 병원 안내", "partnersNote": "병원 등재는 정보 제공이며, 추천·보증을 의미하지 않습니다." },
  "Footer": { "address": "서울 강남구 (주소 준비 중)", "regNo": "사업자등록번호: 준비 중", "agencyNotice": "외국인환자 유치업자 등록: 준비 중", "customerCenter": "고객센터", "phone": "준비 중", "hours": "평일 09:00–18:00 (KST)", "rights": "© 2026 RICH DOC. All rights reserved." },
  "Compliance": { "priceDisclaimer": "표시 가격은 병원 게시가이며, 실제 비용은 상담 후 결정됩니다.", "reviewDisclaimer": "후기는 개인적 경험이며 시술 효과를 보장하지 않습니다.", "cautionsTitle": "부작용·주의사항", "screeningNotice": "의료광고 사전심의 대상 여부는 게재 전 확인이 필요합니다.", "lowestNote": "게시가 기준" }
```

`messages/en.json`:
```json
  "Home": { "heroBadge": "K-Beauty & K-Medical hub for international patients", "heroTitle": "Korean K-Beauty & K-Medical clinics, all in one place", "heroSubtitle": "Compare verified Korean clinics and get guidance on interpretation, pickup, and aftercare.", "ctaFind": "Find a clinic", "ctaHow": "How it works", "bookConsultation": "Book consultation", "conciergeTitle": "Support for international patients", "conciergeSubtitle": "Guidance for your visit, from arrival to departure.", "translator": "1:1 medical interpreter", "translatorDesc": "Guidance on medical interpreters in English, Chinese, Japanese and more.", "pickup": "Airport pickup", "pickupDesc": "Guidance on transport from the airport to clinic and hotel.", "taxRefund": "Tax refund guidance", "taxRefundDesc": "Guidance on the tax refund process for international patients.", "safety": "Safety information", "safetyDesc": "Guidance on each clinic's safety systems, such as surgeon disclosure and CCTV observation.", "partnersTitle": "Partner clinics", "partnersNote": "Listings are informational and do not imply endorsement." },
  "Footer": { "address": "Seoul, Gangnam-gu (address coming soon)", "regNo": "Business reg. no.: coming soon", "agencyNotice": "Foreign patient attraction agency registration: in preparation", "customerCenter": "Customer center", "phone": "Coming soon", "hours": "Mon–Fri 09:00–18:00 (KST)", "rights": "© 2026 RICH DOC. All rights reserved." },
  "Compliance": { "priceDisclaimer": "Listed prices are the clinic's posted prices; actual cost is determined after consultation.", "reviewDisclaimer": "Reviews are personal experiences and do not represent treatment outcomes.", "cautionsTitle": "Side effects & precautions", "screeningNotice": "Whether medical advertising requires prior review must be confirmed before publication.", "lowestNote": "by posted price" }
```

`messages/zh.json`:
```json
  "Home": { "heroBadge": "面向外籍患者的 K-Beauty·K-Medical 平台", "heroTitle": "韩国 K-Beauty 与 K-Medical 医院，一站汇集", "heroSubtitle": "比较经核实的韩国医院，获取翻译、接送与术后管理的指引。", "ctaFind": "寻找医院", "ctaHow": "使用方法", "bookConsultation": "预约咨询", "conciergeTitle": "外籍患者支持指引", "conciergeSubtitle": "从入境到离境，为您提供所需指引。", "translator": "1:1 医疗翻译", "translatorDesc": "提供英语·中文·日语等医疗翻译同行指引。", "pickup": "机场接送", "pickupDesc": "提供从机场到医院与酒店的交通指引。", "taxRefund": "退税指引", "taxRefundDesc": "为外籍患者提供退税流程指引。", "safety": "安全信息", "safetyDesc": "提供各医院安全制度（如手术实名制·CCTV 观摩）的指引。", "partnersTitle": "合作医院", "partnersNote": "收录仅供参考，不代表推荐。" },
  "Footer": { "address": "首尔江南区（地址筹备中）", "regNo": "营业执照号：筹备中", "agencyNotice": "外籍患者招揽业者登记：筹备中", "customerCenter": "客户中心", "phone": "筹备中", "hours": "周一至周五 09:00–18:00 (KST)", "rights": "© 2026 RICH DOC. 版权所有。" },
  "Compliance": { "priceDisclaimer": "所示价格为医院公示价，实际费用经咨询后确定。", "reviewDisclaimer": "评价为个人体验，不代表治疗效果。", "cautionsTitle": "副作用与注意事项", "screeningNotice": "医疗广告是否需事前审议，须在刊登前确认。", "lowestNote": "按公示价" }
```

`messages/ja.json`:
```json
  "Home": { "heroBadge": "外国人患者のための K-Beauty・K-Medical ハブ", "heroTitle": "韓国の K-Beauty & K-Medical 病院をひとつに", "heroSubtitle": "検証された韓国の病院を比較し、通訳・送迎・アフターケアのご案内を受けられます。", "ctaFind": "病院を探す", "ctaHow": "ご利用方法", "bookConsultation": "相談予約", "conciergeTitle": "外国人患者サポートのご案内", "conciergeSubtitle": "入国から出国まで、必要なサポートをご案内します。", "translator": "1:1 医療通訳", "translatorDesc": "英語・中国語・日本語などの医療通訳同行をご案内します。", "pickup": "空港送迎", "pickupDesc": "空港から病院・ホテルまでの移動をご案内します。", "taxRefund": "税金還付のご案内", "taxRefundDesc": "外国人患者の税金還付手続きをご案内します。", "safety": "安全情報", "safetyDesc": "手術実名制・CCTV 立会いなど、病院ごとの安全システムをご案内します。", "partnersTitle": "提携病院のご案内", "partnersNote": "掲載は情報提供であり、推薦を意味しません。" },
  "Footer": { "address": "ソウル江南区（住所準備中）", "regNo": "事業者登録番号：準備中", "agencyNotice": "外国人患者誘致業者登録：準備中", "customerCenter": "カスタマーセンター", "phone": "準備中", "hours": "平日 09:00–18:00 (KST)", "rights": "© 2026 RICH DOC. All rights reserved." },
  "Compliance": { "priceDisclaimer": "表示価格は病院の掲示価格であり、実際の費用は相談後に決定されます。", "reviewDisclaimer": "口コミは個人の経験であり、施術効果を表すものではありません。", "cautionsTitle": "副作用・注意事項", "screeningNotice": "医療広告の事前審議の要否は掲載前に確認が必要です。", "lowestNote": "掲示価格基準" }
```

검증: `node -e "['ko','en','zh','ja'].forEach(l=>{require('./messages/'+l+'.json');console.log(l,'ok')})"`

- [ ] **Step 2: 사전 스캔 테스트(마케팅 네임스페이스 금지어 0건)**

Create `lib/compliance/dictionary.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { scanForbidden } from "./forbidden";

// 마케팅 카피 네임스페이스만 스캔. Compliance(면책 — '보장하지 않음' 등 부정형 포함)는 제외.
const MARKETING = ["Nav", "Filters", "Tier", "Compare", "Detail", "Hospitals", "Booking", "Home", "Footer"];

function strings(msgs: Record<string, any>): string[] {
  const out: string[] = [];
  for (const ns of MARKETING) {
    const sub = msgs[ns];
    if (!sub) continue;
    for (const v of Object.values(sub)) if (typeof v === "string") out.push(v);
  }
  return out;
}

describe("메시지 사전 금지표현 0건", () => {
  for (const locale of ["ko", "en", "zh", "ja"]) {
    it(`${locale} 마케팅 카피가 깨끗함`, async () => {
      const msgs = (await import(`../../messages/${locale}.json`)).default as Record<string, any>;
      const hits = strings(msgs).flatMap((s) => scanForbidden(s).map((label) => `${label} :: "${s}"`));
      expect(hits).toEqual([]);
    });
  }
});
```

- [ ] **Step 3: 테스트 실행 (통과해야 함)**

Run: `npm test -- lib/compliance/dictionary.test.ts`
Expected: PASS (4) — 모든 언어 마케팅 카피에 금지어 0건. 만약 FAIL이면 출력된 `label :: "문구"`의 해당 메시지를 준수 표현으로 고친다.

- [ ] **Step 4: 전체 테스트 + 커밋**

Run: `npm test` (전체 PASS)
```bash
git add messages lib/compliance/dictionary.test.ts
git commit -m "feat(compliance): 준수 Home/Footer/Compliance 4언어 메시지 + 사전 금지어 0건 테스트"
```

---

## Task 3: ComplianceNotice 컴포넌트

**Files:**
- Create: `components/ComplianceNotice.tsx`

- [ ] **Step 1: 구현**

Create `components/ComplianceNotice.tsx`:
```tsx
import { useTranslations } from "next-intl";

type Key = "priceDisclaimer" | "reviewDisclaimer" | "screeningNotice";

export default function ComplianceNotice({ k, className = "" }: { k: Key; className?: string }) {
  const t = useTranslations("Compliance");
  return <p className={`text-xs text-gray-400 ${className}`}>{t(k)}</p>;
}
```

- [ ] **Step 2: 빌드 + 커밋**

Run: `npm run build` (성공)
```bash
git add components/ComplianceNotice.tsx
git commit -m "feat(compliance): 면책 고지 표준 컴포넌트 ComplianceNotice"
```

---

## Task 4: 홈 페이지 위반 제거 + i18n 재작성

**Files:**
- Modify (replace): `app/[locale]/page.tsx`

- [ ] **Step 1: 홈 전체 교체**

Replace `app/[locale]/page.tsx` ENTIRELY:
```tsx
import { Calendar, ShieldCheck, Globe, Plane, Languages, HeartHandshake } from "lucide-react";
import HospitalMainSection from "@/components/HospitalMainSection";
import { setRequestLocale, getTranslations } from "next-intl/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";

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
            <div className="text-2xl font-bold text-blue-900 tracking-tight">RICH DOC <span className="text-xs text-blue-500 font-normal">GLOBAL</span></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex"><LocaleSwitcher /></div>
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
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">RICH DOC <Globe className="w-4 h-4 text-blue-500"/></h3>
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
```

> 제거된 것: 가짜 인증박스 4종, "Government Verified Partners", "보건복지부 평가기준 준수", "Official Medical Tourism Platform", "World Class/Safe", "상위 1%", "100% 차단", 허위 Reg No·전화. 모든 카피는 i18n.

- [ ] **Step 2: 빌드 + 사전 스캔 재확인 + 커밋**

Run: `npm run build` (성공)
Run: `npm test -- lib/compliance/dictionary.test.ts` (PASS — 홈 카피가 사전에 들어가 있고 금지어 0건)
```bash
git add "app/[locale]/page.tsx"
git commit -m "feat(compliance): 홈 위반 카피 제거 + 준수 카피 i18n 재작성(허위인증·정부표방·100%·상위1% 삭제)"
```

---

## Task 5: 상세 페이지 — 부작용·주의사항 노출 + 가격/후기 면책

**Files:**
- Modify: `app/[locale]/hospitals/[id]/page.tsx`

- [ ] **Step 1: import 추가**

`app/[locale]/hospitals/[id]/page.tsx` 상단에 추가:
```ts
import ComplianceNotice from "@/components/ComplianceNotice";
```
그리고 기존 `const tTier = await getTranslations("Tier");` 아래에 추가:
```ts
const tCompliance = await getTranslations("Compliance");
```

- [ ] **Step 2: 가격표 섹션에 가격 면책**

READ the file. 시술 가격표 블록(`{hospital.menus && hospital.menus.length > 0 && ( ... )}`) 내부, `<ul>...</ul>` 닫은 직후(닫는 `</div>` 직전)에 추가:
```tsx
            <ComplianceNotice k="priceDisclaimer" className="mt-3" />
```

- [ ] **Step 3: 부작용·주의사항 섹션 추가**

가격표 블록의 닫는 `)}` 다음(운영시간/메신저 블록 근처 — `<OperatingHoursTable .../>` 바로 위)에 추가:
```tsx
        {(() => { const c = resolveText(hospital.cautions, locale); return c ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-4">
            <h3 className="font-bold text-lg mb-2 text-amber-900">{tCompliance("cautionsTitle")}</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">{c}</p>
          </div>
        ) : null; })()}
```
(`resolveText`는 이미 import됨. `hospital.cautions`는 `getHospitalById`가 스칼라 Json으로 반환.)

- [ ] **Step 4: 후기 섹션에 후기 면책**

후기(실제 후기/리뷰) 섹션의 제목 `<h3>...후기...</h3>` 바로 아래(리뷰 폼 위)에 추가:
```tsx
          <ComplianceNotice k="reviewDisclaimer" className="mb-3" />
```

- [ ] **Step 5: 빌드 + 커밋**

Run: `npm run build` (성공)
```bash
git add "app/[locale]/hospitals/[id]/page.tsx"
git commit -m "feat(compliance): 상세에 부작용·주의사항 노출 + 가격/후기 면책"
```

---

## Task 6: 비교 페이지 — 최저가 면책 + 가격 면책

**Files:**
- Modify: `app/[locale]/compare/page.tsx`

- [ ] **Step 1: import + 번역 추가**

READ `app/[locale]/compare/page.tsx`. 상단에 추가:
```ts
import ComplianceNotice from "@/components/ComplianceNotice";
```
그리고 `const t = await getTranslations("Compare");` 아래에 추가:
```ts
const tc = await getTranslations("Compliance");
```

- [ ] **Step 2: "최저가" 라벨에 게시가 기준 명시**

현재 최저가 표기:
```tsx
{isLowest ? `(${t("lowest")})` : ""}
```
를 다음으로 변경(게시가 기준 명시):
```tsx
{isLowest ? `(${t("lowest")} · ${tc("lowestNote")})` : ""}
```

- [ ] **Step 3: 표 하단 가격 면책**

표(`</table>`)를 감싸는 `</div>` 다음, "목록으로" 백링크 `<div className="mt-6">` 위에 추가:
```tsx
      <ComplianceNotice k="priceDisclaimer" className="mt-4" />
```

- [ ] **Step 4: 빌드 + 커밋**

Run: `npm run build` (성공)
```bash
git add "app/[locale]/compare/page.tsx"
git commit -m "feat(compliance): 비교 최저가 '게시가 기준' 명시 + 가격 면책"
```

---

## Task 7: 의료광고법 최종 게이트 + 통합 검증

**Files:** (검증 위주)

- [ ] **Step 1: 전체 테스트**

Run: `npm test`
Expected: 전부 PASS. forbidden(11) + dictionary(4) 포함. 카운트 요약.

- [ ] **Step 2: 전체 빌드 + 메시지 키 parity**

Run: `npm run build` (성공)
Run: `node -e "const ns=['Nav','Filters','Tier','Compare','Detail','Hospitals','Booking','Home','Footer','Compliance'];const a=['ko','en','zh','ja'].map(l=>require('./messages/'+l+'.json'));const keys=o=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?Object.keys(v).map(x=>k+'.'+x):[k]).sort();const base=JSON.stringify(keys(a[0]));console.log('parity:',a.every(o=>JSON.stringify(keys(o))===base))"`
Expected: `parity: true`.

- [ ] **Step 3: 의료광고법 게이트 (medical_compliance_checker / ad-review)**

플랫폼 카피 사전(`messages/ko.json`의 Home/Footer/Compliance + 비교/상세 노출 문구)을 `medical_compliance_checker` 또는 `ad-review` 스킬로 최종 검수한다. 위반 발견 시 해당 메시지를 준수 표현으로 수정하고 Step 1~2 재실행. 통과(위반 0 또는 수정 완료) 시 다음.
> 주의: 이 단계는 컨트롤러(또는 스킬 호출 가능한 에이전트)가 수행. 결과를 보고에 요약.

- [ ] **Step 4: 수동 UAT 체크리스트(사람이 `npm run dev`)**

1. 홈 `/ko`,`/en`,`/zh`,`/ja` — 히어로·컨시어지·제휴섹션·푸터가 해당 언어로 렌더, 가짜 인증박스·"Government Verified"·"100%"·"상위 1%" 없음.
2. 상세 — 부작용·주의사항(cautions 있는 병원) 노출, 가격표 아래 가격 면책, 후기 위 후기 면책.
3. 비교 — 최저가 옆 "게시가 기준", 표 아래 가격 면책.
4. 푸터 — "유치업자 등록: 준비 중", 허위 등록번호 없음.
5. 비회귀: 필터·예약·관리자 정상.

- [ ] **Step 5: 커밋(있으면)**

게이트 수정이 있었으면 커밋. 없으면 생략.

---

## Self-Review 결과 (작성자 점검)

**1. Spec 커버리지**
- 위반 제거·재작성(§2) → Task 4(홈)·Task 2(메시지 준수 카피) ✅
- 부작용·주의사항 노출(§3.1) → Task 5 ✅
- 가격/후기/등급 면책(§3.2~3.4) → Task 5(가격·후기)·Task 6(가격)·등급 면책은 Phase 2 `Tier.disclaimer` 존재(노출은 배지 인접 — 본 단계는 면책 카피 확인) ✅
- 유치업자·심의 고지(§3.5) → Task 2(Footer.agencyNotice, Compliance.screeningNotice)·Task 4(푸터 노출) ✅
- i18n 전수(§4) → Task 2·4 ✅
- 게이트(§5) → Task 7 Step 3 ✅
- 금지표현 스캔(§6) → Task 1·2 ✅

**2. Placeholder 스캔:** 코드/카피 스텝 모두 실제 내용. "준비 중"은 의도된 카피(플레이스홀더 아님). ✅

**3. 타입 일관성:** `scanForbidden`(forbidden.ts) 정의=사용 일치. `ComplianceNotice` props `k: "priceDisclaimer"|"reviewDisclaimer"|"screeningNotice"` — Task 5/6에서 priceDisclaimer/reviewDisclaimer 사용(타입 내). `cautionsTitle`/`lowestNote`는 `getTranslations("Compliance")` 직접 호출로 사용(컴포넌트 키 아님 — 일관). 메시지 키가 4언어 동일(parity Task 7). ✅

> 주의(구현 시): Task 5의 cautions 표시 IIFE는 `resolveText(hospital.cautions, locale)`가 빈 문자열이면 섹션을 숨긴다(부작용 미입력 병원). 등급 면책은 별도 노출 추가 없이 기존 `Tier.disclaimer`로 충당하며, 필요 시 후속에서 배지 툴팁로 보강(YAGNI).
