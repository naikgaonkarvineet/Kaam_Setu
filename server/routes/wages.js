import { Router } from 'express'
import { db, requireDatabase } from '../supabase.js'
const router = Router()

// यही एक साझा नियम पोस्ट, फ़ीड और वेतन लिखने—तीनों जगह इस्तेमाल होता है।
export function wageFlag(rate, average) {
  if (rate < average * 0.9) return 'low'
  if (rate > average * 1.1) return 'high'
  return 'fair'
}
export function cityAverage(referenceRate, wageEntries = []) {
  const rates = [referenceRate, ...wageEntries.map(entry => Number(entry.rate))].filter(Boolean)
  return Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length)
}
router.post('/compare', (req, res) => {
  const average = cityAverage(req.body.referenceRate, req.body.wageEntries)
  res.json({ average, flag: wageFlag(Number(req.body.rate), average) })
})
router.post('/', requireDatabase, async (req, res) => {
  const { data, error } = await db.from('wage_entries').insert(req.body).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.status(201).json(data)
})
export default router
