// Tool definitions exposed to Claude via Anthropic Messages API (function calling).
// Each tool maps to a Supabase RPC or direct table operation executed in `executeTool`.

import type Anthropic from '@anthropic-ai/sdk'

export type ChatTool = Anthropic.Messages.Tool

export const chatTools: ChatTool[] = [
  {
    name: 'log_weight',
    description:
      'Registra la pesata del giorno. Aggiorna profiles.current_weight e ricalcola i target calorici se delta vs ultima pesata di calibrazione > 0.5 kg. Restituisce { weight_id, recalculated }. Usalo quando l\'utente comunica un valore di peso (es. "peso 89.0", "mi sono pesato 88.7").',
    input_schema: {
      type: 'object',
      properties: {
        weight_kg: {
          type: 'number',
          description: 'Peso in kg, deve essere tra 30 e 250.',
        },
        notes: { type: 'string', description: 'Note opzionali (mattina/dopo bagno/etc).' },
      },
      required: ['weight_kg'],
    },
  },
  {
    name: 'record_meal',
    description:
      'Registra un pasto. Items è un array di { name, quantity_g }. Usa nomi italiani naturali (es. "petto di pollo", "yogurt greco zero", "pasta integrale"): il server fa risoluzione fuzzy contro food_catalog (235 alimenti). I totali kcal/macro vengono calcolati lato server. La response include unresolved_items: se non vuoto, segnala all\'utente che non hai trovato match preciso. meal_type deve essere coerente con l\'ora corrente (vedi contesto temporale).',
    input_schema: {
      type: 'object',
      properties: {
        meal_type: {
          type: 'string',
          enum: ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack'],
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Nome alimento (italiano, minuscolo).' },
              quantity_g: { type: 'number', description: 'Grammatura in grammi.' },
            },
            required: ['name', 'quantity_g'],
          },
        },
        location: {
          type: 'string',
          enum: ['home', 'restaurant', 'work', 'outdoors', 'other'],
        },
        notes: { type: 'string' },
      },
      required: ['meal_type', 'items'],
    },
  },
  {
    name: 'log_water',
    description: 'Registra acqua bevuta in ml. Usa per "bevuto 250 ml" o "un bicchiere d\'acqua" (~250 ml).',
    input_schema: {
      type: 'object',
      properties: {
        ml: { type: 'number', description: 'Quantità in millilitri.' },
      },
      required: ['ml'],
    },
  },
  {
    name: 'log_workout',
    description: 'Registra un allenamento. duration_min obbligatorio. type esempi: "corsa", "palestra", "camminata", "ciclismo", "calcetto".',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        duration_min: { type: 'number' },
        distance_km: { type: 'number' },
        calories_burned: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['type', 'duration_min'],
    },
  },
  {
    name: 'suggest_next_meal',
    description:
      'Genera suggerimento per il prossimo pasto. Restituisce meal_type derivato dall\'ora, macros target rimanenti, e liste candidate (proteins/carbs/veggies) dal food_catalog filtrate per loves/hates dell\'utente. Usa il risultato per formulare 2-3 opzioni concrete con grammature ed espresse in italiano discorsivo.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'query_food',
    description: 'Cerca un alimento nel food_catalog per nome (ricerca fuzzy). Restituisce info nutrizionali per 100g e porzione di default.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'query_daily_status',
    description: 'Restituisce lo snapshot della giornata corrente: consumed/remaining/percentage per kcal, proteine, carb, grassi, acqua. Usalo se ti serve info aggiornata dopo aver registrato qualcosa o se l\'utente chiede "come sto oggi".',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
]

export const toolNames = chatTools.map((t) => t.name)
