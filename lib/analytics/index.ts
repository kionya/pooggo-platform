import { db } from '@/lib/db'
import type { CompetitorData, FunnelData, ProcedureData, ProcedureItem, CategoryBreakdown } from './types'
import { getMockCompetitorData, MOCK_FUNNEL_DATA, MOCK_PROCEDURE_DATA } from './mock-data'
import { fetchNaverKeywordData } from './naver-searchad'
import { fetchYouTubeContents } from './youtube'
import { fetchKakaoAdPerformance } from './kakao'
import { fetchMetaAdPerformance } from './meta'

// ─────────────────────────────────────────────
// 경쟁사 분석: 네이버 검색량 + YouTube 콘텐츠
// ─────────────────────────────────────────────
export async function getCompetitorData(keyword: string): Promise<CompetitorData> {
  const hasNaver = !!process.env.NAVER_SEARCHAD_API_KEY
  const hasYoutube = !!process.env.YOUTUBE_DATA_API_KEY

  // 둘 다 없으면 목데이터
  if (!hasNaver && !hasYoutube) return getMockCompetitorData(keyword)

  const mock = getMockCompetitorData(keyword)

  try {
    // 네이버 + YouTube 병렬 호출
    const [naverData, youtubeContents] = await Promise.allSettled([
      hasNaver ? fetchNaverKeywordData(keyword) : Promise.resolve(null),
      hasYoutube ? fetchYouTubeContents(keyword) : Promise.resolve(null),
    ])

    const naver = naverData.status === 'fulfilled' ? naverData.value : null
    const youtube = youtubeContents.status === 'fulfilled' ? youtubeContents.value : null

    // 유튜브 콘텐츠가 있으면 mock TOP10 앞부분 대체
    const topContents = youtube && youtube.length > 0
      ? [
          ...youtube.slice(0, 7),
          ...mock.topContents.slice(7).map(c => ({
            ...c,
            rank: youtube.length + (c.rank - 7),
          })),
        ].slice(0, 10).map((c, i) => ({ ...c, rank: i + 1 }))
      : mock.topContents

    return {
      keyword,
      monthlySearchVol: naver?.monthlySearchVol ?? mock.monthlySearchVol,
      relatedKeywords: naver?.relatedKeywords?.length
        ? naver.relatedKeywords
        : mock.relatedKeywords,
      relatedContentCnt: topContents.length > 0
        ? topContents.length * 28 // YouTube 결과 기반 추정
        : mock.relatedContentCnt,
      competitorAdCnt: mock.competitorAdCnt, // 네이버 광고 경쟁도 추후 연동
      avgViewCount: topContents.length > 0
        ? Math.round(topContents.reduce((s, c) => s + c.viewCount, 0) / topContents.length)
        : mock.avgViewCount,
      topContents,
      dataSource: naver || youtube ? 'live' : 'mock',
    }
  } catch (err) {
    console.error('getCompetitorData 실API 실패, mock 사용:', err)
    return getMockCompetitorData(keyword)
  }
}

// ─────────────────────────────────────────────
// 마케팅 퍼널: 카카오 + Meta 실데이터
// ─────────────────────────────────────────────
export async function getFunnelData(): Promise<FunnelData> {
  const hasKakao = !!process.env.KAKAO_REST_API_KEY
  const hasMeta = !!process.env.META_ACCESS_TOKEN

  if (!hasKakao && !hasMeta) return MOCK_FUNNEL_DATA

  try {
    const [kakaoResult, metaResult] = await Promise.allSettled([
      hasKakao ? fetchKakaoAdPerformance() : Promise.resolve(null),
      hasMeta ? fetchMetaAdPerformance() : Promise.resolve(null),
    ])

    const kakao = kakaoResult.status === 'fulfilled' ? kakaoResult.value : null
    const meta = metaResult.status === 'fulfilled' ? metaResult.value : null

    // 실데이터 채널 + 목데이터 채널(네이버·구글) 합산
    const liveChannels = [kakao, meta].filter(Boolean) as typeof MOCK_FUNNEL_DATA.channels
    const mockChannels = MOCK_FUNNEL_DATA.channels.filter(
      c => !liveChannels.some(l => l.platform === c.platform)
    )
    const channels = [...liveChannels, ...mockChannels]

    const totalSpend = channels.reduce((s, c) => s + c.adSpend, 0)
    const totalConversions = channels.reduce((s, c) => s + c.conversions, 0)
    const avgCac = totalConversions > 0 ? Math.round(totalSpend / totalConversions) : 0
    const totalClicks = channels.reduce((s, c) => s + (c.conversions > 0 ? c.conversions / (c.conversionRate / 100) : 0), 0)
    const overallConversionRate = totalClicks > 0
      ? Math.round((totalConversions / totalClicks) * 10000) / 100
      : MOCK_FUNNEL_DATA.overallConversionRate

    return {
      channels,
      totalSpend,
      totalConversions,
      avgCac,
      overallConversionRate,
      dataSource: liveChannels.length > 0 ? 'live' : 'mock',
    }
  } catch (err) {
    console.error('getFunnelData 실API 실패, mock 사용:', err)
    return MOCK_FUNNEL_DATA
  }
}

// ─────────────────────────────────────────────
// 시술별 성과: ProcedurePerformance DB 우선
// ─────────────────────────────────────────────
export async function getProcedureData(hospitalId?: string): Promise<ProcedureData> {
  try {
    const now = new Date()
    const periodMonth = now.getFullYear() * 100 + (now.getMonth() + 1)

    const targetId = hospitalId ?? (await db.hospital.findFirst({ select: { id: true } }))?.id
    if (!targetId) return MOCK_PROCEDURE_DATA

    const records = await db.procedurePerformance.findMany({
      where: { hospitalId: targetId, periodMonth },
      orderBy: { revenue: 'desc' },
    })
    if (records.length === 0) return MOCK_PROCEDURE_DATA

    const totalRevenue = records.reduce((s, r) => s + r.revenue, 0)
    const totalPatients = records.reduce((s, r) => s + r.patientCount, 0)
    const avgRepeatRate = Math.round(
      records.reduce((s, r) => s + r.repeatRate, 0) / records.length * 100
    )

    const catMap: Record<string, number> = {}
    for (const r of records) catMap[r.category] = (catMap[r.category] ?? 0) + r.revenue

    const catColors: Record<string, string> = {
      '주사 계열': '#3B82F6',
      '리프팅 계열': '#8B5CF6',
      '레이저 계열': '#F59E0B',
      '기타': '#9CA3AF',
    }
    const categoryBreakdown: CategoryBreakdown[] = Object.entries(catMap).map(([name, revenue]) => ({
      name, revenue, color: catColors[name] ?? '#9CA3AF',
    }))

    const procedures: ProcedureItem[] = records.map((r, idx) => ({
      rank: idx + 1,
      procedureName: r.procedureName,
      category: r.category,
      revenue: r.revenue,
      patientCount: r.patientCount,
      repeatRate: Math.round(r.repeatRate * 100),
      trendPct: r.trendPct,
      aiRecommendation: r.aiRecommendation ?? '',
    }))

    return { totalRevenue, totalPatients, avgRepeatRate, procedureTypeCount: records.length, categoryBreakdown, procedures, dataSource: 'live' }
  } catch (err) {
    console.error('getProcedureData DB 조회 실패:', err)
    return MOCK_PROCEDURE_DATA
  }
}

export type { CompetitorData, FunnelData, ProcedureData }
