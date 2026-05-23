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
      'Registra un pasto. Items è un array di { name, quantity_g }. Usa nomi italiani naturali (es. "petto di pollo", "yogurt greco zero", "pasta integrale"): il server fa risoluzione fuzzy contro food_catalog (235 alimenti). I totali kcal/macro vengono calcolati lato server. La response include unresolved_items: se non vuoto, segnala all\'utente che non hai trovato match preciso. meal_type deve essere coerente con l\'ora corrente.\n\nMULTI-MEMBRO: se l\'utente dice esplicitamente che un pasto è anche per un altro membro dell\'household (es. "stasera io e Carmen mangiamo X", "ho preso uno yogurt per Carmen"), passa for_members con i nomi/ruoli citati. Il server risolve i nomi a profili dello stesso household e crea N righe pasto collegate dallo stesso shared_meal_id quando i target sono più di uno. include_self=false se l\'utente ha preso/cucinato qualcosa SOLO per l\'altro senza mangiarlo lui.',
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
        for_members: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Nomi (primo nome o nome completo) o ruoli (partner, compagna, ...) di altri membri household per cui registrare lo stesso pasto. Esempio: ["Carmen"]. Lascia vuoto per registrare solo per l\'utente attuale.',
        },
        include_self: {
          type: 'boolean',
          description:
            'Default true: se for_members è impostato, registra anche per l\'utente attuale. Imposta false se il pasto era SOLO per gli altri membri (es. "ho preso uno yogurt per Carmen, io non l\'ho mangiato").',
        },
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
  {
    name: 'query_household_member_status',
    description:
      'Restituisce lo snapshot della giornata di un ALTRO membro dell\'household (kcal/macro/acqua + pasti contati). Da usare se l\'utente chiede "come sta X oggi", "quanti pasti ha fatto X", "X ha mangiato a pranzo?". Non accede MAI alla chat o ai messaggi del membro, solo dati strutturati. Richiede consenso (privacy_prefs.share_stats sul target). Restituisce { error: "not_authorized" } se non autorizzato.',
    input_schema: {
      type: 'object',
      properties: {
        member_name: {
          type: 'string',
          description:
            'Nome (anche solo il primo nome) o ruolo (partner, compagna, ...) del membro household.',
        },
      },
      required: ['member_name'],
    },
  },
]

export const toolNames = chatTools.map((t) => t.name)
