import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryStorage } from '../src/storage/memory-storage.js'
import { VaultService } from '../src/vault-service.js'

describe('VaultService', () => {
  let service: VaultService

  beforeEach(() => {
    service = new VaultService(new MemoryStorage())
  })

  describe('note CRUD', () => {
    it('creates a note and returns metadata', async () => {
      const meta = await service.createNote('hello.md', '# Hello World')
      expect(meta.path).toBe('hello.md')
      expect(meta.title).toBe('hello')
      expect(meta.size).toBe(13)
    })

    it('reads a created note', async () => {
      await service.createNote('test.md', 'content')
      expect(await service.readNote('test.md')).toBe('content')
    })

    it('saves (updates) a note', async () => {
      await service.createNote('test.md', 'v1')
      const meta = await service.saveNote('test.md', 'v2')
      expect(meta.size).toBe(2)
      expect(await service.readNote('test.md')).toBe('v2')
    })

    it('soft-deletes to .trash', async () => {
      await service.createNote('doomed.md', 'bye')
      await service.deleteNote('doomed.md')
      expect(await service.readNote('doomed.md')).toBeNull()
      const trash = await service.getTrash()
      expect(trash).toHaveLength(1)
      expect(trash[0].path).toBe('.trash/doomed.md')
    })

    it('renames a note', async () => {
      await service.createNote('old.md', 'content')
      const meta = await service.renameNote('old.md', 'new.md')
      expect(meta.path).toBe('new.md')
      expect(meta.title).toBe('new')
      expect(await service.readNote('old.md')).toBeNull()
      expect(await service.readNote('new.md')).toBe('content')
    })

    it('checks if note exists', async () => {
      expect(await service.noteExists('nope.md')).toBe(false)
      await service.createNote('yes.md', '')
      expect(await service.noteExists('yes.md')).toBe(true)
    })

    it('generates unique paths', async () => {
      await service.createNote('note.md', '')
      const unique = await service.generateUniquePath('note.md')
      expect(unique).toBe('note 1.md')
    })
  })

  describe('getAllNotes', () => {
    it('excludes trash notes', async () => {
      await service.createNote('keep.md', 'keep')
      await service.createNote('trash-me.md', 'gone')
      await service.deleteNote('trash-me.md')
      const notes = await service.getAllNotes()
      expect(notes).toHaveLength(1)
      expect(notes[0].path).toBe('keep.md')
    })
  })

  describe('trash operations', () => {
    it('empties trash', async () => {
      await service.createNote('a.md', '')
      await service.deleteNote('a.md')
      await service.emptyTrash()
      expect(await service.getTrash()).toHaveLength(0)
    })

    it('restores from trash', async () => {
      await service.createNote('restore-me.md', 'important')
      await service.deleteNote('restore-me.md')
      const restored = await service.restoreFromTrash('.trash/restore-me.md')
      expect(restored?.path).toBe('restore-me.md')
      expect(await service.readNote('restore-me.md')).toBe('important')
      expect(await service.getTrash()).toHaveLength(0)
    })
  })

  describe('folders', () => {
    it('creates a folder', async () => {
      await service.createFolder('notes')
      const folders = await service.listFolders()
      expect(folders).toContain('notes')
    })

    it('auto-creates parent folders for nested notes', async () => {
      await service.createNote('journal/2026/april.md', '')
      const folders = await service.listFolders()
      expect(folders).toContain('journal/2026')
      expect(folders).toContain('journal')
    })

    it('deletes a folder and its notes', async () => {
      await service.createNote('work/todo.md', 'stuff')
      await service.deleteFolder('work')
      expect(await service.readNote('work/todo.md')).toBeNull()
    })

    it('moves a note to a folder', async () => {
      await service.createNote('loose.md', 'content')
      await service.createFolder('organized')
      const meta = await service.moveNoteToFolder('loose.md', 'organized')
      expect(meta.path).toBe('organized/loose.md')
      expect(await service.readNote('organized/loose.md')).toBe('content')
    })
  })

  describe('events', () => {
    it('emits note:created', async () => {
      const handler = vi.fn()
      service.events.on('note:created', handler)
      await service.createNote('test.md', '')
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ path: 'test.md' }))
    })

    it('emits note:saved', async () => {
      const handler = vi.fn()
      service.events.on('note:saved', handler)
      await service.createNote('test.md', 'v1')
      await service.saveNote('test.md', 'v2')
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('emits note:deleted', async () => {
      const handler = vi.fn()
      service.events.on('note:deleted', handler)
      await service.createNote('test.md', '')
      await service.deleteNote('test.md')
      expect(handler).toHaveBeenCalledWith({ path: 'test.md' })
    })

    it('emits note:renamed', async () => {
      const handler = vi.fn()
      service.events.on('note:renamed', handler)
      await service.createNote('old.md', '')
      await service.renameNote('old.md', 'new.md')
      expect(handler).toHaveBeenCalledWith({ oldPath: 'old.md', newPath: 'new.md' })
    })

    it('emits vault:cleared', async () => {
      const handler = vi.fn()
      service.events.on('vault:cleared', handler)
      await service.clear()
      expect(handler).toHaveBeenCalled()
    })
  })
})
