# ManzAllone v2

PWA conversazionale per tracking salute, nutrizione e fitness con **coaching adattivo in modalità rigida**.
Riscritta da zero a partire da v1 (Vite/React minimale) come Next.js 16 + App Router.

> Filosofia: ogni suggerimento ha grammature precise, kcal e macronutrienti esatti, e ogni pasto influenza il successivo in base al budget giornaliero rimanente.

## Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind v4 (CSS-based config via `@theme`)
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **AI**: Claude Sonnet 4.6 via `@anthropic-ai/sdk` (Edge Function)
- **PWA**: `web-push` per notifiche, service worker (TBD)
- **Forms**: `react-hook-form` + `zod`
- **Charts**: `recharts`
- **Auth**: Multi-utente con household condiviso (Manuel + Carmen)

## Coaching adattivo rigido - come funziona

1. **BMR/TDEE** calcolati con Mifflin-St Jeor a ogni `recalculate_targets()`. Snapshot storico in `daily_targets_history`.
2. **Target macro distribuiti per pasto** (`get_remaining_macros_for_meal`):
   colazione 25% · spuntino mat 10% · pranzo 35% · spuntino pom 10% · cena 20% · sera 5%
   clampati a quanto resta nel budget giornaliero residuo.
3. **`suggest_next_meal`** pesca da `food_catalog` filtrando per `food_loves`/`food_hates`/`allergies` del profilo.
4. **`record_meal_with_totals`** calcola in automatico kcal/macro per ogni item dalla porzione (g) × valori per 100g del catalogo, e aggiorna `frequent_foods` per personalizzare i suggerimenti.
5. **`log_weight_and_recalculate`** rifa il computo quando il peso varia di oltre 0.5 kg.

## Setup checklist (Windows / Manuel)

Prerequisiti già verificati: Node 22, npm 10, git, Supabase CLI 2.101.

```powershell
# 1. Dipendenze
npm install

# 2. Copia env
cp .env.local.example .env.local
# poi compila le variabili (già fatto in questo step)

# 3. (Opzionale) Verifica che le migration siano applicate al DB remoto
npm run supabase:push

# 4. Dev server
npm run dev   # http://localhost:3000
```

## Variabili d'ambiente

Tutte in `.env.local` (gitignored). Vedi `.env.local.example` per il template.

| Variabile | Scope | Dove |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server | Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | Dashboard → Project Settings → API |
| `SUPABASE_DB_URL` | scripts only | Dashboard → Database → Connection string (pooler, password percent-encoded) |
| `ANTHROPIC_API_KEY` | server-only | console.anthropic.com → Settings → Keys |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | push | `npx web-push generate-vapid-keys --json` |
| `VAPID_SUBJECT` | push | `mailto:manuelmanzo@live.it` |

## Comandi

### App
```
npm run dev          # next dev
npm run build        # next build
npm run start        # next start (production)
npm run lint         # eslint
```

### Supabase
Tutti gli script usano `SUPABASE_DB_URL` da `.env.local` via wrapper `scripts/sb.mjs`.

```
npm run supabase:start       # start locale (richiede Docker)
npm run supabase:stop        # stop locale
npm run supabase:reset       # reset DB locale + applica migrations + seed
npm run supabase:push        # applica migrations al DB remoto
npm run supabase:push:seed   # applica migrations + seed al remoto
npm run supabase:gen-types   # genera src/lib/database.types.ts (richiede Docker)
```

> **Nota**: `supabase gen types` e `supabase start` richiedono Docker Desktop su Windows. Per ora abbiamo solo i tipi hand-written in `src/lib/types.ts`; quando si installa Docker si può rigenerare `database.types.ts` per avere shape generati dallo schema.

## Schema DB (v2)

19 tabelle in `public`, tutte con RLS.

| Tabella | Scope | Nota |
|---|---|---|
| `households` | shared | Invite code `MANZO-XXXX` |
| `profiles` | per-user (1↔1 auth.users) | Target macro live, food_loves/hates, coach_tone/strictness |
| `food_catalog` | shared, autenticati | 235 alimenti italiani precaricati (CREA-INRAN) |
| `profile_food_preferences` | per-user | love/like/neutral/dislike/hate/avoid/allergy |
| `weights`, `sleep`, `supplements`, `water` | per-user | private |
| `meals`, `workouts` | per-user, condivisibili in household | `shared_meal_id`/`shared_workout_id` |
| `conversations`, `messages` | per-user | Chat con Claude, `ui_components` jsonb |
| `frequent_foods` | per-user | Aggregato auto da `record_meal_with_totals` |
| `user_insights`, `user_story` | per-user | Settimanali / mensili (pg_cron) |
| `push_subscriptions`, `notification_schedule` | per-user | Web Push |
| `daily_targets_history` | per-user | Snapshot ogni `recalculate_targets` |
| `meal_suggestions_log` | per-user | Per misurare adherence |

## RPC functions

Tutte `SECURITY DEFINER`, granted ad `authenticated`.

| Function | Signature | Cosa fa |
|---|---|---|
| `get_daily_status(p_user_id, p_date)` | → jsonb | Targets/consumed/remaining/% per kcal+macro+water |
| `get_remaining_macros_for_meal(p_user_id, p_meal_type)` | → jsonb | Slice del giorno per il pasto, clampato a residuo |
| `recalculate_targets(p_user_id, p_reason)` | → void | Mifflin-St Jeor + activity + goal; salva history |
| `log_weight_and_recalculate(p_user_id, p_weight, p_notes)` | → jsonb | Insert weight + recalc se Δ>0.5 kg |
| `suggest_next_meal(p_user_id)` | → jsonb | meal_type da ora attuale + macro target + candidati food |
| `record_meal_with_totals(p_user_id, p_meal_type, p_items, p_location, p_notes, p_source)` | → uuid | Calcola totali da catalogo + insert + update frequent_foods |
| `generate_invite_code()` | → text | `MANZO-XXXX` unico |
| `create_household_with_invite(p_name)` | → households | Crea household + attach profilo creatore |
| `join_household(p_invite_code)` | → boolean | Aggiunge utente all'household |
| `current_user_household_id()` | → uuid | Helper per RLS (evita ricorsione) |

## Storia del branch

- `main`: v1 originale (Vite/React)
- `v2`: questa riscrittura. Tag `v1-snapshot` su commit `a15dc4e` (ultimo lavoro v1 in `v2` prima del wipe).
