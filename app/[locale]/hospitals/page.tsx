"use client";

import { useState, useEffect } from "react";
import { Star, MapPin, Check, Plus, ArrowRight, X } from "lucide-react";
import { getHospitals, createConsultation } from "@/app/actions";
import { Link } from "@/i18n/navigation";

interface Hospital {
  id: string;
  name: string;
  location: string;
  tags: string;
  rating: number;
  reviews: number;
  image: string;
  desc: string;
}

export default function HospitalListPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await getHospitals();
    // @ts-ignore
    setHospitals(data);
    setIsLoading(false);
  };

  const toggleCompare = (id: string) => {
    if (compareList.includes(id)) {
      setCompareList(compareList.filter((item) => item !== id));
    } else {
      if (compareList.length >= 3) {
        alert("비교는 최대 3개까지만 가능합니다!");
        return;
      }
      setCompareList([...compareList, id]);
    }
  };
  
  const selectedHospitalNames = hospitals
    .filter(h => compareList.includes(h.id))
    .map(h => h.name)
    .join(", ");

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-blue-900">RICH DOC</Link>
          <span className="text-sm text-gray-500">제휴 병원 목록</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">🏥 실시간 제휴 병원</h1>
          
        </div>
        
        {isLoading ? (
          <p className="text-center py-20 text-gray-500">데이터를 불러오는 중입니다...</p>
        ) : hospitals.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
             <p className="text-gray-500 mb-2">등록된 병원이 없습니다.</p>
           </div>
        ) : (
          <div className="grid gap-6">
            {hospitals.map((hospital) => {
              const isSelected = compareList.includes(hospital.id);
              // 안전장치: 태그 분리
              const tagsArray = (hospital.tags || "").split(',');

              return (
                <div key={hospital.id} className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100 hover:border-blue-300'}`}>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href={`/hospitals/${hospital.id}`} className="block sm:w-32 h-32 flex-shrink-0">
                       <img src={hospital.image || ""} alt={hospital.name} className="w-full h-full object-cover rounded-xl bg-gray-200" />
                    </Link>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <Link href={`/hospitals/${hospital.id}`}>
                            <h2 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition">{hospital.name}</h2>
                          </Link>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <MapPin className="w-4 h-4 mr-1" /> {hospital.location}
                          </div>
                        </div>
                        <div className="flex items-center text-yellow-500 font-bold">
                          <Star className="w-4 h-4 fill-current mr-1" />
                          {hospital.rating}
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mt-2 line-clamp-1">{hospital.desc}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {tagsArray.map((tag: string, idx: number) => (
                          <span key={idx} className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                     <Link 
                       href={`/hospitals/${hospital.id}`}
                       className="px-4 py-3 text-sm text-gray-600 font-medium hover:bg-gray-50 rounded-lg border border-gray-200"
                     >
                       상세보기
                     </Link>
                     <button 
                      onClick={() => toggleCompare(hospital.id)}
                      className={`flex items-center px-4 py-3 text-sm font-bold rounded-lg transition-colors ${
                        isSelected ? "bg-blue-100 text-blue-700 hover:bg-blue-200" : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                     >
                       {isSelected ? <><Check className="w-4 h-4 mr-1"/> 담기 완료</> : <><Plus className="w-4 h-4 mr-1"/> 비교함 담기</>}
                     </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 비교함 (장바구니) */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t shadow-2xl p-4 z-40 animate-slide-up">
           <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
                {compareList.length}
              </div>
              <div className="hidden sm:block">
                <p className="font-bold text-gray-900">선택한 병원</p>
                <p className="text-xs text-gray-500">견적 비교하기</p>
              </div>
            </div>
            <div className="flex gap-2">
               <button onClick={() => setCompareList([])} className="px-4 py-3 text-gray-500 text-sm font-medium hover:text-gray-700">
                 초기화
               </button>
               <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-800 flex items-center shadow-lg"
               >
                 견적 요청 <ArrowRight className="w-4 h-4 ml-2" />
               </button>
            </div>
          </div>
        </div>
      )}
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            <h3 className="text-xl font-bold mb-2">비교 견적 요청서</h3>
            <form action={createConsultation} className="space-y-4 mt-4">
              <input type="hidden" name="content" value={`[리스트페이지] 선택병원: ${selectedHospitalNames}`} />
              <div><input name="customerName" placeholder="이름" className="w-full border p-3 rounded-lg" /></div>
              <div><input name="phone" placeholder="연락처" required className="w-full border p-3 rounded-lg" /></div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl">요청하기</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}