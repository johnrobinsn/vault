import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryStorage } from '../src/storage/memory-storage.js'
import type { VaultStorage, NoteMetadata } from '../src/storage/types.js'

function makeMeta(path: string, overrides: Partial<NoteMetadata> = {}): NoteMetadata {
  return {
    path,
    title: path.split('/').pop()?.replace('.md', '') ?? path,
    created: Date.now(),
    modified: Date.now(),
    size: 0,
    frontmatter: {},
    tags: [],
    ...overrides,
  }
}

describe('MemoryStorage', () => {
  let storage: VaultStorage

  beforeEach(() => {
    storage = new MemoryStorage()
  })

  describe('notes', () => {
    it('writes and reads a note', async () => {
      await storage.writeNote('hello.md', '# Hello')
      expect(await storage.readNote('hello.md')).toBe('# Hello')
    })

    it('returns null for nonexistent notes', async () => {
      expect(await storage.readNote('nope.md')).toBeNull()
    })

    it('overwrites existing notes', async () => {
      await storage.writeNote('a.md', 'v1')
      await storage.writeNote('a.md', 'v2')
      expect(await storage.readNote('a.md')).toBe('v2')
    })

    it('deletes a note and its metadata', async () => {
      await storage.writeNote('a.md', 'content')
      await storage.setMetadata('a.md', makeMeta('a.md'))
      await storage.deleteNote('a.md')
      expect(await storage.readNote('a.md')).toBeNull()
      expect(await storage.getMetadata('a.md')).toBeNull()
    })

    it('moves a note', async () => {
      await storage.writeNote('old.md', 'content')
      await storage.setMetadata('old.md', makeMeta('old.md'))
      await storage.moveNote('old.md', 'new.md')
      expect(await storage.readNote('old.md')).toBeNull()
      expect(await storage.readNote('new.md')).toBe('content')
      expect((await storage.getMetadata('new.md'))?.path).toBe('new.md')
    })
  })

  describe('metadata', () => {
    it('stores and retrieves metadata', async () => {
      const meta = makeMeta('test.md', { title: 'Test', tags: ['tag1'] })
      await storage.setMetadata('test.md', meta)
      const result = await storage.getMetadata('test.md')
      expect(result).toEqual(meta)
    })

    it('gets all metadata', async () => {
      await storage.setMetadata('a.md', makeMeta('a.md'))
      await storage.setMetadata('b.md', makeMeta('b.md'))
      const all = await storage.getAllMetadata()
      expect(all).toHaveLength(2)
    })
  })

  describe('folders', () => {
    it('creates and lists folders', async () => {
      await storage.createFolder('notes')
      await storage.createFolder('journal')
      const folders = await storage.listFolders()
      expect(folders).toContain('notes')
      expect(folders).toContain('journal')
    })

    it('deletes folders', async () => {
      await storage.createFolder('temp')
      await storage.deleteFolder('temp')
      expect(await storage.listFolders()).not.toContain('temp')
    })
  })

  describe('clear', () => {
    it('clears all data', async () => {
      await storage.writeNote('a.md', 'content')
      await storage.setMetadata('a.md', makeMeta('a.md'))
      await storage.createFolder('notes')
      await storage.clear()
      expect(await storage.readNote('a.md')).toBeNull()
      expect(await storage.getAllMetadata()).toHaveLength(0)
      expect(await storage.listFolders()).toHaveLength(0)
    })
  })
})
