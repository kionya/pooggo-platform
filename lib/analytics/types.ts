export interface RelatedKeyword {
  keyword: string
  relevanceScore: number // 0–100
  monthlySearchVol: number
}

export interface CompetitorContent {
  rank: number
  title: string
  hospitalName: string
  platform: 'YOUTUBE' | 'NAVER_BLOG' | 'INSTAGRAM'
  viewCount: number
  url?: string
  thumbnailUrl?: string
}

export interface CompetitorData {
  keyword: string
  monthlySearchVol: number
  relatedContentCnt: number
  competitorAdCnt: number
  avgViewCount: number
  relatedKeywords: RelatedKeyword[]
  topContents: CompetitorContent[]
  dataSource: 'live' | 'cached' | 'mock'
}

export interface ChannelPerformance {
  name: string
  platform: string
  color: string
  adSpend: number
  conversions: number
  cac: number
  conversionRate: number
  roi: number
  isConnected: boolean
}

export interface FunnelData {
  channels: ChannelPerformance[]
  totalSpend: number
  totalConversions: number
  avgCac: number
  overallConversionRate: number
  dataSource: 'live' | 'cached' | 'mock'
}

export interface CategoryBreakdown {
  name: string
  revenue: number
  color: string
}

export interface ProcedureItem {
  procedureName: string
  category: string
  revenue: number
  patientCount: number
  repeatRate: number
  trendPct: number
  aiRecommendation: string
  rank: number
}

export interface ProcedureData {
  totalRevenue: number
  totalPatients: number
  avgRepeatRate: number
  procedureTypeCount: number
  categoryBreakdown: CategoryBreakdown[]
  procedures: ProcedureItem[]
  dataSource: 'live' | 'cached' | 'mock'
}
