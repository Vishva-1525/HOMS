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
  const showProgress = approved && result.progress && result.progress.length === 4
  const cycleComplete = Boolean(result.cycleComplete)

  return (
    <div
      className={cn(
        'flex min-h-[100dvh] flex-col items-center justify-between px-4 py-6 text-white',
        approved
          ? 'bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-800'
          : 'bg-gradient-to-b from-red-500 via-red-600 to-red-900',
      )}
    >
      <div className="w-full max-w-lg flex-1 flex flex-col items-center justify-center gap-4 text-center">
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

        {showProgress && (
          <div className="w-full rounded-2xl border border-white/25 bg-black/15 px-3 py-3 text-left">
            <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-white/80">
              Gate protocol · {result.step ?? 0}/4
            </p>
            <ol className="space-y-1.5">
              {result.progress!.map((item, index) => (
                <li
                  key={item.checkpoint}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm',
                    item.justRecorded && 'bg-white/25 font-bold ring-1 ring-white/40',
                    item.done && !item.justRecorded && 'bg-white/10 text-white/90',
                    !item.done && 'text-white/55',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      item.done ? 'bg-white text-emerald-700' : 'bg-white/15 text-white/70',
                    )}
                  >
                    {item.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                  </span>
                  <span className="min-w-0 flex-1">{item.label}</span>
                  {item.justRecorded && (
                    <span className="text-[10px] font-bold uppercase tracking-wide">Done</span>
                  )}
                </li>
              ))}
            </ol>
            {!cycleComplete && result.nextGateLabel && (
              <p className="mt-2 rounded-xl bg-white/20 px-3 py-2 text-center text-sm font-semibold">
                Next required: {result.nextGateLabel}
              </p>
            )}
            {cycleComplete && (
              <p className="mt-2 rounded-xl bg-white/20 px-3 py-2 text-center text-sm font-semibold">
                All four gate scans complete for this trip
              </p>
            )}
          </div>
        )}

        <div className="w-full max-w-[200px] overflow-hidden rounded-3xl border-4 border-white/50 bg-white/10 shadow-2xl">
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
        {approved && !cycleComplete
          ? 'Next gate ready'
          : 'Next student ready'}
      </button>
      <p className="mt-2 max-w-lg text-center text-xs text-white/75">
        Returns to ready automatically — or tap to continue now
      </p>
    </div>
  )
}
