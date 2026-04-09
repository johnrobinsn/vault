import { openDB, type IDBPDatabase } from 'idb'
import type { NoteMetadata, VaultStorage } from './types.js'

const DB_NAME = 'vault'
const DB_VERSION = 1

interface VaultDB {
  notes: {
    key: string
    value: { path: string; content: string }
  }
  metadata: {
    key: string
    value: NoteMetadata
  }
  folders: {
    key: string
    value: { path: string }
  }
  settings: {
    key: string
    value: unknown
  }
}

function createDB(): Promise<IDBPDatabase<VaultDB>> {
  return openDB<VaultDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', { keyPath: 'path' })
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'path' })
      }
      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'path' })
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings')
      }
    },
  })
}

export class IDBStorage implements VaultStorage {
  private dbPromise: Promise<IDBPDatabase<VaultDB>>

  constructor() {
    this.dbPromise = createDB()
  }

  private async db() {
    return this.dbPromise
  }

  // Notes
  async readNote(path: string): Promise<string | null> {
    const db = await this.db()
    const record = await db.get('notes', path)
    return record?.content ?? null
  }

  async writeNote(path: string, content: string): Promise<void> {
    const db = await this.db()
    await db.put('notes', { path, content })
  }

  async deleteNote(path: string): Promise<void> {
    const db = await this.db()
    const tx = db.transaction(['notes', 'metadata'], 'readwrite')
    await Promise.all([tx.objectStore('notes').delete(path), tx.objectStore('metadata').delete(path), tx.done])
  }

  async moveNote(oldPath: string, newPath: string): Promise<void> {
    const db = await this.db()
    const tx = db.transaction(['notes', 'metadata'], 'readwrite')
    const notesStore = tx.objectStore('notes')
    const metaStore = tx.objectStore('metadata')

    const note = await notesStore.get(oldPath)
    const meta = await metaStore.get(oldPath)

    if (note) {
      await notesStore.delete(oldPath)
      await notesStore.put({ path: newPath, content: note.content })
    }
    if (meta) {
      await metaStore.delete(oldPath)
      await metaStore.put({ ...meta, path: newPath })
    }
    await tx.done
  }

  // Metadata
  async getMetadata(path: string): Promise<NoteMetadata | null> {
    const db = await this.db()
    return (await db.get('metadata', path)) ?? null
  }

  async setMetadata(path: string, metadata: NoteMetadata): Promise<void> {
    const db = await this.db()
    await db.put('metadata', metadata)
  }

  async getAllMetadata(): Promise<NoteMetadata[]> {
    const db = await this.db()
    return db.getAll('metadata')
  }

  async deleteMetadata(path: string): Promise<void> {
    const db = await this.db()
    await db.delete('metadata', path)
  }

  // Folders
  async createFolder(path: string): Promise<void> {
    const db = await this.db()
    await db.put('folders', { path })
  }

  async deleteFolder(path: string): Promise<void> {
    const db = await this.db()
    await db.delete('folders', path)
  }

  async listFolders(): Promise<string[]> {
    const db = await this.db()
    const folders = await db.getAll('folders')
    return folders.map((f) => f.path)
  }

  // Bulk operations
  async clear(): Promise<void> {
    const db = await this.db()
    const tx = db.transaction(['notes', 'metadata', 'folders', 'settings'], 'readwrite')
    await Promise.all([
      tx.objectStore('notes').clear(),
      tx.objectStore('metadata').clear(),
      tx.objectStore('folders').clear(),
      tx.objectStore('settings').clear(),
      tx.done,
    ])
  }
}
