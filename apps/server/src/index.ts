import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import vaults from './routes/vaults.js'
import files from './routes/files.js'
import folders from './routes/folders.js'

const app = new Hono()

app.use('*', cors())

app.route('/api/vaults', vaults)
app.route('/api/files', files)
app.route('/api/folders', folders)

app.get('/api/health', (c) => c.json({ ok: true }))

const port = parseInt(process.env.PORT ?? '3001')

console.log(`Vault server listening on http://localhost:${port}`)
serve({ fetch: app.fetch, port })
