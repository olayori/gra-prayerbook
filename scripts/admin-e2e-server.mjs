#!/usr/bin/env node
// Builds the app against the LOCAL Supabase stack and serves it on :4310, for the admin
// browser tests (npm run test:admin). Never points at production.
import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { localSupabase } from './lib/local-supabase.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const { API_URL, ANON_KEY } = localSupabase()
const env = { ...process.env, VITE_SUPABASE_URL: API_URL, VITE_SUPABASE_ANON_KEY: ANON_KEY }
execFileSync('npx', ['-w', 'app', 'vite', 'build', '--outDir', 'dist-local', '--emptyOutDir'], { cwd: root, env, stdio: 'inherit' })
spawn('npx', ['-w', 'app', 'vite', 'preview', '--outDir', 'dist-local', '--port', '4310', '--strictPort'], { cwd: root, env, stdio: 'inherit' })
