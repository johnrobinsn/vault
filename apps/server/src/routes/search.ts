import { Hono } from 'hono'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getActiveVault } from '../config.js'

const app = new Hono()

interface SearchMatch {
  path: string
  title: string
  line: string
  lineNumber: number
  matchRanges: { start: number; length: number }[]
}

/**
 * Full-text search across all .md files in the active vault.
 * Returns multiple matches per file with context.
 *
 * GET /api/search?q=search+terms&max=50
 */
app.get('/', async (c) => {
  const vault = getActiveVault()
  if (!vault) return c.json({ error: 'No active vault' }, 400)

  const query = c.req.query('q')?.trim()
  if (!query) return c.json({ results: [], total: 0 })

  const max = Math.min(parseInt(c.req.query('max') ?? '100'), 500)
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)

  const results: SearchMatch[] = []
  await searchDir(vault.path, '', terms, results, max)

  return c.json({ results, total: results.length })
})

async function searchDir(
  root: string,
  prefix: string,
  terms: string[],
  results: SearchMatch[],
  max: number,
): Promise<void> {
  if (results.length >= max) return

  let entries
  try {
    entries = await fs.readdir(path.join(root, prefix), { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (results.length >= max) return
    if (entry.name.startsWith('.')) continue

    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      await searchDir(root, relPath, terms, results, max)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      await searchFile(root, relPath, entry.name, terms, results, max)
    }
  }
}

async function searchFile(
  root: string,
  relPath: string,
  filename: string,
  terms: string[],
  results: SearchMatch[],
  max: number,
): Promise<void> {
  let content: string
  try {
    content = await fs.readFile(path.join(root, relPath), 'utf-8')
  } catch {
    return
  }

  const title = filename.endsWith('.md') ? filename.slice(0, -3) : filename
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    if (results.length >= max) return

    const line = lines[i]
    const lineLower = line.toLowerCase()

    // Check if all terms appear in this line
    const allMatch = terms.every((t) => lineLower.includes(t))
    if (!allMatch) continue

    // Find all match ranges in this line
    const matchRanges: { start: number; length: number }[] = []
    for (const term of terms) {
      let searchFrom = 0
      while (searchFrom < lineLower.length) {
        const idx = lineLower.indexOf(term, searchFrom)
        if (idx === -1) break
        matchRanges.push({ start: idx, length: term.length })
        searchFrom = idx + term.length
      }
    }

    // Sort ranges by position
    matchRanges.sort((a, b) => a.start - b.start)

    results.push({
      path: relPath,
      title,
      line: line.trim(),
      lineNumber: i + 1,
      matchRanges,
    })
  }
}

export default app
