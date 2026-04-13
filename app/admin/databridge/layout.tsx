import type { ReactNode } from 'react'
import DatabridgeSidebar from '@/components/databridge/DatabridgeSidebar'

export default function DatabridgeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DatabridgeSidebar />
      <main className="flex-1 lg:ml-0 min-w-0">
        {children}
      </main>
    </div>
  )
}
