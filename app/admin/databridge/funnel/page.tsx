import { DollarSign, ShoppingCart, TrendingUp, Target, CheckCircle, PlusCircle } from 'lucide-react'
import KpiCard from '@/components/databridge/KpiCard'
import FunnelBarChart from '@/components/databridge/FunnelBarChart'
import { getFunnelData } from '@/lib/analytics'

const PLATFORM_ICONS: Record<string, { bg: string; text: string }> = {
  NAVER:  { bg: 'bg-green-500', text: '네' },
  GOOGLE: { bg: 'bg-blue-500',  text: 'G' },
  KAKAO:  { bg: 'bg-yellow-400', text: '카' },
  META:   { bg: 'bg-pink-500',  text: '인' },
}

function formatKoreanMoney(won: number) {
  if (won >= 100000000) return `${(won / 100000000).toFixed(0)}억원`
  if (won >= 10000) return `${(won / 10000).toFixed(0)}만원`
  return `${won.toLocaleString()}원`
}

function roiColor(roi: number) {
  if (roi >= 3000) return 'text-emerald-600'
  if (roi >= 2000) return 'text-blue-600'
  return 'text-orange-500'
}

export default async function FunnelPage() {
  const data = await getFunnelData()

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
      </header>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">마케팅 전환 퍼널 분석</h1>
        </div>

        {/* 광고 데이터 소스 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">광고 데이터 소스</h2>
              <p className="text-xs text-gray-400">광고 플랫폼을 연결하여 실시간 퍼널 데이터를 수집하세요</p>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <PlusCircle size={13} />
              새 연동 추가
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {data.channels.map((ch) => {
              const icon = PLATFORM_ICONS[ch.platform] ?? { bg: 'bg-gray-400', text: '?' }
              return (
                <div
                  key={ch.platform}
                  className="border border-gray-100 rounded-xl p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-8 h-8 rounded-full ${icon.bg} flex items-center justify-center text-white text-xs font-bold`}
                    >
                      {icon.text}
                    </div>
                    {ch.isConnected && <CheckCircle size={16} className="text-emerald-500" />}
                  </div>
                  <p className="text-sm font-medium text-gray-800">{ch.name}</p>
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                    {ch.isConnected ? '연결됨' : '미연결'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* 요약 KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="총 광고비"
            value={formatKoreanMoney(data.totalSpend)}
            color="blue"
            icon={<DollarSign size={16} />}
          />
          <KpiCard
            label="총 결제 건수"
            value={`${data.totalConversions.toLocaleString()}건`}
            color="green"
            icon={<ShoppingCart size={16} />}
          />
          <KpiCard
            label="평균 CAC"
            value={`${data.avgCac.toLocaleString()}원`}
            color="orange"
            icon={<TrendingUp size={16} />}
          />
          <KpiCard
            label="전체 전환율"
            value={`${data.overallConversionRate.toFixed(2)}%`}
            color="purple"
            icon={<Target size={16} />}
          />
        </div>

        {/* 채널별 성과 비교 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">채널별 성과 비교</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">채널</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">광고비</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">결제 건수</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">CAC</th>
                  <th className="text-right py-2 px-4 text-xs font-medium text-gray-500">전환율</th>
                  <th className="text-right py-2 pl-4 text-xs font-medium text-gray-500">ROI</th>
                </tr>
              </thead>
              <tbody>
                {data.channels.map((ch) => (
                  <tr key={ch.platform} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ch.color }}
                        />
                        <span className="font-medium text-gray-800">{ch.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {formatKoreanMoney(ch.adSpend)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">{ch.conversions}건</td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {ch.cac.toLocaleString()}원
                    </td>
                    <td className="py-3 px-4 text-right text-gray-700">
                      {ch.conversionRate.toFixed(2)}%
                    </td>
                    <td className={`py-3 pl-4 text-right font-semibold ${roiColor(ch.roi)}`}>
                      {ch.roi.toLocaleString()}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 채널별 광고비 vs 결제건수 차트 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">채널별 광고비 vs 결제건수</h2>
          <FunnelBarChart channels={data.channels} />
          {data.dataSource === 'mock' && (
            <p className="text-xs text-gray-300 text-center mt-3">
              * 목 데이터 — API 키 설정 후 실데이터로 자동 전환됩니다
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
