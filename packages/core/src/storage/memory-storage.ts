import type { NoteMetadata, VaultStorage } from './types.js'

export class MemoryStorage implements VaultStorage {
  private notes = new Map<string, string>()
  private meta = new Map<string, NoteMetadata>()
  private folders = new Set<string>()

  // Notes
  async readNote(path: string): Promise<string | null> {
    return this.notes.get(path) ?? null
  }

  async writeNote(path: string, content: string): Promise<void> {
    this.notes.set(path, content)
  }

  async deleteNote(path: string): Promise<void> {
    this.notes.delete(path)
    this.meta.delete(path)
  }

  async moveNote(oldPath: string, newPath: string): Promise<void> {
    const content = this.notes.get(oldPath)
    const metadata = this.meta.get(oldPath)
    if (content !== undefined) {
      this.notes.delete(oldPath)
      this.notes.set(newPath, content)
    }
    if (metadata) {
      this.meta.delete(oldPath)
      this.meta.set(newPath, { ...metadata, path: newPath })
    }
  }

  // Metadata
  async getMetadata(path: string): Promise<NoteMetadata | null> {
    return this.meta.get(path) ?? null
  }

  async setMetadata(_path: string, metadata: NoteMetadata): Promise<void> {
    this.meta.set(metadata.path, metadata)
  }

  async getAllMetadata(): Promise<NoteMetadata[]> {
    return Array.from(this.meta.values())
  }

  async deleteMetadata(path: string): Promise<void> {
    this.meta.delete(path)
  }

  // Folders
  async createFolder(path: string): Promise<void> {
    this.folders.add(path)
  }

  async deleteFolder(path: string): Promise<void> {
    this.folders.delete(path)
  }

  async listFolders(): Promise<string[]> {
    return Array.from(this.folders)
  }

  // Bulk operations
  async clear(): Promise<void> {
    this.notes.clear()
    this.meta.clear()
    this.folders.clear()
  }
}
