import { supabase } from '../../lib/supabase.ts'
import type { Week } from './week.ts'

// RLS only returns weeks whose publish_at has passed; the filters mirror the design's query.
export async function fetchWeeks(): Promise<Week[]> {
  const { data, error } = await supabase
    .from('weekly_prayers')
    .select('week_of, title, intro, prayers, closing')
    .not('publish_at', 'is', null)
    .lte('publish_at', new Date().toISOString())
    .order('week_of', { ascending: false })
  if (error) throw error
  return data as Week[]
}
