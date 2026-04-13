import { db } from '@/lib/db'
import type { CompetitorData, FunnelData, ProcedureData, ProcedureItem, CategoryBreakdown } from './types'
import { getMockCompetitorData, MOCK_FUNNEL_DATA, MOCK_PROCEDURE_DATA } from './mock-data'

export async function getCompetitorData(keyword: string): Promise<CompetitorData> {
  // Phase 2: DB 캐시 확인 → Naver API → mock 순으로 전환 예정
  return getMockCompetitorData(keyword || '보톡스')
}

export async function getFunnelData(): Promise<FunnelData> {
  // Phase 2: DB 캐시 확인 → Ad platform APIs → mock 순으로 전환 예정
  return MOCK_FUNNEL_DATA
}

export async function getProcedureData(hospitalId?: string): Promise<ProcedureData> {
  try {
    const now = new Date()
    const periodMonth = now.getFullYear() * 100 + (now.getMonth() + 1)

    // 병원 ID 미지정 시 첫 번째 병원 사용
    const targetHospitalId = hospitalId ?? (await db.hospital.findFirst({ select: { id: true } }))?.id
    if (!targetHospitalId) return MOCK_PROCEDURE_DATA

    // ProcedurePerformance 테이블에서 이번달 실데이터 조회
    const records = await db.procedurePerformance.findMany({
      where: { hospitalId: targetHospitalId, periodMonth },
      orderBy: { revenue: 'desc' },
    })

    if (records.length === 0) return MOCK_PROCEDURE_DATA

    // 집계
    const totalRevenue = records.reduce((s, r) => s + r.revenue, 0)
    const totalPatients = records.reduce((s, r) => s + r.patientCount, 0)
    const avgRepeatRate = Math.round(
      records.reduce((s, r) => s + r.repeatRate, 0) / records.length * 100,
    )

    // 카테고리별 매출 합산
    const catMap: Record<string, number> = {}
    for (const r of records) {
      catMap[r.category] = (catMap[r.category] ?? 0) + r.revenue
    }
    const catColors: Record<string, string> = {
      '주사 계열':   '#3B82F6',
      '리프팅 계열': '#8B5CF6',
      '레이저 계열': '#F59E0B',
      '기타':        '#9CA3AF',
    }
    const categoryBreakdown: CategoryBreakdown[] = Object.entries(catMap).map(([name, revenue]) => ({
      name,
      revenue,
      color: catColors[name] ?? '#9CA3AF',
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

    return {
      totalRevenue,
      totalPatients,
      avgRepeatRate,
      procedureTypeCount: records.length,
      categoryBreakdown,
      procedures,
      dataSource: 'live',
    }
  } catch (err) {
    console.error('getProcedureData DB 조회 실패, mock 사용:', err)
    return MOCK_PROCEDURE_DATA
  }
}

export type { CompetitorData, FunnelData, ProcedureData }
