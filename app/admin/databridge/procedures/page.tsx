import { DollarSign, Users, RefreshCw, Layers } from 'lucide-react'
import KpiCard from '@/components/databridge/KpiCard'
import TrendBadge from '@/components/databridge/TrendBadge'
import ProcedureCategoryChart from '@/components/databridge/ProcedureCategoryChart'
import SyncButton from '@/components/databridge/SyncButton'
import { getProcedureData } from '@/lib/analytics'

function formatRevenue(won: number) {
  if (won >= 100000000) return `${(won / 100000000).toFixed(0)}억${Math.round((won % 100000000) / 10000000) > 0 ? (won % 100000000 / 10000000).toFixed(0) + '천' : ''}만원`
  if (won >= 10000) return `${(won / 10000).toFixed(0)}만원`
  return `${won.toLocaleString()}원`
}

function repeatRateColor(rate: number) {
  if (rate >= 70) return { bar: 'bg-emerald-500', label: '우수', text: 'text-emerald-600' }
  if (rate >= 50) return { bar: 'bg-blue-500', label: '양호', text: 'text-blue-600' }
  return { bar: 'bg-red-400', label: '개선 필요', text: 'text-red-500' }
}

export default async function ProceduresPage() {
  const data = await getProcedureData()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">DB</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">ABC 피부과</p>
            <p className="text-xs text-blue-500">Powered by Databridge</p>
          </div>
        </div>
        <SyncButton />
      </header>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">시술별 성과 분석</h1>
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

        {/* 카테고리 필터 + 도넛 차트 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>전체</option>
              <option>주사 계열</option>
              <option>리프팅 계열</option>
              <option>레이저 계열</option>
              <option>기타</option>
            </select>
          </div>
          <ProcedureCategoryChart data={data.categoryBreakdown} />
        </div>

        {/* 시술 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.procedures.map((proc) => {
            const rateStyle = repeatRateColor(proc.repeatRate)
            return (
              <div
                key={proc.procedureName}
                className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3"
              >
                {/* 헤더 */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-xs">
                      ✦
                    </span>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{proc.procedureName}</p>
                      <p className="text-xs text-gray-400">
                        매출 기준 {proc.rank}위 · {proc.category}
                      </p>
                    </div>
                  </div>
                  <TrendBadge pct={proc.trendPct} />
                </div>

                {/* 매출 */}
                <div>
                  <p className="text-lg font-bold text-gray-900">{formatRevenue(proc.revenue)}</p>
                  <p className="text-xs text-gray-400">
                    전체 매출의{' '}
                    {((proc.revenue / data.totalRevenue) * 100).toFixed(1)}%
                  </p>
                </div>

                {/* 환자수 */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">환자 수</span>
                  <span className="font-semibold text-gray-800">
                    {proc.patientCount}명
                    <span className="text-xs text-gray-400 font-normal ml-1">
                      (평균 시술비 {Math.round(proc.revenue / proc.patientCount / 10000).toLocaleString()}만원)
                    </span>
                  </span>
                </div>

                {/* 재시술률 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-500">재시술률</span>
                    <span className={`text-sm font-bold ${rateStyle.text}`}>
                      {proc.repeatRate}%
                      <span className="text-xs font-normal ml-1">{rateStyle.label}</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`${rateStyle.bar} h-2 rounded-full transition-all`}
                      style={{ width: `${proc.repeatRate}%` }}
                    />
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2 pt-1">
                  <button className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                    👁 리포트 보기
                  </button>
                  <button className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                    📈 시술 추이 보기
                  </button>
                </div>

                {/* AI 추천 */}
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-600">{proc.aiRecommendation}</p>
                </div>
              </div>
            )
          })}
        </div>

        <p className={`text-xs text-center mt-6 ${data.dataSource === 'live' ? 'text-emerald-500' : 'text-gray-300'}`}>
          {data.dataSource === 'live'
            ? '✓ 실DB 데이터 — 병원 메뉴 기반 집계'
            : '* 목 데이터 — 상단 동기화 버튼 클릭 후 실데이터로 전환됩니다'}
        </p>
      </div>
    </div>
  )
}
