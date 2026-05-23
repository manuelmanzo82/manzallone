import type { FoodCategory } from '@/lib/types'

export const SECTION_KEYS = [
  'welcome',
  'anagrafica',
  'obiettivi',
  'abitudini',
  'preferenze',
  'idratazione_attivita',
  'sonno_benessere',
  'notifiche',
  'personalita_coach',
  'partner',
  'riepilogo',
] as const

export type SectionKey = (typeof SECTION_KEYS)[number]

export const SECTION_TITLES: Record<SectionKey, string> = {
  welcome: 'Benvenuto',
  anagrafica: 'Anagrafica',
  obiettivi: 'Obiettivi',
  abitudini: 'Abitudini alimentari',
  preferenze: 'Preferenze alimentari',
  idratazione_attivita: 'Idratazione e attività',
  sonno_benessere: 'Sonno e benessere',
  notifiche: 'Notifiche',
  personalita_coach: 'Personalità del coach',
  partner: 'Partner e famiglia',
  riepilogo: 'Riepilogo',
}

export interface AnagraficaData {
  name: string
  age: number | null
  sex: 'male' | 'female' | 'other' | null
  height_cm: number | null
  current_weight: number | null
}

export interface ObiettiviData {
  goal: 'lose' | 'maintain' | 'gain' | 'health' | 'performance' | null
  target_weight: number | null
  target_date: string | null
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null
  conditions: string
  no_conditions: boolean
}

export type MealKey =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'afternoon_snack'
  | 'dinner'
  | 'evening_snack'

export interface MealSchedule {
  enabled: boolean
  time: string
  examples: string
}

export interface AbitudiniData {
  meals_per_day: '3' | '4' | '5' | 'variable' | null
  meal_schedules: Record<MealKey, MealSchedule>
  eat_where: 'home' | 'restaurant' | 'mix' | 'office' | null
}

export interface PreferenzeData {
  preferences: Record<string, 'love' | 'hate'>
  custom_foods_added: Partial<Record<FoodCategory, string[]>>
  allergies: string[]
}

export interface ActivityEntry {
  name: string
  freq_per_week: number
  duration_min: number
}

export interface IdratazioneAttivitaData {
  water_l: number
  beverages: {
    coffee: boolean
    coffee_cups_per_day: number
    tea: boolean
    wine: boolean
    wine_glasses_per_week: number
    beer: boolean
    soda: boolean
    other: string
  }
  activities: ActivityEntry[]
  apps: string[]
  wearables: string
}

export interface SonnoBenessereData {
  sleep_time: string
  wake_time: string
  sleep_quality: number
  supplements: string
}

export type ReminderKey =
  | 'peso_mattutino'
  | 'colazione'
  | 'spuntino_mat'
  | 'pranzo'
  | 'spuntino_pom'
  | 'cena'
  | 'riepilogo_serale'

export interface ReminderConfig {
  enabled: boolean
  time: string
}

export interface NotificheData {
  reminders: Record<ReminderKey, ReminderConfig>
  pause_days: number[]
}

export interface PersonalitaCoachData {
  coach_tone: 'direct' | 'motivating' | 'technical' | 'friendly' | 'mixed' | null
  slip_tone: 'understanding' | 'realist' | 'strict' | null
  proactive: 'always' | 'on_slip' | 'on_demand' | null
  strict_mode: boolean
}

export interface PartnerData {
  household_id: string | null
  household_name: string
  invite_code: string | null
  privacy_prefs: {
    share_weight: boolean
    share_meals: boolean
    share_workouts: boolean
    share_stats: boolean
  }
}

export interface OnboardingData {
  anagrafica: AnagraficaData
  obiettivi: ObiettiviData
  abitudini: AbitudiniData
  preferenze: PreferenzeData
  idratazione_attivita: IdratazioneAttivitaData
  sonno_benessere: SonnoBenessereData
  notifiche: NotificheData
  personalita_coach: PersonalitaCoachData
  partner: PartnerData
}

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  anagrafica: { name: '', age: null, sex: null, height_cm: null, current_weight: null },
  obiettivi: {
    goal: null,
    target_weight: null,
    target_date: null,
    activity_level: null,
    conditions: '',
    no_conditions: false,
  },
  abitudini: {
    meals_per_day: null,
    meal_schedules: {
      breakfast: { enabled: true, time: '08:00', examples: '' },
      morning_snack: { enabled: false, time: '10:30', examples: '' },
      lunch: { enabled: true, time: '13:00', examples: '' },
      afternoon_snack: { enabled: false, time: '16:30', examples: '' },
      dinner: { enabled: true, time: '20:00', examples: '' },
      evening_snack: { enabled: false, time: '22:00', examples: '' },
    },
    eat_where: null,
  },
  preferenze: { preferences: {}, custom_foods_added: {}, allergies: [] },
  idratazione_attivita: {
    water_l: 2,
    beverages: {
      coffee: false,
      coffee_cups_per_day: 2,
      tea: false,
      wine: false,
      wine_glasses_per_week: 2,
      beer: false,
      soda: false,
      other: '',
    },
    activities: [],
    apps: [],
    wearables: '',
  },
  sonno_benessere: { sleep_time: '23:30', wake_time: '07:00', sleep_quality: 3, supplements: '' },
  notifiche: {
    reminders: {
      peso_mattutino: { enabled: true, time: '07:30' },
      colazione: { enabled: true, time: '08:00' },
      spuntino_mat: { enabled: false, time: '10:30' },
      pranzo: { enabled: true, time: '13:00' },
      spuntino_pom: { enabled: false, time: '16:30' },
      cena: { enabled: true, time: '20:00' },
      riepilogo_serale: { enabled: true, time: '22:00' },
    },
    pause_days: [],
  },
  personalita_coach: {
    coach_tone: null,
    slip_tone: null,
    proactive: null,
    strict_mode: true,
  },
  partner: {
    household_id: null,
    household_name: 'Famiglia Manzo',
    invite_code: null,
    privacy_prefs: {
      share_weight: true,
      share_meals: true,
      share_workouts: true,
      share_stats: true,
    },
  },
}

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  proteine_animali: 'Proteine animali',
  proteine_vegetali: 'Proteine vegetali',
  carboidrati: 'Carboidrati',
  verdure: 'Verdure',
  frutta: 'Frutta',
  latticini: 'Latticini',
  grassi_buoni: 'Grassi buoni',
  snack_dolci: 'Snack e dolci',
  bevande_nonalcoliche: 'Bevande',
  alcolici: 'Alcolici',
}

export const FOOD_CATEGORY_ORDER: FoodCategory[] = [
  'proteine_animali',
  'proteine_vegetali',
  'carboidrati',
  'verdure',
  'frutta',
  'latticini',
  'grassi_buoni',
  'snack_dolci',
  'bevande_nonalcoliche',
  'alcolici',
]

export const COMMON_ALLERGIES = [
  'glutine',
  'lattosio',
  'frutta a guscio',
  'uova',
  'pesce',
  'crostacei',
  'soia',
  'sesamo',
  'altro',
] as const
