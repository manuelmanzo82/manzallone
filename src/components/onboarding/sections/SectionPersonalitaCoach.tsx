'use client'

import { Shield } from 'lucide-react'
import { useOnboarding } from '../OnboardingContext'
import { OnboardingShell } from '../OnboardingShell'
import { Card } from '@/components/ui/Card'
import { RadioGroup, type RadioOption } from '@/components/ui/RadioGroup'
import type { PersonalitaCoachData } from '@/lib/onboarding/types'

const TONE_OPTIONS: RadioOption<NonNullable<PersonalitaCoachData['coach_tone']>>[] = [
  { value: 'direct', label: 'Diretto e schietto', description: 'Niente fronzoli, va dritto al punto' },
  { value: 'motivating', label: 'Motivante e incoraggiante', description: 'Spinge con energia positiva' },
  { value: 'technical', label: 'Tecnico con dati e percentuali', description: 'Numeri, metriche, evidenze' },
  { value: 'friendly', label: 'Amichevole e informale', description: 'Come un amico esperto' },
  { value: 'mixed', label: 'Misto in base al momento', description: 'Si adatta al contesto' },
]

const SLIP_OPTIONS: RadioOption<NonNullable<PersonalitaCoachData['slip_tone']>>[] = [
  { value: 'understanding', label: 'Comprensivo, mai giudicante', description: 'Riconosce e va avanti' },
  { value: 'realist', label: 'Realista che spiega', description: 'Spiega l\'impatto senza colpevolizzare' },
  { value: 'strict', label: 'Severo che mi riprende', description: 'Ti scuote per riportarti in carreggiata' },
]

const PROACTIVE_OPTIONS: RadioOption<NonNullable<PersonalitaCoachData['proactive']>>[] = [
  { value: 'always', label: 'Sì, sempre', description: 'Suggerimenti continui, anche se non chiedo' },
  { value: 'on_slip', label: 'Solo se sto sgarrando', description: 'Interviene se vede uno scostamento' },
  { value: 'on_demand', label: 'Solo se chiedo io', description: 'Silenzioso finché non lo chiamo' },
]

export function SectionPersonalitaCoach() {
  const { data, setData } = useOnboarding()
  const c = data.personalita_coach

  const canProceed = Boolean(c.coach_tone && c.slip_tone && c.proactive)

  return (
    <OnboardingShell canProceed={canProceed}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Come vuoi che ti parli?
        </h2>
        <p className="mt-1 text-sm text-warm-600 dark:text-warm-400">
          Personalizza il tono di Claude. Cambialo quando vuoi nelle impostazioni.
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <RadioGroup
            name="coach_tone"
            label="Tono principale"
            value={c.coach_tone}
            onChange={(v) => setData('personalita_coach', { coach_tone: v })}
            options={TONE_OPTIONS}
          />
        </Card>

        <Card>
          <RadioGroup
            name="slip_tone"
            label="Tono nei momenti di sgarro"
            value={c.slip_tone}
            onChange={(v) => setData('personalita_coach', { slip_tone: v })}
            options={SLIP_OPTIONS}
          />
        </Card>

        <Card>
          <RadioGroup
            name="proactive"
            label="Suggerimenti proattivi anche senza chiedere?"
            value={c.proactive}
            onChange={(v) => setData('personalita_coach', { proactive: v })}
            options={PROACTIVE_OPTIONS}
          />
        </Card>

        <Card className="border-2 border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/30">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-6 w-6 shrink-0 text-primary-600" />
            <div className="flex-1">
              <h3 className="text-base font-semibold text-primary-900 dark:text-primary-100">
                Modalità rigida attiva
              </h3>
              <p className="mt-1 text-sm text-primary-800 dark:text-primary-200">
                Claude userà <strong>SEMPRE</strong> grammature precise e kcal esatti. Niente
                stime vaghe come "una manciata" o "un piatto medio". Questa è la modalità di
                default di ManzAllone v2.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </OnboardingShell>
  )
}
