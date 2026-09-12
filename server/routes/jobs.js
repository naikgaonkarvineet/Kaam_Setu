import { Router } from 'express'
import { db, requireDatabase } from '../supabase.js'
const router = Router()
router.get('/', requireDatabase, async (_, res) => {
  const { data, error } = await db.from('jobs').select('*').order('created_at', { ascending: false })
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})
router.post('/', requireDatabase, async (req, res) => {
  const { data, error } = await db.from('jobs').insert(req.body).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})
router.patch('/:id', requireDatabase, async (req, res) => {
  const { data, error } = await db.from('jobs').update(req.body).eq('id', req.params.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})
export default router
