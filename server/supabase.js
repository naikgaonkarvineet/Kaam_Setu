import { createClient } from '@supabase/supabase-js'
import process from 'node:process'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
export const db = url && key ? createClient(url, key) : null

export function requireDatabase(_, res, next) {
  if (!db) return res.status(503).json({ error: 'Supabase is not configured.' })
  next()
}
