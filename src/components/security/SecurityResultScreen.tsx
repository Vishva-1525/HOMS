import { useEffect, useState } from 'react'
import { Check, User, X } from 'lucide-react'
import type { SecurityScanResult } from '@/lib/security-actions'
import { cn } from '@/lib/utils'

interface SecurityResultScreenProps {
  result: SecurityScanResult
  onScanNext: () => void
}

export function SecurityResultScreen({ result, onScanNext }: SecurityResultScreenProps) {
  const approved = result.outcome === 'approved'
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    setImgFailed(false)
  }, [result.photoUrl])

  const showPhoto = Boolean(result.photoUrl) && !imgFailed

  return (
    <div
      className={cn(
        'flex min-h-[100dvh] flex-col items-center justify-between px-4 py-6 text-white',
        approved
          ? 'bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-800'
          : 'bg-gradient-to-b from-red-500 via-red-600 to-red-900',
      )}
    >
      <div className="w-full max-w-lg flex-1 flex flex-col items-center justify-center gap-5 text-center">
        <div
          className={cn(
            'flex h-20 w-20 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/40',
            approved ? 'shadow-[0_0_40px_rgba(255,255,255,0.35)]' : '',
          )}
        >
          {approved ? (
            <Check className="h-12 w-12" strokeWidth={3} />
          ) : (
            <X className="h-12 w-12" strokeWidth={3} />
          )}
        </div>

        <div>
          <p className="text-3xl font-black tracking-tight sm:text-4xl">{result.title}</p>
          {result.detail && (
            <p className="mt-2 text-base font-medium text-white/90 sm:text-lg">{result.detail}</p>
          )}
        </div>

        <div className="w-full max-w-[220px] overflow-hidden rounded-3xl border-4 border-white/50 bg-white/10 shadow-2xl">
          {showPhoto && result.photoUrl ? (
            <img
              src={result.photoUrl}
              alt=""
              onError={() => setImgFailed(true)}
              className="aspect-[4/5] w-full object-cover object-top"
            />
          ) : (
            <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 bg-black/20">
              <User className="h-16 w-16 opacity-80" strokeWidth={1.5} />
              <span className="px-3 text-sm font-semibold">No photo</span>
            </div>
          )}
        </div>

        <div className="w-full space-y-1">
          <p className="truncate text-2xl font-bold sm:text-3xl">{result.studentName}</p>
          <p className="font-mono text-lg font-semibold tabular-nums tracking-wide text-white/95">
            {result.regNumber}
          </p>
          <p className="text-sm font-medium uppercase tracking-wider text-white/80">
            Admission · {result.admissionNo}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onScanNext}
        className="mt-6 h-14 w-full max-w-lg rounded-2xl bg-white text-base font-bold text-slate-900 shadow-lg active:scale-[0.98] sm:h-16 sm:text-lg"
      >
        Scan next student
      </button>
    </div>
  )
}
