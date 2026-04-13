import { Search, FileText, Megaphone, Eye, Bell, HelpCircle } from 'lucide-react'
import KpiCard from '@/components/databridge/KpiCard'
import PlatformBadge from '@/components/databridge/PlatformBadge'
import { getCompetitorData } from '@/lib/analytics'

const POPULAR_KEYWORDS = ['바디필러', '엉덩이필러', '코성형', '지방흡입', '보톡스']

interface PageProps {
  searchParams: Promise<{ keyword?: string }>
}

export default async function CompetitorPage({ searchParams }: PageProps) {
  const params = await searchParams
  const keyword = params.keyword || '바디필러'
  const data = await getCompetitorData(keyword)

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
        <div className="flex items-center gap-3">
          <button className="p-2 text-gray-400 hover:text-gray-600">
            <Bell size={18} />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600">
            <HelpCircle size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              김
            </div>
            <div className="hidden sm:block text-right">
              <p className="text-xs font-semibold text-gray-800">김원장님</p>
              <p className="text-xs text-blue-500">프리미엄 플랜</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">병원 마케팅 경쟁 분석</h1>
          <p className="text-sm text-gray-500">실시간 경쟁사 콘텐츠 &amp; 키워드 트렌드 분석</p>
        </div>

        {/* 시술 키워드 검색 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Search size={16} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-800">시술 키워드 검색</h2>
          </div>
          <form method="GET" className="flex gap-3">
            <input
              name="keyword"
              defaultValue={keyword}
              placeholder="시술명을 입력하세요 (예: 보톡스, 필러, 울쎄라)"
              className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              검색
            </button>
          </form>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-gray-400">인기 검색어:</span>
            {POPULAR_KEYWORDS.map((kw) => (
              <a
                key={kw}
                href={`/admin/databridge/competitor?keyword=${encodeURIComponent(kw)}`}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  kw === keyword
                    ? 'bg-blue-50 border-blue-200 text-blue-600 font-medium'
                    : 'border-gray-200 text-gray-500 hover:border-blue-200 hover:text-blue-600'
                }`}
              >
                {kw}
              </a>
            ))}
          </div>
        </div>

        {/* 검색 결과 KPI */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Search size={14} className="text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-800">
              &quot;{keyword}&quot; 검색 결과
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="월간 검색량"
              value={data.monthlySearchVol.toLocaleString()}
              subLabel="+15% ↑"
              color="blue"
              icon={<Search size={16} />}
            />
            <KpiCard
              label="관련 콘텐츠"
              value={`${data.relatedContentCnt.toLocaleString()}개`}
              subLabel="최근 1개월"
              color="purple"
              icon={<FileText size={16} />}
            />
            <KpiCard
              label="경쟁 광고"
              value={`${data.competitorAdCnt}개`}
              subLabel="병원"
              color="orange"
              icon={<Megaphone size={16} />}
            />
            <KpiCard
              label="평균 조회수"
              value={`${(data.avgViewCount / 1000).toFixed(0)}K`}
              subLabel="콘텐츠당"
              color="green"
              icon={<Eye size={16} />}
            />
          </div>
        </div>

        {/* 연관 키워드 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-green-500 text-base">↗</span>
            <h2 className="text-sm font-semibold text-gray-800">
              &quot;{keyword}&quot; 연관 키워드
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.relatedKeywords.map((rk) => (
              <a
                key={rk.keyword}
                href={`/admin/databridge/competitor?keyword=${encodeURIComponent(rk.keyword)}`}
                className="flex flex-col gap-1.5 p-3 border border-gray-100 rounded-lg hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{rk.keyword}</span>
                  <span className="text-xs font-bold text-blue-600">{rk.relevanceScore}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${rk.relevanceScore}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">월간 {rk.monthlySearchVol.toLocaleString()}</span>
              </a>
            ))}
          </div>
        </div>

        {/* 인기 콘텐츠 TOP 10 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🏆</span>
            <h2 className="text-sm font-semibold text-gray-800">
              &quot;{keyword}&quot; 관련 인기 콘텐츠 TOP 10
            </h2>
          </div>
          <p className="text-xs text-gray-400 mb-4 ml-7">조회수 기반 효과적인 광고 레퍼런스</p>
          <div className="flex flex-col gap-2">
            {data.topContents.map((content) => (
              <div
                key={content.rank}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    content.rank === 1
                      ? 'bg-yellow-400 text-white'
                      : content.rank === 2
                      ? 'bg-gray-300 text-white'
                      : content.rank === 3
                      ? 'bg-orange-400 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {content.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{content.title}</p>
                  <p className="text-xs text-gray-400">{content.hospitalName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PlatformBadge platform={content.platform} />
                  <span className="text-xs font-medium text-gray-600 w-16 text-right">
                    {content.viewCount >= 10000
                      ? `${(content.viewCount / 10000).toFixed(0)}만`
                      : content.viewCount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {data.dataSource === 'mock' && (
            <p className="text-xs text-gray-300 text-center mt-4">
              * 목 데이터 — API 키 설정 후 실데이터로 자동 전환됩니다
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
