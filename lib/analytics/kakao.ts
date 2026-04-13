import type { ChannelPerformance } from './types'

const BASE_URL = 'https://apis.moment.kakao.com/openapi/v4'

async function kakaoFetch(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.KAKAO_REST_API_KEY}`,
      adAccountId: process.env.KAKAO_AD_ACCOUNT_ID!,
    },
    next: { revalidate: 3600 }, // 1시간 캐시
  })
  if (!res.ok) {
    throw new Error(`카카오 API 오류: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

export async function fetchKakaoAdPerformance(): Promise<ChannelPerformance> {
  // 이번달 기간 계산
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const data = await kakaoFetch(
    `/stats/adAccounts?datePreset=THIS_MONTH&metricsGroups=BASIC_PERFORMANCE`
  )

  const stats = data?.data?.[0] ?? {}
  const adSpend = Math.round((stats.cost ?? 0))
  const conversions = stats.purchases ?? stats.conversions ?? 0
  const impressions = stats.impressions ?? 0
  const clicks = stats.clicks ?? 0
  const cac = conversions > 0 ? Math.round(adSpend / conversions) : 0
  const conversionRate = clicks > 0 ? Math.round((conversions / clicks) * 10000) / 100 : 0
  const roi = adSpend > 0 ? Math.round((conversions * 120000 / adSpend) * 100) : 0 // 평균 시술가 12만원 가정

  return {
    name: '카카오 비즈보드',
    platform: 'KAKAO',
    color: '#FEE500',
    adSpend,
    conversions,
    cac,
    conversionRate,
    roi,
    isConnected: true,
  }
}
