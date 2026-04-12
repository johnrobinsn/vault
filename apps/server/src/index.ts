import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import vaults from './routes/vaults.js'
import files from './routes/files.js'
import folders from './routes/folders.js'
import search from './routes/search.js'
import { initWatcher } from './watcher.js'

const app = new Hono()

app.use('*', cors())

app.route('/api/vaults', vaults)
app.route('/api/files', files)
app.route('/api/folders', folders)
app.route('/api/search', search)

app.get('/api/health', (c) => c.json({ ok: true }))

app.post('/api/debug/editor', async (c) => {
  const fs = await import('node:fs')
  const data = await c.req.json()
  fs.writeFileSync('/tmp/vault-debug.json', JSON.stringify(data, null, 2), 'utf-8')
  return c.json({ ok: true })
})

const port = parseInt(process.env.PORT ?? '3001')
const hostname = process.env.HOST ?? '0.0.0.0'

console.log(`Vault server listening on http://${hostname}:${port}`)
const server = serve({ fetch: app.fetch, port, hostname })

initWatcher(server as import('node:http').Server)
