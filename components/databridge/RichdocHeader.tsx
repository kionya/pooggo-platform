import { Bell, HelpCircle } from 'lucide-react'
import { db } from '@/lib/db'
import HospitalSelector from './HospitalSelector'

interface Props {
  selectedHospitalId?: string
  rightSlot?: React.ReactNode
}

export default async function RichdocHeader({ selectedHospitalId, rightSlot }: Props) {
  const hospitals = await db.hospital.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  const currentId = selectedHospitalId ?? hospitals[0]?.id ?? ''
  const currentHospital = hospitals.find(h => h.id === currentId) ?? hospitals[0]

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      {/* 병원 선택 */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">RD</span>
        </div>
        <div>
          <HospitalSelector hospitals={hospitals} selectedId={currentId} />
          <p className="text-xs text-blue-500">Powered by Richdoc</p>
        </div>
      </div>

      {/* 우측 액션 영역 */}
      <div className="flex items-center gap-2">
        {rightSlot}
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
          <Bell size={18} />
        </button>
        <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50">
          <HelpCircle size={18} />
        </button>
        <div className="flex items-center gap-2 ml-1">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            {currentHospital?.name?.[0] ?? '?'}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-gray-800">원장님</p>
            <p className="text-xs text-blue-500">프리미엄 플랜</p>
          </div>
        </div>
      </div>
    </header>
  )
}
