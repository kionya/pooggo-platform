'use client'

import { useState } from 'react'
import ProcedureCard from './ProcedureCard'
import ProcedureCategoryChart from './ProcedureCategoryChart'
import type { ProcedureData } from '@/lib/analytics/types'

const CATEGORIES = ['전체', '주사 계열', '리프팅 계열', '레이저 계열', '기타']

interface Props {
  data: ProcedureData
}

export default function ProceduresClient({ data }: Props) {
  const [selectedCategory, setSelectedCategory] = useState('전체')

  const filtered = selectedCategory === '전체'
    ? data.procedures
    : data.procedures.filter(p => p.category === selectedCategory)

  const chartData = selectedCategory === '전체'
    ? data.categoryBreakdown
    : data.categoryBreakdown.filter(c => c.name === selectedCategory)

  return (
    <>
      {/* 카테고리 필터 + 도넛 차트 */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {cat}
                {cat !== '전체' && (
                  <span className="ml-1 opacity-70">
                    ({data.procedures.filter(p => p.category === cat).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-400 shrink-0">
            {filtered.length}개 시술
          </span>
        </div>
        <ProcedureCategoryChart data={chartData} />
      </div>

      {/* 시술 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">해당 카테고리의 시술 데이터가 없습니다</p>
          <p className="text-xs mt-1">상단 동기화 버튼을 눌러 데이터를 불러오세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(proc => (
            <ProcedureCard
              key={proc.procedureName}
              proc={proc}
              totalRevenue={data.totalRevenue}
            />
          ))}
        </div>
      )}
    </>
  )
}
