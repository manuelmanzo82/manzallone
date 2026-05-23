'use client'

import { ArrowLeft, ArrowRight, LogOut, Loader2 } from 'lucide-react'
import { useOnboarding } from './OnboardingContext'
import { SECTION_TITLES } from '@/lib/onboarding/types'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { type ReactNode } from 'react'

interface OnboardingShellProps {
  children: ReactNode
  /** Override "Avanti" disabled state from the section. */
  canProceed?: boolean
  /** Replace the Next button label (e.g. "Iniziamo" for welcome). */
  nextLabel?: string
  /** If true, the Shell hides its Next button and the section controls advancement itself. */
  hideNext?: boolean
}

export function OnboardingShell({
  children,
  canProceed = true,
  nextLabel,
  hideNext = false,
}: OnboardingShellProps) {
  const {
    currentStepIndex,
    currentStep,
    totalSteps,
    isSaving,
    error,
    goNext,
    goBack,
    saveAndExit,
  } = useOnboarding()

  const displayStep = currentStepIndex + 1
  // Welcome (0) is "0/10" conceptually -> we count from 1.
  const progressPct = ((currentStepIndex + 1) / totalSteps) * 100

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-warm-50 via-primary-50/20 to-warm-100 dark:from-warm-900 dark:via-primary-900/10 dark:to-warm-900">
      <header className="sticky top-0 z-10 border-b border-warm-200/60 bg-white/80 backdrop-blur dark:border-warm-700/60 dark:bg-warm-900/80">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-warm-700 dark:text-warm-300">
              Sezione {displayStep} di {totalSteps}
              <span className="ml-2 text-warm-500">· {SECTION_TITLES[currentStep]}</span>
            </span>
            <button
              type="button"
              onClick={saveAndExit}
              disabled={isSaving}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-warm-600 hover:bg-warm-100 dark:text-warm-400 dark:hover:bg-warm-800 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
              Salva ed esci
            </button>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-warm-200 dark:bg-warm-700">
            <div
              className={cn(
                'h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500'
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto w-full max-w-2xl">{children}</div>
      </main>

      {error && (
        <div className="border-t border-danger-200 bg-danger-50 px-4 py-3 text-center text-sm text-danger-700 dark:border-danger-900/50 dark:bg-danger-900/20 dark:text-danger-300">
          {error}
        </div>
      )}

      <footer className="sticky bottom-0 border-t border-warm-200 bg-white/90 backdrop-blur dark:border-warm-700 dark:bg-warm-900/90">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={currentStepIndex === 0 || isSaving}
            className="min-w-[100px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Indietro
          </Button>

          {!hideNext && (
            <Button
              onClick={goNext}
              disabled={!canProceed || isSaving}
              loading={isSaving}
              className="min-w-[120px]"
            >
              {nextLabel ?? 'Avanti'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  )
}
