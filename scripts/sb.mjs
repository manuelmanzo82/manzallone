#!/usr/bin/env node
// Wrapper for `supabase` CLI that injects --db-url from .env.local.
// Usage:  node scripts/sb.mjs db push --yes
//         node scripts/sb.mjs gen types typescript

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const envFile = '.env.local'
if (existsSync(envFile)) {
  try {
    process.loadEnvFile(envFile)
  } catch (e) {
    console.error(`Failed to load ${envFile}: ${e.message}`)
    process.exit(1)
  }
} else {
  console.error(`Missing ${envFile} - copy from .env.local.example and fill in values.`)
  process.exit(1)
}

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error('SUPABASE_DB_URL not set in .env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
if (!args.includes('--db-url')) {
  args.push('--db-url', dbUrl)
}

const child = spawn('supabase', args, { stdio: 'inherit', shell: true })
child.on('close', code => process.exit(code ?? 0))
