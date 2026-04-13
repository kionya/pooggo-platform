'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { CategoryBreakdown } from '@/lib/analytics/types'

interface ProcedureCategoryChartProps {
  data: CategoryBreakdown[]
}

function formatRevenue(won: number) {
  if (won >= 100000000) return `${(won / 100000000).toFixed(0)}억`
  if (won >= 10000) return `${(won / 10000).toFixed(0)}만`
  return `${won.toLocaleString()}`
}

export default function ProcedureCategoryChart({ data }: ProcedureCategoryChartProps) {
  const filtered = data.filter((d) => d.revenue > 0)
  const total = filtered.reduce((s, d) => s + d.revenue, 0)

  return (
    <div className="flex flex-col lg:flex-row items-center gap-4">
      <ResponsiveContainer width={200} height={200}>
        <PieChart>
          <Pie
            data={filtered}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="revenue"
            nameKey="name"
            paddingAngle={2}
          >
            {filtered.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`${formatRevenue(value)}원`, '매출']} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-2 flex-1">
        {filtered.map((d) => (
          <div key={d.name} className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-sm text-gray-700 flex-1">{d.name}</span>
            <span className="text-sm font-semibold text-gray-800">{formatRevenue(d.revenue)}만원</span>
            <span className="text-xs text-gray-400 w-10 text-right">
              {((d.revenue / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
