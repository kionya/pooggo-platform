import {
  Phone, Calendar, ShieldCheck, Star, CheckCircle, ArrowRight,
  Globe, Plane, Languages, HeartHandshake, Award
} from "lucide-react";
import HospitalMainSection from "@/components/HospitalMainSection";
import { setRequestLocale } from "next-intl/server";
import LocaleSwitcher from "@/components/LocaleSwitcher";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      
      {/* 1. 글로벌 헤더 (언어 지원 표시 추가) */}
      <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-600" />
            <div className="text-2xl font-bold text-blue-900 tracking-tight">RICH DOC <span className="text-xs text-blue-500 font-normal">GLOBAL</span></div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 언어 선택 */}
            <div className="hidden md:flex"><LocaleSwitcher /></div>
            <a href="#hospitals" className="bg-gray-900 text-white px-5 py-2 rounded-full font-bold text-sm hover:bg-gray-800 transition">
              Book Consultation
            </a>
          </div>
        </div>
      </header>

      {/* 2. 글로벌 히어로 섹션 (신뢰감 주는 카피) */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white -z-10"></div>
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-blue-200 text-blue-700 px-4 py-1.5 rounded-full text-sm font-bold mb-8 shadow-sm animate-fade-in-up">
            <CheckCircle className="w-4 h-4" /> Official Medical Tourism Platform
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight">
            World Class <span className="text-blue-600">K-Beauty</span><br />
            Safe & Professional
          </h1>
          
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            대한민국 상위 1% 병원들의 공식 파트너.<br className="md:hidden"/> 
            외국인 환자를 위한 <span className="text-gray-900 font-bold">전담 통역, 공항 픽업, 사후 관리</span>까지<br/>
            RICH DOC이 책임지고 케어합니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#hospitals" className="flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200">
              <Calendar className="w-5 h-5" /> Find Best Clinic
            </a>
            <a href="#process" className="flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition">
              <ShieldCheck className="w-5 h-5" /> How it Works
            </a>
          </div>
        </div>
      </section>

      {/* 3. 🔥 [신규] 글로벌 안심 케어 시스템 (외국인 전용 혜택) */}
      <section id="process" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">All-in-One Concierge Service</h2>
            <p className="text-gray-500">입국부터 출국까지, 외국인 환자만을 위한 특별한 케어를 경험하세요.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Languages, title: "1:1 Medical Translator", desc: "영어, 중어, 일어 등 전문 의료 통역사가 상담부터 수술까지 동행합니다." },
              { icon: Plane, title: "Airport Pick-up", desc: "공항 도착 순간부터 병원, 호텔 이동까지 전용 리무진 서비스를 제공합니다." },
              { icon: HeartHandshake, title: "Tax Refund Support", desc: "번거로운 세금 환급 절차, 병원에서 즉시 처리해 드립니다." },
              { icon: ShieldCheck, title: "Safety Guarantee", desc: "수술 실명제 및 CCTV 참관 시스템으로 대리 수술을 100% 차단합니다." },
            ].map((item, idx) => (
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

      {/* 4. 병원 리스트 & 장바구니 섹션 (기존 기능 유지) */}
      <HospitalMainSection />

      {/* 5. 🔥 [신규] 신뢰도 인증 섹션 (Certifications) */}
      <section className="py-16 px-4 bg-gray-900 text-white text-center">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-10 flex items-center justify-center gap-2">
            <Award className="text-yellow-400" /> Government Verified Partners
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
             {/* 로고 대신 텍스트 박스로 대체 (실제로는 로고 이미지 배치) */}
             <div className="border border-white/20 p-4 rounded-lg flex items-center justify-center font-bold text-lg">K-Medical</div>
             <div className="border border-white/20 p-4 rounded-lg flex items-center justify-center font-bold text-lg">ISO 9001</div>
             <div className="border border-white/20 p-4 rounded-lg flex items-center justify-center font-bold text-lg">Global Healthcare</div>
             <div className="border border-white/20 p-4 rounded-lg flex items-center justify-center font-bold text-lg">Safe Clinic</div>
          </div>
          <p className="mt-8 text-sm text-gray-400">
            RICH DOC은 대한민국 보건복지부의 외국인 환자 유치 의료기관 평가 기준을 준수합니다.
          </p>
        </div>
      </section>

      {/* 6. 푸터 */}
      <footer className="bg-white border-t border-gray-200 py-12 px-4 text-sm text-gray-600">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
              RICH DOC <Globe className="w-4 h-4 text-blue-500"/>
            </h3>
            <p className="mb-2">Seoul, Gangnam-gu, Teheran-ro 123</p>
            <p>Registration No: 123-45-67890</p>
            <div className="mt-4 flex gap-3">
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">LINE</span>
              <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">KAKAO</span>
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">WhatsApp</span>
            </div>
          </div>
          <div className="md:text-right">
            <p className="font-bold mb-2">Customer Center</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">+82 10-1234-5678</p>
            <p className="text-xs">Mon-Fri 09:00 - 18:00 (KST)</p>
            <p className="mt-8 text-xs text-gray-400">© 2026 RICH DOC Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}