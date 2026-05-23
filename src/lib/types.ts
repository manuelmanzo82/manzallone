// ManzAllone v2 - shared TypeScript types mirroring the public schema.
// Regenerate from DB with: npm run supabase:gen-types (writes database.types.ts).
// These are hand-written, lighter shapes for app code.

export type Sex = 'male' | 'female' | 'other'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'lose' | 'maintain' | 'gain' | 'health' | 'performance'
export type CoachTone = 'direct' | 'gentle' | 'playful' | 'tough'
export type CoachStrictness = 'strict' | 'flexible' | 'mixed'
export type MealType = 'breakfast' | 'morning_snack' | 'lunch' | 'afternoon_snack' | 'dinner' | 'evening_snack'
export type MealLocation = 'home' | 'restaurant' | 'work' | 'outdoors' | 'other'
export type MealSource = 'manual' | 'claude' | 'screenshot' | 'voice' | 'suggested'
export type PreferenceLevel = 'love' | 'like' | 'neutral' | 'dislike' | 'hate' | 'avoid' | 'allergy'

export type FoodCategory =
  | 'proteine_animali'
  | 'proteine_vegetali'
  | 'carboidrati'
  | 'verdure'
  | 'frutta'
  | 'latticini'
  | 'grassi_buoni'
  | 'snack_dolci'
  | 'bevande_nonalcoliche'
  | 'alcolici'

export interface Household {
  id: string
  name: string
  invite_code: string | null
  created_by: string | null
  created_at: string
}

export interface MacroSplit {
  protein: number
  carbs: number
  fat: number
}

export interface PrivacyPrefs {
  share_weight: boolean
  share_meals: boolean
  share_workouts: boolean
  share_stats: boolean
}

export interface Profile {
  id: string
  household_id: string | null
  name: string | null
  age: number | null
  height_cm: number | null
  sex: Sex | null
  current_weight: number | null
  target_weight: number | null
  target_date: string | null
  activity_level: ActivityLevel | null
  goal: Goal | null
  daily_calorie_target: number | null
  daily_protein_target_g: number | null
  daily_carbs_target_g: number | null
  daily_fat_target_g: number | null
  daily_water_ml_target: number
  macro_split: MacroSplit
  food_loves: string[]
  food_hates: string[]
  allergies: string[]
  notification_prefs: Record<string, unknown>
  privacy_prefs: PrivacyPrefs
  coach_tone: CoachTone
  coach_strictness: CoachStrictness
  onboarding_completed: boolean
  onboarding_step: string | null
  onboarding_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface FoodItem {
  id: string
  name: string
  display_name: string | null
  category: FoodCategory | null
  subcategory: string | null
  avg_kcal_100g: number | null
  avg_protein_100g: number | null
  avg_carbs_100g: number | null
  avg_fat_100g: number | null
  avg_fiber_100g: number | null
  glycemic_index: number | null
  default_portion_g: number | null
  default_portion_unit: string | null
  aliases: string[]
  is_system: boolean
  validation_count: number
  created_at: string
}

export interface FoodPreference {
  id: string
  user_id: string
  food_id: string
  preference: PreferenceLevel
  source: string
  confidence: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MealItem {
  food_id?: string
  name?: string
  display_name?: string | null
  quantity_g: number
  kcal?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
}

export interface Meal {
  id: string
  user_id: string
  meal_type: MealType | null
  recorded_at: string
  items: MealItem[]
  total_kcal: number | null
  total_protein: number | null
  total_carbs: number | null
  total_fat: number | null
  total_fiber: number | null
  location: MealLocation | null
  notes: string | null
  photo_url: string | null
  source: MealSource
  shared_meal_id: string | null
  was_suggested: boolean
  suggestion_followed: boolean | null
}

export interface Weight {
  id: string
  user_id: string
  weight_kg: number
  body_fat: number | null
  muscle_mass: number | null
  recorded_at: string
  notes: string | null
  source: string
}

export interface Workout {
  id: string
  user_id: string
  type: string | null
  duration_min: number | null
  distance_km: number | null
  calories_burned: number | null
  pace: string | null
  hr_avg: number | null
  hr_max: number | null
  details: Record<string, unknown>
  recorded_at: string
  notes: string | null
  screenshot_url: string | null
  source: string
  shared_workout_id: string | null
}

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface DailyStatus {
  date: string
  targets: Macros & { water_ml: number }
  consumed: Macros & { water_ml: number }
  remaining: Macros & { water_ml: number }
  percentage: Macros & { water_ml: number }
  error?: string
}

export interface RemainingMacros {
  meal_type: MealType
  pct_of_day: number
  target: Macros
  remaining_day: Macros
  error?: string
}

export interface MealSuggestionCandidates {
  proteins: FoodItem[]
  carbs: FoodItem[]
  veggies: FoodItem[]
}

export interface MealSuggestion {
  meal_type: MealType
  macros: RemainingMacros
  candidate_foods: MealSuggestionCandidates
  error?: string
}

export interface UIComponent {
  type: string
  props?: Record<string, unknown>
  children?: UIComponent[] | string
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string | null
  ui_components: UIComponent[] | null
  context_snapshot: Record<string, unknown> | null
  actions_taken: Record<string, unknown> | null
  created_at: string
}
