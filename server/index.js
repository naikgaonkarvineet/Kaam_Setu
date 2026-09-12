import 'dotenv/config'
import process from 'node:process'
import express from 'express'
import cors from 'cors'
import jobsRouter from './routes/jobs.js'
import wagesRouter from './routes/wages.js'
import usersRouter from './routes/users.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/jobs', jobsRouter)
app.use('/wages', wagesRouter)
app.use('/users', usersRouter)
app.get('/health', (_, res) => res.json({ ok: true }))
app.listen(process.env.PORT || 3001)
