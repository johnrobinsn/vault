import { Hono } from 'hono'
import { getActiveVault } from '../config.js'
import { LocalFSStorage } from '../storage/local-fs.js'
import { markRecentWrite } from '../watcher.js'

const app = new Hono()

function getStorage() {
  const vault = getActiveVault()
  if (!vault) return null
  return new LocalFSStorage(vault.path)
}

// List all files with metadata
app.get('/', async (c) => {
  const storage = getStorage()
  if (!storage) return c.json({ error: 'No active vault' }, 400)

  const files = await storage.listFiles()
  return c.json(files)
})

// Read a file's content
app.get('/*', async (c) => {
  const storage = getStorage()
  if (!storage) return c.json({ error: 'No active vault' }, 400)

  const filePath = c.req.path.replace('/api/files/', '')
  if (!filePath) return c.json({ error: 'Path required' }, 400)

  const content = await storage.readFile(filePath)
  if (content === null) return c.json({ error: 'Not found' }, 404)

  return c.text(content)
})

// Create or update a file
app.put('/*', async (c) => {
  const storage = getStorage()
  if (!storage) return c.json({ error: 'No active vault' }, 400)

  const filePath = c.req.path.replace('/api/files/', '')
  if (!filePath) return c.json({ error: 'Path required' }, 400)

  const content = await c.req.text()
  markRecentWrite(filePath)
  await storage.writeFile(filePath, content)
  return c.json({ ok: true })
})

// Delete a file
app.delete('/*', async (c) => {
  const storage = getStorage()
  if (!storage) return c.json({ error: 'No active vault' }, 400)

  const filePath = c.req.path.replace('/api/files/', '')
  if (!filePath) return c.json({ error: 'Path required' }, 400)

  markRecentWrite(filePath)
  await storage.deleteFile(filePath)
  return c.json({ ok: true })
})

// Rename/move a file
app.patch('/*', async (c) => {
  const storage = getStorage()
  if (!storage) return c.json({ error: 'No active vault' }, 400)

  const filePath = c.req.path.replace('/api/files/', '')
  if (!filePath) return c.json({ error: 'Path required' }, 400)

  const body = await c.req.json<{ newPath: string }>()
  if (!body.newPath) return c.json({ error: 'newPath required' }, 400)

  markRecentWrite(filePath)
  markRecentWrite(body.newPath)
  await storage.moveFile(filePath, body.newPath)
  return c.json({ ok: true })
})

export default app
