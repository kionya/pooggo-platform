'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChannelPerformance } from '@/lib/analytics/types'

interface FunnelBarChartProps {
  channels: ChannelPerformance[]
}

export default function FunnelBarChart({ channels }: FunnelBarChartProps) {
  const data = channels.map((c) => ({
    name: c.name.replace('검색광고', '').replace('비즈보드', '').trim(),
    광고비: Math.round(c.adSpend / 10000),
    결제건수: c.conversions,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 11 }} unit="만" />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="건" />
        <Tooltip
          formatter={(value, name) =>
            name === '광고비' ? [`${value}만원`, name] : [`${value}건`, name]
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="left" dataKey="광고비" fill="#3B82F6" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="right" dataKey="결제건수" fill="#10B981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
