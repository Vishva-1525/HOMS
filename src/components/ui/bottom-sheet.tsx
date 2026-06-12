import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface BottomSheetProps {
  open: boolean
  title: string
  description?: string
  children?: ReactNode
  actionLabel: string
  onAction: () => void
  onClose?: () => void
}

export function BottomSheet({
  open,
  title,
  description,
  children,
  actionLabel,
  onAction,
  onClose,
}: BottomSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-lg rounded-t-2xl border bg-card px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-6 shadow-lg"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
        {children}
        <Button type="button" className="mt-5 w-full" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </div>
  )
}
