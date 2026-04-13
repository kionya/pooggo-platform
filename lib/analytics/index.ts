import type { CompetitorData, FunnelData, ProcedureData } from './types'
import { getMockCompetitorData, MOCK_FUNNEL_DATA, MOCK_PROCEDURE_DATA } from './mock-data'

export async function getCompetitorData(keyword: string): Promise<CompetitorData> {
  // Phase 2: DB 캐시 확인 → Naver API → mock 순으로 전환 예정
  return getMockCompetitorData(keyword || '보톡스')
}

export async function getFunnelData(): Promise<FunnelData> {
  // Phase 2: DB 캐시 확인 → Ad platform APIs → mock 순으로 전환 예정
  return MOCK_FUNNEL_DATA
}

export async function getProcedureData(): Promise<ProcedureData> {
  // Phase 2: Treatment/Lead/Settlement 실데이터 집계로 전환 예정
  return MOCK_PROCEDURE_DATA
}

export type { CompetitorData, FunnelData, ProcedureData }
