import type { VaultStorage, NoteMetadata } from './storage/types.js'
import { createEventBus, type VaultEventBus } from './events.js'
import { replaceWikiLinkTarget } from './markdown/wikilinks.js'

const TRASH_FOLDER = '.trash'

export class VaultService {
  readonly events: VaultEventBus
  private storage: VaultStorage

  constructor(storage: VaultStorage) {
    this.storage = storage
    this.events = createEventBus()
  }

  // --- Notes ---

  async createNote(path: string, content = ''): Promise<NoteMetadata> {
    const now = Date.now()
    await this.storage.writeNote(path, content)

    // Ensure parent folder exists
    const dir = parentPath(path)
    if (dir) {
      await this.ensureFolder(dir)
    }

    const meta: NoteMetadata = {
      path,
      title: titleFromPath(path),
      created: now,
      modified: now,
      size: content.length,
      frontmatter: {},
      tags: [],
    }
    await this.storage.setMetadata(path, meta)
    this.events.emit('note:created', meta)
    return meta
  }

  async readNote(path: string): Promise<string | null> {
    return this.storage.readNote(path)
  }

  async saveNote(path: string, content: string): Promise<NoteMetadata> {
    await this.storage.writeNote(path, content)

    const existing = await this.storage.getMetadata(path)
    const now = Date.now()
    const meta: NoteMetadata = {
      path,
      title: existing?.title ?? titleFromPath(path),
      created: existing?.created ?? now,
      modified: now,
      size: content.length,
      frontmatter: existing?.frontmatter ?? {},
      tags: existing?.tags ?? [],
    }
    await this.storage.setMetadata(path, meta)
    this.events.emit('note:saved', meta)
    return meta
  }

  async deleteNote(path: string): Promise<void> {
    // Soft delete: move to .trash
    const trashPath = `${TRASH_FOLDER}/${basename(path)}`
    const content = await this.storage.readNote(path)
    if (content !== null) {
      await this.ensureFolder(TRASH_FOLDER)
      await this.storage.writeNote(trashPath, content)
      const meta = await this.storage.getMetadata(path)
      if (meta) {
        await this.storage.setMetadata(trashPath, { ...meta, path: trashPath })
      }
    }
    await this.storage.deleteNote(path)
    this.events.emit('note:deleted', { path })
  }

  async renameNote(oldPath: string, newPath: string): Promise<NoteMetadata> {
    await this.storage.moveNote(oldPath, newPath)

    // Ensure parent folder of new path
    const dir = parentPath(newPath)
    if (dir) {
      await this.ensureFolder(dir)
    }

    const meta = await this.storage.getMetadata(newPath)
    const now = Date.now()
    const updated: NoteMetadata = {
      path: newPath,
      title: titleFromPath(newPath),
      created: meta?.created ?? now,
      modified: now,
      size: meta?.size ?? 0,
      frontmatter: meta?.frontmatter ?? {},
      tags: meta?.tags ?? [],
    }
    await this.storage.setMetadata(newPath, updated)
    this.events.emit('note:renamed', { oldPath, newPath })
    return updated
  }

  /**
   * Rename a note and update all [[wiki-links]] across the vault that
   * reference the old name.
   */
  async renameNoteWithRefactor(oldPath: string, newPath: string): Promise<NoteMetadata> {
    const oldTitle = titleFromPath(oldPath)
    const newTitle = titleFromPath(newPath)

    // Rename the note itself
    const meta = await this.renameNote(oldPath, newPath)

    // If the title changed, refactor wiki-links in all other notes
    if (oldTitle.toLowerCase() !== newTitle.toLowerCase()) {
      const allNotes = await this.getAllNotes()
      for (const note of allNotes) {
        if (note.path === newPath) continue
        const content = await this.storage.readNote(note.path)
        if (!content) continue
        const updated = replaceWikiLinkTarget(content, oldTitle, newTitle)
        if (updated !== content) {
          await this.storage.writeNote(note.path, updated)
        }
      }
    }

    return meta
  }

  /**
   * Rename a folder and update paths of all notes within it.
   */
  async renameFolder(oldPath: string, newPath: string): Promise<void> {
    // Get all notes in this folder
    const allNotes = await this.storage.getAllMetadata()
    const notesInFolder = allNotes.filter((n) => n.path.startsWith(oldPath + '/'))

    // Move each note to the new folder path
    for (const note of notesInFolder) {
      const relativePath = note.path.slice(oldPath.length)
      const newNotePath = newPath + relativePath
      await this.storage.moveNote(note.path, newNotePath)
      const meta = await this.storage.getMetadata(newNotePath)
      if (meta) {
        await this.storage.setMetadata(newNotePath, { ...meta, path: newNotePath })
      }
    }

    // Create the new folder and delete the old one
    await this.storage.createFolder(newPath)
    if (notesInFolder.length === 0) {
      // Only delete if we didn't already move all contents (which removes the dir)
      await this.storage.deleteFolder(oldPath)
    }

    this.events.emit('folder:created', { path: newPath })
    this.events.emit('folder:deleted', { path: oldPath })
  }

  async getMetadata(path: string): Promise<NoteMetadata | null> {
    return this.storage.getMetadata(path)
  }

  async getAllNotes(): Promise<NoteMetadata[]> {
    const all = await this.storage.getAllMetadata()
    return all.filter((m) => !m.path.startsWith(TRASH_FOLDER + '/'))
  }

  async getTrash(): Promise<NoteMetadata[]> {
    const all = await this.storage.getAllMetadata()
    return all.filter((m) => m.path.startsWith(TRASH_FOLDER + '/'))
  }

  async emptyTrash(): Promise<void> {
    const trash = await this.getTrash()
    for (const item of trash) {
      await this.storage.deleteNote(item.path)
    }
    await this.storage.deleteFolder(TRASH_FOLDER)
  }

  async restoreFromTrash(trashPath: string): Promise<NoteMetadata | null> {
    const content = await this.storage.readNote(trashPath)
    if (content === null) return null

    const originalName = basename(trashPath)
    const restoredPath = originalName
    await this.storage.writeNote(restoredPath, content)
    const meta = await this.storage.getMetadata(trashPath)
    const now = Date.now()
    const restored: NoteMetadata = {
      path: restoredPath,
      title: titleFromPath(restoredPath),
      created: meta?.created ?? now,
      modified: now,
      size: content.length,
      frontmatter: meta?.frontmatter ?? {},
      tags: meta?.tags ?? [],
    }
    await this.storage.setMetadata(restoredPath, restored)
    await this.storage.deleteNote(trashPath)
    this.events.emit('note:created', restored)
    return restored
  }

  // --- Folders ---

  async createFolder(path: string): Promise<void> {
    await this.ensureFolder(path)
    this.events.emit('folder:created', { path })
  }

  async deleteFolder(path: string): Promise<void> {
    // Delete all notes within the folder
    const all = await this.storage.getAllMetadata()
    for (const meta of all) {
      if (meta.path.startsWith(path + '/')) {
        await this.deleteNote(meta.path)
      }
    }
    await this.storage.deleteFolder(path)
    this.events.emit('folder:deleted', { path })
  }

  async listFolders(): Promise<string[]> {
    return this.storage.listFolders()
  }

  async moveNoteToFolder(notePath: string, folderPath: string): Promise<NoteMetadata> {
    const name = basename(notePath)
    const newPath = folderPath ? `${folderPath}/${name}` : name
    return this.renameNote(notePath, newPath)
  }

  // --- Vault Operations ---

  async clear(): Promise<void> {
    await this.storage.clear()
    this.events.emit('vault:cleared', undefined)
  }

  async noteExists(path: string): Promise<boolean> {
    return (await this.storage.readNote(path)) !== null
  }

  /**
   * Generate a unique path for a new note, avoiding collisions.
   */
  async generateUniquePath(basePath: string): Promise<string> {
    if (!(await this.noteExists(basePath))) return basePath

    const ext = basePath.endsWith('.md') ? '.md' : ''
    const stem = ext ? basePath.slice(0, -ext.length) : basePath
    let counter = 1
    let candidate: string
    do {
      candidate = `${stem} ${counter}${ext}`
      counter++
    } while (await this.noteExists(candidate))
    return candidate
  }

  // --- Private ---

  private async ensureFolder(path: string): Promise<void> {
    const existing = await this.storage.listFolders()
    if (!existing.includes(path)) {
      await this.storage.createFolder(path)
      // Also ensure parent folders
      const parent = parentPath(path)
      if (parent) {
        await this.ensureFolder(parent)
      }
    }
  }
}

// --- Path Utilities ---

function titleFromPath(path: string): string {
  const name = basename(path)
  return name.endsWith('.md') ? name.slice(0, -3) : name
}

function basename(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1]
}

function parentPath(path: string): string | null {
  const idx = path.lastIndexOf('/')
  return idx > 0 ? path.slice(0, idx) : null
}

export { titleFromPath, basename, parentPath }
