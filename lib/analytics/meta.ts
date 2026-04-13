import type { ChannelPerformance } from './types'

const BASE_URL = 'https://graph.facebook.com/v19.0'

export async function fetchMetaAdPerformance(): Promise<ChannelPerformance> {
  const adAccountId = process.env.META_AD_ACCOUNT_ID!
  const accessToken = process.env.META_ACCESS_TOKEN!

  // 이번달 날짜 범위
  const now = new Date()
  const since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const until = now.toISOString().slice(0, 10)

  const fields = 'spend,actions,impressions,clicks,cost_per_action_type'
  const url = `${BASE_URL}/act_${adAccountId}/insights?fields=${fields}&time_range={"since":"${since}","until":"${until}"}&access_token=${accessToken}`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) {
    throw new Error(`Meta API 오류: ${res.status} ${await res.text()}`)
  }

  const json = await res.json()
  const data = json.data?.[0] ?? {}

  const adSpend = Math.round(parseFloat(data.spend ?? '0') * 1300) // USD → KRW (환율 1300 적용)
  const impressions = parseInt(data.impressions ?? '0')
  const clicks = parseInt(data.clicks ?? '0')

  // actions 배열에서 전환(purchase 또는 lead) 건수 추출
  const actions: Array<{ action_type: string; value: string }> = data.actions ?? []
  const conversions = actions
    .filter(a => ['purchase', 'lead', 'complete_registration'].includes(a.action_type))
    .reduce((sum, a) => sum + parseInt(a.value ?? '0'), 0)

  const cac = conversions > 0 ? Math.round(adSpend / conversions) : 0
  const conversionRate = clicks > 0 ? Math.round((conversions / clicks) * 10000) / 100 : 0
  const roi = adSpend > 0 ? Math.round((conversions * 120000 / adSpend) * 100) : 0

  return {
    name: '인스타그램',
    platform: 'META',
    color: '#E1306C',
    adSpend,
    conversions,
    cac,
    conversionRate,
    roi,
    isConnected: true,
  }
}
