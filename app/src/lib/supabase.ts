import { createClient } from '@supabase/supabase-js'

// Public client config: the anon key ships in every page by design, and RLS protects
// the data. Override with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (e.g. a staging
// project). Never put the service-role key in the app.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://sjcosqxtgllfwldhnoax.supabase.co'
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqY29zcXh0Z2xsZndsZGhub2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NTQ5MjYsImV4cCI6MjEwNzQzMDkyNn0.HQsm-M6Ut1RHoXtDHEIjiCvPQq-P3irRh0uHgQ3lFx0'

export const supabase = createClient(url, anonKey)
