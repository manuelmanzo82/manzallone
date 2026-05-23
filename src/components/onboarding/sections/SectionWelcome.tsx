'use client'

import { ArrowRight, Sparkles } from 'lucide-react'
import { useOnboarding } from '../OnboardingContext'
import { OnboardingShell } from '../OnboardingShell'
import { Button } from '@/components/ui/Button'

export function SectionWelcome() {
  const { goNext, isSaving } = useOnboarding()

  return (
    <OnboardingShell hideNext>
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-warm-900 dark:text-warm-50 sm:text-4xl">
          Ciao! Sono il tuo Claude personale.
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-warm-700 dark:text-warm-300">
          Prima di iniziare voglio conoscerti bene. Ci mettiamo circa 15 minuti totali,
          ma puoi interrompere a fine di ogni sezione e riprendere quando vuoi.
        </p>
        <p className="mt-2 text-sm text-warm-500">Pronto?</p>

        <Button size="lg" onClick={goNext} loading={isSaving} className="mt-8 min-w-[180px]">
          Iniziamo <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </OnboardingShell>
  )
}
