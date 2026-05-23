'use client'

import { useOnboarding } from '../OnboardingContext'
import { OnboardingShell } from '../OnboardingShell'
import { Card } from '@/components/ui/Card'
import { Textarea } from '@/components/ui/Textarea'
import { TimePicker } from '@/components/ui/TimePicker'
import { Slider } from '@/components/ui/Slider'

export function SectionSonnoBenessere() {
  const { data, setData } = useOnboarding()
  const s = data.sonno_benessere

  const canProceed = Boolean(s.sleep_time && s.wake_time)

  return (
    <OnboardingShell canProceed={canProceed}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Sonno e benessere
        </h2>
        <p className="mt-1 text-sm text-warm-600 dark:text-warm-400">
          Il sonno influenza appetito, recupero e umore. Lo terremo in conto.
        </p>
      </div>

      <div className="space-y-4">
        <Card className="space-y-4">
          <TimePicker
            label="A che ora ti addormenti di solito?"
            value={s.sleep_time}
            onChange={(v) => setData('sonno_benessere', { sleep_time: v })}
          />
          <TimePicker
            label="A che ora ti svegli?"
            value={s.wake_time}
            onChange={(v) => setData('sonno_benessere', { wake_time: v })}
          />
          <Slider
            label="Qualità media del sonno"
            value={s.sleep_quality}
            onChange={(v) => setData('sonno_benessere', { sleep_quality: v })}
            min={1}
            max={5}
            step={1}
            formatValue={(v) => `${v} / 5`}
          />
        </Card>

        <Card>
          <Textarea
            name="supplements"
            label="Usi integratori o farmaci quotidiani?"
            placeholder="es. Vitamina D 2000 UI, Omega-3 1g, magnesio serale, statina…"
            hint="Opzionale, ma utile per evitare suggerimenti incoerenti."
            value={s.supplements}
            onChange={(e) => setData('sonno_benessere', { supplements: e.target.value })}
          />
        </Card>
      </div>
    </OnboardingShell>
  )
}
