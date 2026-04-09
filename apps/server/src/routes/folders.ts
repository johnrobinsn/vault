import { Hono } from 'hono'
import { getActiveVault } from '../config.js'
import { LocalFSStorage } from '../storage/local-fs.js'

const app = new Hono()

function getStorage() {
  const vault = getActiveVault()
  if (!vault) return null
  return new LocalFSStorage(vault.path)
}

// List all folders
app.get('/', async (c) => {
  const storage = getStorage()
  if (!storage) return c.json({ error: 'No active vault' }, 400)

  const folders = await storage.listFolders()
  return c.json(folders)
})

// Create a folder
app.post('/', async (c) => {
  const storage = getStorage()
  if (!storage) return c.json({ error: 'No active vault' }, 400)

  const body = await c.req.json<{ path: string }>()
  if (!body.path) return c.json({ error: 'path required' }, 400)

  await storage.createFolder(body.path)
  return c.json({ ok: true }, 201)
})

// Delete a folder
app.delete('/*', async (c) => {
  const storage = getStorage()
  if (!storage) return c.json({ error: 'No active vault' }, 400)

  const folderPath = c.req.path.replace('/api/folders/', '')
  if (!folderPath) return c.json({ error: 'Path required' }, 400)

  await storage.deleteFolder(folderPath)
  return c.json({ ok: true })
})

export default app
