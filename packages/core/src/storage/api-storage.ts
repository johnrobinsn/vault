import type { NoteMetadata, VaultStorage } from './types.js'
import { parseFrontmatter, extractTags } from '../markdown/frontmatter.js'

/**
 * VaultStorage implementation that talks to the Vault backend server via REST.
 */
export class APIStorage implements VaultStorage {
  private baseUrl: string

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl
  }

  // --- Notes ---

  async readNote(path: string): Promise<string | null> {
    const res = await fetch(`${this.baseUrl}/files/${encodeFilePath(path)}`)
    if (!res.ok) return null
    return res.text()
  }

  async writeNote(path: string, content: string): Promise<void> {
    await fetch(`${this.baseUrl}/files/${encodeFilePath(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/plain' },
      body: content,
    })
  }

  async deleteNote(path: string): Promise<void> {
    await fetch(`${this.baseUrl}/files/${encodeFilePath(path)}`, {
      method: 'DELETE',
    })
  }

  async moveNote(oldPath: string, newPath: string): Promise<void> {
    await fetch(`${this.baseUrl}/files/${encodeFilePath(oldPath)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPath }),
    })
  }

  // --- Metadata ---

  async getMetadata(path: string): Promise<NoteMetadata | null> {
    const content = await this.readNote(path)
    if (content === null) return null
    return buildMetadata(path, content, Date.now())
  }

  async setMetadata(_path: string, _metadata: NoteMetadata): Promise<void> {
    // No-op: metadata is derived from file content on the server side
  }

  async getAllMetadata(): Promise<NoteMetadata[]> {
    const res = await fetch(`${this.baseUrl}/files`)
    if (!res.ok) return []
    const files: ServerFileMetadata[] = await res.json()
    return files.map((f) => ({
      path: f.path,
      title: f.title,
      created: f.created,
      modified: f.modified,
      size: f.size,
      frontmatter: {},
      tags: [],
    }))
  }

  async deleteMetadata(_path: string): Promise<void> {
    // No-op: metadata is derived
  }

  // --- Folders ---

  async createFolder(path: string): Promise<void> {
    await fetch(`${this.baseUrl}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
  }

  async deleteFolder(path: string): Promise<void> {
    await fetch(`${this.baseUrl}/folders/${encodeFilePath(path)}`, {
      method: 'DELETE',
    })
  }

  async listFolders(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/folders`)
    if (!res.ok) return []
    return res.json()
  }

  // --- Bulk ---

  async clear(): Promise<void> {
    // Delete all files and folders by listing and removing them
    const folders = await this.listFolders()
    const meta = await this.getAllMetadata()
    for (const m of meta) {
      await this.deleteNote(m.path)
    }
    // Delete folders bottom-up (deepest first)
    const sorted = folders.sort((a, b) => b.split('/').length - a.split('/').length)
    for (const f of sorted) {
      await this.deleteFolder(f)
    }
  }
}

interface ServerFileMetadata {
  path: string
  title: string
  created: number
  modified: number
  size: number
}

function encodeFilePath(filePath: string): string {
  // Encode each path segment separately to preserve slashes
  return filePath
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/')
}

function buildMetadata(
  path: string,
  content: string,
  modified: number,
): NoteMetadata {
  const { data } = parseFrontmatter(content)
  const name = path.split('/').pop() ?? path
  const title =
    typeof data.title === 'string' ? data.title : name.endsWith('.md') ? name.slice(0, -3) : name

  return {
    path,
    title,
    created: typeof data.created === 'number' ? data.created : modified,
    modified,
    size: content.length,
    frontmatter: data,
    tags: extractTags(data),
  }
}
