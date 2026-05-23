// Client-side mirror of the SQL nutrition functions (recalculate_targets etc).
// Useful for live onboarding UI feedback before committing to DB.

import type { ActivityLevel, Goal, Sex, MealType, Macros } from '@/lib/types'

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const MEAL_DISTRIBUTION: Record<MealType, number> = {
  breakfast: 0.25,
  morning_snack: 0.10,
  lunch: 0.35,
  afternoon_snack: 0.10,
  dinner: 0.20,
  evening_snack: 0.05,
}

const GOAL_CALORIE_OFFSET: Record<Goal, number> = {
  lose: -500,
  gain: +300,
  maintain: 0,
  health: 0,
  performance: +200,
}

const PROTEIN_PER_KG: Record<Goal, number> = {
  lose: 1.8,
  gain: 1.8,
  maintain: 1.4,
  health: 1.4,
  performance: 1.8,
}

const FAT_PER_KG = 0.8

export interface BMRInput {
  weightKg: number
  heightCm: number
  age: number
  sex: Sex
}

export interface TargetsInput extends BMRInput {
  activityLevel: ActivityLevel
  goal: Goal
}

export interface DailyTargets {
  bmr: number
  tdee: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export function bmr({ weightKg, heightCm, age, sex }: BMRInput): number {
  // Mifflin-St Jeor
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

export function tdee(input: TargetsInput): number {
  const mult = ACTIVITY_MULTIPLIER[input.activityLevel]
  return Math.round(bmr(input) * mult)
}

export function computeDailyTargets(input: TargetsInput): DailyTargets {
  const baseBmr = bmr(input)
  const baseTdee = tdee(input)
  const kcal = baseTdee + GOAL_CALORIE_OFFSET[input.goal]
  const protein_g = round1(PROTEIN_PER_KG[input.goal] * input.weightKg)
  const fat_g = round1(FAT_PER_KG * input.weightKg)
  const carbs_g = Math.max(round1((kcal - protein_g * 4 - fat_g * 9) / 4), 0)

  return {
    bmr: baseBmr,
    tdee: baseTdee,
    kcal: Math.round(kcal),
    protein_g,
    carbs_g,
    fat_g,
  }
}

export function macroSplitForMeal(mealType: MealType, dailyTargets: Macros): Macros {
  const pct = MEAL_DISTRIBUTION[mealType] ?? 0.20
  return {
    kcal: Math.round(dailyTargets.kcal * pct),
    protein: round1(dailyTargets.protein * pct),
    carbs: round1(dailyTargets.carbs * pct),
    fat: round1(dailyTargets.fat * pct),
  }
}

export function mealTypeFromHour(hour: number): MealType {
  if (hour >= 6  && hour < 10) return 'breakfast'
  if (hour >= 10 && hour < 12) return 'morning_snack'
  if (hour >= 12 && hour < 15) return 'lunch'
  if (hour >= 15 && hour < 18) return 'afternoon_snack'
  if (hour >= 18 && hour < 22) return 'dinner'
  return 'evening_snack'
}

// ---------- Formatters ----------

export function formatMacro(grams: number | null | undefined, withUnit = true): string {
  if (grams == null) return withUnit ? '—g' : '—'
  return withUnit ? `${round1(grams)}g` : `${round1(grams)}`
}

export function formatKcal(kcal: number | null | undefined): string {
  if (kcal == null) return '— kcal'
  return `${Math.round(kcal)} kcal`
}

export function formatPercentage(value: number | null | undefined): string {
  if (value == null) return '—%'
  return `${round1(value)}%`
}

export function formatWaterMl(ml: number | null | undefined): string {
  if (ml == null) return '— ml'
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`
  return `${Math.round(ml)} ml`
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
