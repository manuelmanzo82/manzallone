'use client'

interface Props {
  streak: number | null
  loading: boolean
}

export function StreakCard({ streak, loading }: Props) {
  if (loading) {
    return (
      <div className="h-24 animate-pulse rounded-2xl border border-warm-200 bg-warm-100 dark:border-warm-800 dark:bg-warm-900" />
    )
  }

  const value = streak ?? 0
  const isMilestone = value >= 30
  const isZero = value === 0
  const msg = streakMessage(value)

  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-colors',
        isZero
          ? 'border-warm-200 bg-white dark:border-warm-800 dark:bg-warm-900'
          : isMilestone
          ? 'border-accent-300 bg-gradient-to-br from-accent-50 via-white to-accent-100 dark:border-accent-500/40 dark:from-accent-500/10 dark:via-warm-900 dark:to-accent-500/10'
          : 'border-primary-200 bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:border-primary-500/40 dark:from-primary-500/10 dark:via-warm-900 dark:to-primary-500/10',
      ].join(' ')}
    >
      {isMilestone && (
        <div className="absolute inset-0 pointer-events-none opacity-30">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-accent-400 animate-pulse"
              style={{
                top: `${(i * 37) % 100}%`,
                left: `${(i * 53) % 100}%`,
                animationDelay: `${i * 90}ms`,
              }}
            />
          ))}
        </div>
      )}
      <div className="relative flex items-center gap-4">
        <div className="text-5xl leading-none">🔥</div>
        <div className="flex-1">
          {isZero ? (
            <>
              <div className="text-lg font-semibold text-warm-900 dark:text-warm-50">
                Inizia oggi la tua streak!
              </div>
              <div className="mt-0.5 text-sm text-warm-600 dark:text-warm-300">
                Una sola registrazione basta per partire.
              </div>
            </>
          ) : (
            <>
              <div className="text-3xl font-bold text-warm-900 dark:text-warm-50">
                {value}{' '}
                <span className="text-lg font-medium text-warm-600 dark:text-warm-300">
                  {value === 1 ? 'giorno' : 'giorni'} di fila
                </span>
              </div>
              <div className="mt-0.5 text-sm text-warm-600 dark:text-warm-300">
                {msg}
              </div>
            </>
          )}
        </div>
        {isMilestone && (
          <span className="rounded-full bg-accent-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
            Mese
          </span>
        )}
      </div>
    </div>
  )
}

function streakMessage(n: number): string {
  if (n >= 90) return 'Trimestre completo. Sei una macchina.'
  if (n >= 30) return 'Un mese intero. Continua così.'
  if (n >= 14) return 'Due settimane consecutive. Stai costruendo l\'abitudine.'
  if (n >= 7) return 'Una settimana piena. Bella costanza.'
  if (n >= 3) return 'Tre giorni di seguito, momentum.'
  return 'Bene, continua domani.'
}
