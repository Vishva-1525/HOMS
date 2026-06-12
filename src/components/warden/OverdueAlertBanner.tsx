import { Link } from 'react-router-dom'

interface OverdueAlertBannerProps {
  count: number
}

export function OverdueAlertBanner({ count }: OverdueAlertBannerProps) {
  if (count <= 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-l-4 border-[#DC2626] bg-[#FEF2F2] px-3.5 py-3.5">
      <p className="text-sm font-medium text-[#991B1B]">
        ⚠ {count} student{count !== 1 ? 's have' : ' has'} not returned
      </p>
      <Link
        to="/warden/out"
        className="inline-flex h-8 items-center justify-center rounded-[var(--radius-md)] border border-[#1A5CA0] bg-white px-3 text-xs font-medium text-[#1A5CA0] hover:bg-[#EBF3FF]"
      >
        View overdue
      </Link>
    </div>
  )
}
