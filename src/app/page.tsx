import { createAdminClient } from '@/lib/supabase/admin'

const EXPECTED_TABLES = [
  'households', 'profiles', 'food_catalog', 'profile_food_preferences',
  'weights', 'meals', 'water', 'workouts', 'sleep', 'supplements',
  'conversations', 'messages',
  'frequent_foods', 'user_insights', 'user_story',
  'push_subscriptions', 'notification_schedule',
  'daily_targets_history', 'meal_suggestions_log',
] as const

const EXPECTED_RPCS = [
  'get_daily_status',
  'get_remaining_macros_for_meal',
  'recalculate_targets',
  'log_weight_and_recalculate',
  'suggest_next_meal',
  'record_meal_with_totals',
  'generate_invite_code',
  'create_household_with_invite',
  'join_household',
] as const

type Check = { name: string; ok: boolean; detail: string }

async function runChecks(): Promise<{ checks: Check[]; foodCount: number | null }> {
  const checks: Check[] = []
  let foodCount: number | null = null

  // 1. Env vars
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  checks.push({
    name: 'ENV configured',
    ok: hasUrl && hasAnon && hasService,
    detail: `URL=${hasUrl ? 'ok' : 'missing'}, anon=${hasAnon ? 'ok' : 'missing'}, service=${hasService ? 'ok' : 'missing'}`,
  })
  if (!hasUrl || !hasService) return { checks, foodCount }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (e) {
    checks.push({ name: 'Admin client', ok: false, detail: String(e) })
    return { checks, foodCount }
  }

  // 2. Reach Supabase
  try {
    const { error } = await admin.from('food_catalog').select('id', { head: true, count: 'exact' }).limit(1)
    checks.push({
      name: 'Supabase reachable',
      ok: !error,
      detail: error?.message ?? 'connection ok',
    })
  } catch (e) {
    checks.push({ name: 'Supabase reachable', ok: false, detail: String(e) })
    return { checks, foodCount }
  }

  // 3. food_catalog count
  try {
    const { count, error } = await admin
      .from('food_catalog')
      .select('id', { head: true, count: 'exact' })
    foodCount = count ?? null
    checks.push({
      name: 'food_catalog seeded',
      ok: !error && (count ?? 0) >= 200,
      detail: error?.message ?? `${count ?? 0} items (target ≥ 200)`,
    })
  } catch (e) {
    checks.push({ name: 'food_catalog seeded', ok: false, detail: String(e) })
  }

  // 4. All expected tables exist
  try {
    const checks_results: { table: string; ok: boolean }[] = []
    for (const t of EXPECTED_TABLES) {
      const { error } = await admin.from(t).select('*', { head: true, count: 'exact' }).limit(1)
      checks_results.push({ table: t, ok: !error })
    }
    const missing = checks_results.filter(r => !r.ok).map(r => r.table)
    checks.push({
      name: `Tables (${EXPECTED_TABLES.length} expected)`,
      ok: missing.length === 0,
      detail: missing.length === 0 ? 'all present' : `missing: ${missing.join(', ')}`,
    })
  } catch (e) {
    checks.push({ name: 'Tables exist', ok: false, detail: String(e) })
  }

  // 5. RPC: get_daily_status — call with dummy uuid, expect "profile_not_found"
  try {
    const dummyUuid = '00000000-0000-0000-0000-000000000000'
    const { data, error } = await admin.rpc('get_daily_status', {
      p_user_id: dummyUuid,
    })
    const looksRight =
      !error && data && typeof data === 'object' && 'error' in data && data.error === 'profile_not_found'
    checks.push({
      name: 'RPC get_daily_status',
      ok: !!looksRight,
      detail: error?.message ?? JSON.stringify(data).slice(0, 80),
    })
  } catch (e) {
    checks.push({ name: 'RPC get_daily_status', ok: false, detail: String(e) })
  }

  // 6. RPC: get_remaining_macros_for_meal
  try {
    const dummyUuid = '00000000-0000-0000-0000-000000000000'
    const { data, error } = await admin.rpc('get_remaining_macros_for_meal', {
      p_user_id: dummyUuid,
      p_meal_type: 'lunch',
    })
    const looksRight =
      !error && data && typeof data === 'object' && 'error' in data && data.error === 'profile_not_found'
    checks.push({
      name: 'RPC get_remaining_macros_for_meal',
      ok: !!looksRight,
      detail: error?.message ?? JSON.stringify(data).slice(0, 80),
    })
  } catch (e) {
    checks.push({ name: 'RPC get_remaining_macros_for_meal', ok: false, detail: String(e) })
  }

  // 7. All expected RPCs are callable (we already tested 2, ping the rest with bogus args)
  for (const rpc of EXPECTED_RPCS.slice(2)) {
    try {
      const { error } = await admin.rpc(rpc as never, {} as never)
      const exists = !error || (error.code !== '42883' && !/does not exist/i.test(error.message))
      checks.push({
        name: `RPC ${rpc}`,
        ok: exists,
        detail: error ? error.message.slice(0, 100) : 'callable',
      })
    } catch (e) {
      checks.push({ name: `RPC ${rpc}`, ok: false, detail: String(e) })
    }
  }

  return { checks, foodCount }
}

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { checks, foodCount } = await runChecks()
  const allOk = checks.every(c => c.ok)

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-warm-900 dark:text-warm-50">
          ManzAllone <span className="text-primary-600">v2</span>{' '}
          {allOk ? (
            <span className="text-success-500">ready</span>
          ) : (
            <span className="text-danger-500">setup incomplete</span>
          )}
        </h1>
        <p className="mt-3 text-warm-600 dark:text-warm-400">
          PWA conversazionale - coaching adattivo rigido. Build foundation check.
        </p>

        <div className="mt-8 grid gap-2 rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 p-4">
          {checks.map((c, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-warm-50 dark:hover:bg-warm-700"
            >
              <span
                className={`mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  c.ok ? 'bg-success-500 text-white' : 'bg-danger-500 text-white'
                }`}
              >
                {c.ok ? '✓' : '✗'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-warm-900 dark:text-warm-100">{c.name}</div>
                <div className="text-sm text-warm-500 dark:text-warm-400 break-all">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>

        {foodCount !== null && (
          <div className="mt-6 rounded-xl bg-primary-50 dark:bg-primary-900/30 p-4 text-primary-800 dark:text-primary-200">
            <div className="text-sm">food_catalog</div>
            <div className="text-2xl font-semibold">{foodCount} alimenti</div>
          </div>
        )}

        <p className="mt-8 text-sm text-warm-500">
          Branch: <code className="rounded bg-warm-100 dark:bg-warm-700 px-1.5 py-0.5">v2</code> ·
          {' '}Next.js 16 · Tailwind v4 · Supabase
        </p>
      </div>
    </main>
  )
}
