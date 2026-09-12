import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// The app remains usable as a scripted demo until a Supabase project is configured.
export const supabase = url && key ? createClient(url, key) : null

export async function loadOpenJobs() {
  if (!supabase) return null
  const { data, error } = await supabase.from('jobs').select('*, users!jobs_employer_id_fkey(name)').eq('status', 'open').order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addWageEntry(entry) {
  if (!supabase) return null
  const { data, error } = await supabase.from('wage_entries').insert(entry).select().single()
  if (error) throw error
  return data
}
