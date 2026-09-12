import { Router } from 'express'
import { db, requireDatabase } from '../supabase.js'
const router = Router()
router.post('/', requireDatabase, async (req, res) => {
  const { data, error } = await db.from('users').insert(req.body).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})
export default router
