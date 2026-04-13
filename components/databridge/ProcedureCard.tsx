'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import TrendBadge from './TrendBadge'
import type { ProcedureItem } from '@/lib/analytics/types'

interface Props {
  proc: ProcedureItem
  totalRevenue: number
}

function formatRevenue(won: number) {
  if (won >= 100000000) return `${(won / 100000000).toFixed(1)}억원`
  if (won >= 10000) return `${(won / 10000).toFixed(0)}만원`
  return `${won.toLocaleString()}원`
}

function repeatRateStyle(rate: number) {
  if (rate >= 70) return { bar: 'bg-emerald-500', label: '우수', text: 'text-emerald-600' }
  if (rate >= 50) return { bar: 'bg-blue-500',    label: '양호', text: 'text-blue-600' }
  return            { bar: 'bg-red-400',           label: '개선 필요', text: 'text-red-500' }
}

function aiRecommendationColor(text: string) {
  if (text.includes('성장') || text.includes('우수') || text.includes('패키지')) return 'bg-emerald-50 border-emerald-100 text-emerald-700'
  if (text.includes('감소') || text.includes('낮')) return 'bg-orange-50 border-orange-100 text-orange-700'
  return 'bg-blue-50 border-blue-100 text-blue-700'
}

export default function ProcedureCard({ proc, totalRevenue }: Props) {
  const [openPanel, setOpenPanel] = useState<'report' | 'trend' | null>(null)
  const rateStyle = repeatRateStyle(proc.repeatRate)
  const avgPrice = proc.patientCount > 0 ? Math.round(proc.revenue / proc.patientCount) : 0

  function toggle(panel: 'report' | 'trend') {
    setOpenPanel(prev => prev === panel ? null : panel)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">
            {proc.rank}
          </span>
          <div>
            <p className="text-sm font-bold text-gray-900">{proc.procedureName}</p>
            <p className="text-xs text-gray-400">매출 기준 {proc.rank}위 · {proc.category}</p>
          </div>
        </div>
        <TrendBadge pct={proc.trendPct} />
      </div>

      {/* 매출 */}
      <div>
        <p className="text-lg font-bold text-gray-900">{formatRevenue(proc.revenue)}</p>
        <p className="text-xs text-gray-400">
          전체 매출의 {((proc.revenue / totalRevenue) * 100).toFixed(1)}%
        </p>
      </div>

      {/* 환자수 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">환자 수</span>
        <span className="font-semibold text-gray-800">
          {proc.patientCount.toLocaleString()}명
          <span className="text-xs text-gray-400 font-normal ml-1">
            (평균 {formatRevenue(avgPrice)})
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
            className={`${rateStyle.bar} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(proc.repeatRate, 100)}%` }}
          />
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => toggle('report')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 border rounded-lg text-xs transition-colors ${
            openPanel === 'report'
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          📊 시술 리포트
          {openPanel === 'report' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button
          onClick={() => toggle('trend')}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 border rounded-lg text-xs transition-colors ${
            openPanel === 'trend'
              ? 'border-purple-300 bg-purple-50 text-purple-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          📈 월별 추이
          {openPanel === 'trend' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* 리포트 패널 */}
      {openPanel === 'report' && (
        <div className="border border-blue-100 bg-blue-50/50 rounded-lg p-3 flex flex-col gap-2 text-xs">
          <p className="font-semibold text-blue-800 mb-1">📊 시술 상세 리포트</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg p-2 text-center">
              <p className="text-gray-400">총 매출</p>
              <p className="font-bold text-gray-800">{formatRevenue(proc.revenue)}</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <p className="text-gray-400">총 환자</p>
              <p className="font-bold text-gray-800">{proc.patientCount}명</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <p className="text-gray-400">평균 객단가</p>
              <p className="font-bold text-gray-800">{formatRevenue(avgPrice)}</p>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <p className="text-gray-400">재시술률</p>
              <p className={`font-bold ${rateStyle.text}`}>{proc.repeatRate}%</p>
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 mt-1">
            <p className="text-gray-400 mb-1">전월 대비</p>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 rounded-full flex-1 ${proc.trendPct >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`}
                style={{ width: `${Math.min(Math.abs(proc.trendPct) * 3, 100)}%` }}
              />
              <span className={`font-bold ${proc.trendPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {proc.trendPct >= 0 ? '+' : ''}{proc.trendPct}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 월별 추이 패널 */}
      {openPanel === 'trend' && (
        <div className="border border-purple-100 bg-purple-50/50 rounded-lg p-3 flex flex-col gap-2 text-xs">
          <p className="font-semibold text-purple-800 mb-1">📈 최근 6개월 추이 (예상)</p>
          <div className="flex items-end gap-1 h-16">
            {[0.75, 0.82, 0.88, 0.91, 0.95, 1.0].map((ratio, i) => {
              const months = ['11월', '12월', '1월', '2월', '3월', '이번달']
              const height = Math.round(ratio * 100)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col justify-end" style={{ height: '52px' }}>
                    <div
                      className={`w-full rounded-t ${i === 5 ? 'bg-purple-500' : 'bg-purple-200'}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-gray-400" style={{ fontSize: '9px' }}>{months[i]}</span>
                </div>
              )
            })}
          </div>
          <p className="text-gray-400 text-center mt-1" style={{ fontSize: '10px' }}>
            * 네이버 검색광고 API 연동 시 실데이터로 전환됩니다
          </p>
        </div>
      )}

      {/* AI 추천 */}
      <div className={`border rounded-lg px-3 py-2 ${aiRecommendationColor(proc.aiRecommendation)}`}>
        <p className="text-xs">💡 {proc.aiRecommendation}</p>
      </div>
    </div>
  )
}
