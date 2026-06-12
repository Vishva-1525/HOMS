import type { ReactNode } from 'react'
import { IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Modal({ open, title, onClose, children, footer, className }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-white/55 bg-card shadow-2xl shadow-slate-900/20 backdrop-blur-2xl',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <IconX className="h-5 w-5" stroke={1.75} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function ModalFooter({
  onCancel,
  onConfirm,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'default' as 'default' | 'destructive',
  loading = false,
  confirmDisabled = false,
}: {
  onCancel: () => void
  onConfirm: () => void
  confirmLabel: string
  cancelLabel?: string
  confirmVariant?: 'default' | 'destructive'
  loading?: boolean
  confirmDisabled?: boolean
}) {
  return (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
        {cancelLabel}
      </Button>
      <Button
        type="button"
        variant={confirmVariant === 'destructive' ? 'danger' : 'primary'}
        onClick={onConfirm}
        loading={loading}
        disabled={confirmDisabled}
      >
        {confirmLabel}
      </Button>
    </div>
  )
}
