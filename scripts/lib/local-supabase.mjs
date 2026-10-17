// Settings of the local Supabase stack (npm run db:start), for the admin browser tests.
import { execFileSync } from 'node:child_process'

let cached
export function localSupabase() {
  if (cached) return cached
  const out = execFileSync('npx', ['--no-install', 'supabase', 'status', '-o', 'env'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  const env = Object.fromEntries(out.split('\n').filter((l) => l.includes('=')).map((l) => {
    const i = l.indexOf('=')
    return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]
  }))
  if (!env.API_URL || !env.ANON_KEY) throw new Error('Local Supabase is not running. Start Docker Desktop, then: npm run db:start')
  cached = env
  return env
}

// Runs SQL on the local database and returns psql's unaligned output.
export function localSql(sql) {
  return execFileSync('psql', [localSupabase().DB_URL, '-X', '-q', '-t', '-A', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' }).trim()
}
