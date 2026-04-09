import { Hono } from 'hono'
import fs from 'node:fs'
import { loadConfig, addVault, removeVault, setActiveVault, getVault } from '../config.js'

const app = new Hono()

// List all configured vaults
app.get('/', (c) => {
  const config = loadConfig()
  return c.json({
    vaults: config.vaults,
    activeVault: config.activeVault,
  })
})

// Create / register a vault
app.post('/', async (c) => {
  const body = await c.req.json<{ name: string; path: string }>()
  if (!body.name || !body.path) {
    return c.json({ error: 'name and path are required' }, 400)
  }

  // Create the directory if it doesn't exist
  fs.mkdirSync(body.path, { recursive: true })

  const entry = addVault(body.name, body.path)
  return c.json(entry, 201)
})

// Remove a vault from config (does NOT delete files)
app.delete('/:id', (c) => {
  const id = c.req.param('id')
  const removed = removeVault(id)
  if (!removed) {
    return c.json({ error: 'Vault not found' }, 404)
  }
  return c.json({ ok: true })
})

// Set the active vault
app.post('/:id/open', (c) => {
  const id = c.req.param('id')
  const entry = getVault(id)
  if (!entry) {
    return c.json({ error: 'Vault not found' }, 404)
  }
  setActiveVault(id)
  return c.json(entry)
})

export default app
