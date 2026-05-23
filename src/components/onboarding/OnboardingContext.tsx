'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  DEFAULT_ONBOARDING_DATA,
  SECTION_KEYS,
  type OnboardingData,
  type SectionKey,
} from '@/lib/onboarding/types'
import {
  completeOnboarding as completeOnboardingAction,
  saveAndExit as saveAndExitAction,
  saveSectionProgress,
} from '@/lib/onboarding/actions'
import type { FoodItem } from '@/lib/types'

interface OnboardingContextValue {
  data: OnboardingData
  setData: <K extends keyof OnboardingData>(section: K, patch: Partial<OnboardingData[K]>) => void
  replaceSection: <K extends keyof OnboardingData>(section: K, value: OnboardingData[K]) => void

  currentStepIndex: number
  currentStep: SectionKey
  totalSteps: number

  foodCatalog: FoodItem[]
  setFoodCatalog: (items: FoodItem[]) => void

  isSaving: boolean
  error: string | null

  goNext: () => Promise<void>
  goBack: () => void
  saveAndExit: () => Promise<void>
  finalize: () => Promise<
    | { ok: true; targets: { kcal: number; protein: number; carbs: number; fat: number; water_ml: number } }
    | { ok: false; error: string }
  >
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

interface OnboardingProviderProps {
  initialData: OnboardingData
  initialStep: SectionKey
  initialFoods: FoodItem[]
  children: ReactNode
}

function mergeWithDefaults(initial: Partial<OnboardingData> | null | undefined): OnboardingData {
  return {
    ...DEFAULT_ONBOARDING_DATA,
    ...(initial ?? {}),
    anagrafica: { ...DEFAULT_ONBOARDING_DATA.anagrafica, ...(initial?.anagrafica ?? {}) },
    obiettivi: { ...DEFAULT_ONBOARDING_DATA.obiettivi, ...(initial?.obiettivi ?? {}) },
    abitudini: {
      ...DEFAULT_ONBOARDING_DATA.abitudini,
      ...(initial?.abitudini ?? {}),
      meal_schedules: {
        ...DEFAULT_ONBOARDING_DATA.abitudini.meal_schedules,
        ...(initial?.abitudini?.meal_schedules ?? {}),
      },
    },
    preferenze: { ...DEFAULT_ONBOARDING_DATA.preferenze, ...(initial?.preferenze ?? {}) },
    idratazione_attivita: {
      ...DEFAULT_ONBOARDING_DATA.idratazione_attivita,
      ...(initial?.idratazione_attivita ?? {}),
      beverages: {
        ...DEFAULT_ONBOARDING_DATA.idratazione_attivita.beverages,
        ...(initial?.idratazione_attivita?.beverages ?? {}),
      },
    },
    sonno_benessere: {
      ...DEFAULT_ONBOARDING_DATA.sonno_benessere,
      ...(initial?.sonno_benessere ?? {}),
    },
    notifiche: {
      ...DEFAULT_ONBOARDING_DATA.notifiche,
      ...(initial?.notifiche ?? {}),
      reminders: {
        ...DEFAULT_ONBOARDING_DATA.notifiche.reminders,
        ...(initial?.notifiche?.reminders ?? {}),
      },
    },
    personalita_coach: {
      ...DEFAULT_ONBOARDING_DATA.personalita_coach,
      ...(initial?.personalita_coach ?? {}),
    },
    partner: {
      ...DEFAULT_ONBOARDING_DATA.partner,
      ...(initial?.partner ?? {}),
      privacy_prefs: {
        ...DEFAULT_ONBOARDING_DATA.partner.privacy_prefs,
        ...(initial?.partner?.privacy_prefs ?? {}),
      },
    },
  }
}

export function OnboardingProvider({
  initialData,
  initialStep,
  initialFoods,
  children,
}: OnboardingProviderProps) {
  const router = useRouter()
  const [data, setDataState] = useState<OnboardingData>(() => mergeWithDefaults(initialData))
  const [stepIndex, setStepIndex] = useState<number>(() =>
    Math.max(0, SECTION_KEYS.indexOf(initialStep))
  )
  const [foodCatalog, setFoodCatalog] = useState<FoodItem[]>(initialFoods)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const setData = useCallback(
    <K extends keyof OnboardingData>(section: K, patch: Partial<OnboardingData[K]>) => {
      setDataState((prev) => ({ ...prev, [section]: { ...prev[section], ...patch } }))
    },
    []
  )

  const replaceSection = useCallback(
    <K extends keyof OnboardingData>(section: K, value: OnboardingData[K]) => {
      setDataState((prev) => ({ ...prev, [section]: value }))
    },
    []
  )

  const currentStep = SECTION_KEYS[stepIndex]
  const totalSteps = SECTION_KEYS.length

  const goNext = useCallback(async () => {
    setError(null)
    const nextIndex = Math.min(stepIndex + 1, totalSteps - 1)
    const nextKey = SECTION_KEYS[nextIndex]
    startTransition(async () => {
      const result = await saveSectionProgress(nextKey, data)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setStepIndex(nextIndex)
    })
  }, [data, stepIndex, totalSteps])

  const goBack = useCallback(() => {
    setError(null)
    setStepIndex((i) => Math.max(0, i - 1))
  }, [])

  const saveAndExit = useCallback(async () => {
    setError(null)
    startTransition(async () => {
      const result = await saveAndExitAction(currentStep, data)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push('/onboarding?saved=1')
    })
  }, [currentStep, data, router])

  const finalize = useCallback(async () => {
    setError(null)
    const result = await completeOnboardingAction(data)
    if (!result.ok) {
      setError(result.error)
      return result
    }
    router.push('/')
    return result
  }, [data, router])

  const value = useMemo<OnboardingContextValue>(
    () => ({
      data,
      setData,
      replaceSection,
      currentStepIndex: stepIndex,
      currentStep,
      totalSteps,
      foodCatalog,
      setFoodCatalog,
      isSaving: pending,
      error,
      goNext,
      goBack,
      saveAndExit,
      finalize,
    }),
    [
      data,
      setData,
      replaceSection,
      stepIndex,
      currentStep,
      totalSteps,
      foodCatalog,
      pending,
      error,
      goNext,
      goBack,
      saveAndExit,
      finalize,
    ]
  )

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext)
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider')
  return ctx
}
