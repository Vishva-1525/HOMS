import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BulkActionBarProps {
  selectedCount: number
  onApprove: () => void
  onReject: () => void
  onClear: () => void
  disabled?: boolean
  className?: string
}

export function BulkActionBar({
  selectedCount,
  onApprove,
  onReject,
  onClear,
  disabled,
  className,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1A5CA0]/25 bg-[#EBF3FF]/60 px-4 py-3',
        className,
      )}
    >
      <p className="text-sm font-medium text-[#0D3F72]">
        {selectedCount} request{selectedCount === 1 ? '' : 's'} selected
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onApprove} disabled={disabled}>
          Approve selected
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-[#DC2626] hover:bg-[#FEF2F2]"
          onClick={onReject}
          disabled={disabled}
        >
          Reject selected
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClear} disabled={disabled}>
          Clear
        </Button>
      </div>
    </div>
  )
}
