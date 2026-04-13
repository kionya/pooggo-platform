export const dynamic = 'force-dynamic'

import { DollarSign, Users, RefreshCw, Layers } from 'lucide-react'
import KpiCard from '@/components/databridge/KpiCard'
import SyncButton from '@/components/databridge/SyncButton'
import ProceduresClient from '@/components/databridge/ProceduresClient'
import RichdocHeader from '@/components/databridge/RichdocHeader'
import { getProcedureData } from '@/lib/analytics'

function formatRevenue(won: number) {
  if (won >= 100000000) return `${(won / 100000000).toFixed(1)}억원`
  if (won >= 10000) return `${(won / 10000).toFixed(0)}만원`
  return `${won.toLocaleString()}원`
}

interface PageProps {
  searchParams: Promise<{ hospitalId?: string }>
}

export default async function ProceduresPage({ searchParams }: PageProps) {
  const params = await searchParams
  const data = await getProcedureData(params.hospitalId)

  return (
    <div className="min-h-screen bg-gray-50">
      <RichdocHeader selectedHospitalId={params.hospitalId} rightSlot={<SyncButton />} />

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* 페이지 타이틀 + 데이터 소스 배지 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">시술별 성과 분석</h1>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              data.dataSource === 'live'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-gray-100 text-gray-400 border border-gray-200'
            }`}
          >
            {data.dataSource === 'live' ? '● 실DB 데이터' : '○ 목 데이터'}
          </span>
        </div>

        {/* 요약 KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="총 시술 매출"
            value={formatRevenue(data.totalRevenue)}
            color="blue"
            icon={<DollarSign size={16} />}
          />
          <KpiCard
            label="총 시술 환자"
            value={`${data.totalPatients.toLocaleString()}명`}
            color="green"
            icon={<Users size={16} />}
          />
          <KpiCard
            label="평균 재시술률"
            value={`${data.avgRepeatRate}%`}
            color="purple"
            icon={<RefreshCw size={16} />}
          />
          <KpiCard
            label="시술 종류"
            value={`${data.procedureTypeCount}개`}
            color="orange"
            icon={<Layers size={16} />}
          />
        </div>

        {/* 카테고리 필터 + 카드 그리드 (클라이언트) */}
        <ProceduresClient data={data} />

        {data.dataSource === 'mock' && (
          <p className="text-xs text-gray-400 text-center mt-6">
            상단 <strong>실데이터 동기화</strong> 버튼을 클릭하면 병원 메뉴 기반 실DB 데이터로 전환됩니다
          </p>
        )}
      </div>
    </div>
  )
}
