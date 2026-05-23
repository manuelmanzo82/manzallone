'use client'

import { useState, useTransition } from 'react'
import { Copy, Users, Check } from 'lucide-react'
import { useOnboarding } from '../OnboardingContext'
import { OnboardingShell } from '../OnboardingShell'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { createHousehold } from '@/lib/onboarding/actions'

export function SectionPartner() {
  const { data, setData, goNext, isSaving } = useOnboarding()
  const p = data.partner
  const [creating, startCreate] = useTransition()
  const [copied, setCopied] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const handleCreate = () => {
    setCreateError(null)
    startCreate(async () => {
      const result = await createHousehold(p.household_name || 'Famiglia Manzo')
      if (!result.ok) {
        setCreateError(result.error)
        return
      }
      setData('partner', {
        household_id: result.household_id,
        invite_code: result.invite_code,
        household_name: result.name,
      })
    })
  }

  const handleCopy = async () => {
    if (!p.invite_code) return
    try {
      await navigator.clipboard.writeText(p.invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore — clipboard may be unavailable
    }
  }

  const setPrivacy = (key: keyof typeof p.privacy_prefs, v: boolean) => {
    setData('partner', { privacy_prefs: { ...p.privacy_prefs, [key]: v } })
  }

  return (
    <OnboardingShell hideNext>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-warm-900 dark:text-warm-50">
          Famiglia o partner
        </h2>
        <p className="mt-1 text-sm text-warm-600 dark:text-warm-400">
          Condividi i pasti consumati insieme, ma tieni private le statistiche personali.
        </p>
      </div>

      <div className="space-y-4">
        {!p.household_id ? (
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary-600" />
              <div>
                <h3 className="text-base font-semibold text-warm-900 dark:text-warm-50">
                  Crea la tua famiglia
                </h3>
                <p className="text-sm text-warm-600 dark:text-warm-400">
                  Otterrai un codice da condividere con il partner.
                </p>
              </div>
            </div>
            <Input
              name="household_name"
              label="Nome della famiglia"
              value={p.household_name}
              onChange={(e) => setData('partner', { household_name: e.target.value })}
            />
            {createError && (
              <div className="rounded-xl bg-danger-500/10 px-4 py-3 text-sm text-danger-700">
                {createError}
              </div>
            )}
            <Button onClick={handleCreate} loading={creating} fullWidth size="lg">
              Crea famiglia
            </Button>
          </Card>
        ) : (
          <Card className="space-y-4 border-2 border-primary-300 bg-primary-50 dark:border-primary-700 dark:bg-primary-900/30">
            <div className="text-center">
              <p className="text-xs uppercase tracking-wide text-primary-700 dark:text-primary-300">
                Codice invito per {p.household_name}
              </p>
              <p className="mt-2 font-mono text-3xl font-bold tracking-wider text-primary-900 dark:text-primary-100">
                {p.invite_code}
              </p>
            </div>
            <Button variant="secondary" fullWidth onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copiato!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copia codice
                </>
              )}
            </Button>
            <p className="text-sm text-primary-800 dark:text-primary-200">
              Condividi questo codice con il tuo partner quando vuole creare il suo account.
              Userà il codice per unirsi alla famiglia, così potrete condividere i pasti dei
              pranzi/cene insieme. Le statistiche personali restano private.
            </p>
          </Card>
        )}

        <Card>
          <h3 className="mb-1 text-base font-semibold text-warm-900 dark:text-warm-50">
            Cosa il partner può vedere
          </h3>
          <p className="mb-3 text-sm text-warm-600 dark:text-warm-400">
            Tutte attive di default. Cambia quando vuoi nelle impostazioni.
          </p>
          <div className="space-y-2">
            <Checkbox
              label="Il mio peso"
              checked={p.privacy_prefs.share_weight}
              onChange={(v) => setPrivacy('share_weight', v)}
            />
            <Checkbox
              label="I miei pasti"
              checked={p.privacy_prefs.share_meals}
              onChange={(v) => setPrivacy('share_meals', v)}
            />
            <Checkbox
              label="I miei allenamenti"
              checked={p.privacy_prefs.share_workouts}
              onChange={(v) => setPrivacy('share_workouts', v)}
            />
            <Checkbox
              label="Le mie statistiche aggregate"
              checked={p.privacy_prefs.share_stats}
              onChange={(v) => setPrivacy('share_stats', v)}
            />
          </div>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" fullWidth onClick={goNext} loading={isSaving}>
            Salto, lo faccio dopo
          </Button>
          <Button fullWidth onClick={goNext} loading={isSaving} disabled={!p.household_id}>
            Ho condiviso, avanti
          </Button>
        </div>
      </div>
    </OnboardingShell>
  )
}
