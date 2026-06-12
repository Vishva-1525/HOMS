import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ConfirmModalProps {
  open: boolean
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'default'
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
}

export function ConfirmModal({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  variant = 'default',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
        className={cn(
          'relative z-10 w-full max-w-[440px] rounded-[var(--radius-lg)] border border-[var(--svce-border-default)] bg-[var(--svce-white)] p-6',
        )}
      >
        <h2
          id="confirm-modal-title"
          className="text-lg font-semibold text-[var(--svce-text-primary)]"
        >
          {title}
        </h2>
        <p
          id="confirm-modal-description"
          className="mt-2 text-sm text-[var(--svce-text-secondary)]"
        >
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
