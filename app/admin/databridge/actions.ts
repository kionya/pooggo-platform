'use server'

import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

// 메뉴 가격 문자열 → 원 단위 숫자 변환
function parsePriceToWon(priceStr: string): number {
  const cleaned = priceStr.replace(/[~,\s]/g, '')
  const manMatch = cleaned.match(/([\d.]+)만원/)
  if (manMatch) return Math.round(parseFloat(manMatch[1]) * 10000)
  const rawMatch = cleaned.match(/([\d]+)원/)
  if (rawMatch) return parseInt(rawMatch[1])
  return 0
}

// 시술명 → 카테고리 분류
function classifyCategory(name: string): string {
  const lifting = ['울쎄라', '슈링크', '리프팅', '실', '거상', '포텐자', '써마지', '인모드 페이스', '올리지오']
  const injection = ['보톡스', '필러', '리쥬란', '스킨보', '엑소좀', '주사', '지방분해', '삭센다', 'MPPL', '비만']
  const laser = ['레이저', '피코', '토닝', '프락셀', '클라리티', '인모드', '아이피엘', 'IPL', 'CO2']

  for (const kw of lifting) if (name.includes(kw)) return '리프팅 계열'
  for (const kw of injection) if (name.includes(kw)) return '주사 계열'
  for (const kw of laser) if (name.includes(kw)) return '레이저 계열'
  return '기타'
}

// 가격대별 현실적인 월 환자수 추정
function estimateMonthlyPatients(priceWon: number): number {
  if (priceWon >= 10000000) return Math.floor(Math.random() * 5 + 3)    // 1000만원+ → 3~7명
  if (priceWon >= 5000000)  return Math.floor(Math.random() * 10 + 5)   // 500만원+ → 5~14명
  if (priceWon >= 1000000)  return Math.floor(Math.random() * 30 + 15)  // 100만원+ → 15~44명
  if (priceWon >= 300000)   return Math.floor(Math.random() * 80 + 50)  // 30만원+ → 50~129명
  return Math.floor(Math.random() * 150 + 100)                           // 30만원 미만 → 100~249명
}

// Menu → ProcedurePerformance 동기화
export async function syncProcedurePerformanceFromMenus(hospitalId: string) {
  const hospital = await db.hospital.findUnique({
    where: { id: hospitalId },
    include: {
      menus: true,
      leads: { where: { status: 'DONE' }, include: { settlement: true } },
    },
  })
  if (!hospital) throw new Error('병원을 찾을 수 없습니다.')

  const now = new Date()
  const periodMonth = now.getFullYear() * 100 + (now.getMonth() + 1) // YYYYMM

  // 기존 이번달 데이터 삭제
  await db.procedurePerformance.deleteMany({
    where: { hospitalId, periodMonth },
  })

  // Lead + Settlement에서 실수익 집계
  const realRevenue = hospital.leads.reduce(
    (sum, lead) => sum + (lead.settlement?.amount ?? lead.quotedPrice ?? 0),
    0,
  )
  const realPatients = hospital.leads.length

  // 시술 메뉴 기반 ProcedurePerformance 생성
  const records = hospital.menus.map((menu, idx) => {
    const priceWon = parsePriceToWon(menu.price)
    const category = classifyCategory(menu.name)

    // Lead 실데이터 있으면 비중배분, 없으면 시뮬레이션
    let patients: number
    let revenue: number

    if (realPatients > 0 && realRevenue > 0) {
      // 가격 비중으로 배분
      const totalMenuPrice = hospital.menus.reduce((s, m) => s + parsePriceToWon(m.price), 0)
      const ratio = totalMenuPrice > 0 ? priceWon / totalMenuPrice : 1 / hospital.menus.length
      patients = Math.max(1, Math.round(realPatients * ratio))
      revenue = Math.round(realRevenue * ratio)
    } else {
      // 시뮬레이션 (현실적인 강남 클리닉 수치)
      patients = estimateMonthlyPatients(priceWon)
      revenue = priceWon * patients
    }

    const repeatRate = category === '주사 계열' ? 0.55 + Math.random() * 0.25
      : category === '리프팅 계열' ? 0.35 + Math.random() * 0.25
      : category === '레이저 계열' ? 0.45 + Math.random() * 0.25
      : 0.20 + Math.random() * 0.20

    const trendPct = Math.round((Math.random() * 30 - 10) * 10) / 10 // -10% ~ +20%

    const aiRec = repeatRate < 0.45
      ? '재시술률이 낮습니다. 고객 만족도 개선 프로그램 검토를 권장합니다.'
      : trendPct < 0
      ? '전월 대비 감소 추세입니다. 마케팅 예산 확대 검토를 권장합니다.'
      : '성장세가 좋습니다. SNS 후기 콘텐츠로 신환 유입을 강화하세요.'

    return {
      procedureName: menu.name,
      category,
      revenue,
      patientCount: patients,
      repeatRate: Math.round(repeatRate * 100) / 100,
      trendPct,
      aiRecommendation: aiRec,
      periodMonth,
      hospitalId,
    }
  })

  await db.procedurePerformance.createMany({ data: records })
  revalidatePath('/admin/databridge/procedures')

  return { synced: records.length, hospitalName: hospital.name }
}

// 모든 병원 일괄 동기화
export async function syncAllHospitals() {
  const hospitals = await db.hospital.findMany({ select: { id: true } })
  const results = await Promise.all(hospitals.map((h) => syncProcedurePerformanceFromMenus(h.id)))
  revalidatePath('/admin/databridge/procedures')
  return results
}
