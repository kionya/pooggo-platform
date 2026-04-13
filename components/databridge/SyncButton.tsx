'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { syncAllHospitals } from '@/app/admin/databridge/actions'

export default function SyncButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleSync() {
    setLoading(true)
    setResult(null)
    try {
      const results = await syncAllHospitals()
      const total = results.reduce((s, r) => s + r.synced, 0)
      setResult(`✓ ${results.length}개 병원, 총 ${total}개 시술 데이터 동기화 완료`)
    } catch (e) {
      setResult('동기화 실패: ' + (e instanceof Error ? e.message : '알 수 없는 오류'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSync}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        {loading ? '동기화 중...' : '시술 데이터 동기화'}
      </button>
      {result && (
        <span className={`text-xs ${result.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>
          {result}
        </span>
      )}
    </div>
  )
}
