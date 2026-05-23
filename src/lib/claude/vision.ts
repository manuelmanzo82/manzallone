// Vision analysis prompt + extracted-data schema.

export const VISION_MODEL = 'claude-sonnet-4-5-20250929'

export const VISION_SYSTEM_PROMPT = `Sei un assistente che analizza screenshot per estrarre dati di salute.

Identifica il TIPO di screenshot tra:
- workout_nike_running, workout_apple_fitness, workout_strava, workout_garmin, workout_polar, workout_other
- meal_label (etichetta nutrizionale di un prodotto confezionato)
- meal_photo (foto di un piatto/cibo)
- scale_smart (bilancia smart con peso e composizione corporea)
- other (qualsiasi altro tipo)

Restituisci ESCLUSIVAMENTE un singolo oggetto JSON valido, senza preamboli, senza markdown, senza backtick, senza commenti.

Schema per tipo:
- workout_*: {"screenshot_type":"...","data":{"type":"Corsa","distance_km":5.2,"duration_min":30,"calories_burned":420,"pace":"5:46/km","hr_avg":150,"hr_max":172,"date":"2026-05-23"}} — usa null per campi non visibili.
- meal_label: {"screenshot_type":"meal_label","data":{"product_name":"...","kcal_per_100g":250,"protein":12.5,"carbs":30,"fat":8,"fiber":4,"portion_size_g":40}}
- meal_photo: {"screenshot_type":"meal_photo","data":{"dish_description":"...","estimated_items":[{"name":"pollo","estimated_quantity_g":150,"kcal":250}],"total_kcal_estimate":700}}
- scale_smart: {"screenshot_type":"scale_smart","data":{"weight_kg":89.2,"body_fat_pct":22.1,"muscle_mass_kg":62.3,"water_pct":55.4,"visceral_fat":9,"date":"2026-05-23"}}
- other: {"screenshot_type":"other","data":{"description":"...","useful_data":"testo libero descrittivo"}}

Se i dati sono parzialmente leggibili, includi quelli che riesci a leggere e usa null per il resto.
Se l'immagine non è interpretabile, usa {"screenshot_type":"other","data":{"description":"immagine non interpretabile","useful_data":""}}.`

export interface ExtractedWorkout {
  type: string | null
  distance_km: number | null
  duration_min: number | null
  calories_burned: number | null
  pace: string | null
  hr_avg: number | null
  hr_max: number | null
  date: string | null
}
export interface ExtractedMealLabel {
  product_name: string | null
  kcal_per_100g: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  fiber: number | null
  portion_size_g: number | null
}
export interface ExtractedMealPhoto {
  dish_description: string | null
  estimated_items: { name: string; estimated_quantity_g: number; kcal: number }[]
  total_kcal_estimate: number | null
}
export interface ExtractedScale {
  weight_kg: number | null
  body_fat_pct: number | null
  muscle_mass_kg: number | null
  water_pct: number | null
  visceral_fat: number | null
  date: string | null
}
export interface ExtractedOther {
  description: string | null
  useful_data: string | null
}

export type VisionExtraction =
  | { screenshot_type: `workout_${string}`; data: ExtractedWorkout }
  | { screenshot_type: 'meal_label';        data: ExtractedMealLabel }
  | { screenshot_type: 'meal_photo';        data: ExtractedMealPhoto }
  | { screenshot_type: 'scale_smart';       data: ExtractedScale }
  | { screenshot_type: 'other';             data: ExtractedOther }

export function parseVisionResponse(raw: string): VisionExtraction | null {
  // Be tolerant: strip optional markdown fences if the model put them in.
  let text = raw.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  }
  try {
    const obj = JSON.parse(text) as VisionExtraction
    if (!obj || typeof obj !== 'object' || !('screenshot_type' in obj)) return null
    return obj
  } catch {
    return null
  }
}
