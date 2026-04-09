import type { NoteMetadata, VaultStorage } from './types.js'
import { parseFrontmatter, extractTags } from '../markdown/frontmatter.js'

/**
 * VaultStorage implementation backed by the File System Access API.
 * Notes are plain .md files on disk. Metadata is derived from file content.
 */
export class FSAccessStorage implements VaultStorage {
  private root: FileSystemDirectoryHandle

  constructor(rootHandle: FileSystemDirectoryHandle) {
    this.root = rootHandle
  }

  // --- Notes ---

  async readNote(path: string): Promise<string | null> {
    try {
      const fileHandle = await this.getFileHandle(path)
      const file = await fileHandle.getFile()
      return await file.text()
    } catch {
      return null
    }
  }

  async writeNote(path: string, content: string): Promise<void> {
    const dir = parentDir(path)
    if (dir) {
      await this.ensureDir(dir)
    }
    const fileHandle = await this.getFileHandle(path, true)
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
  }

  async deleteNote(path: string): Promise<void> {
    try {
      const dir = parentDir(path)
      const name = basename(path)
      const dirHandle = dir ? await this.getDirHandle(dir) : this.root
      await dirHandle.removeEntry(name)
    } catch {
      // File may not exist — that's fine
    }
  }

  async moveNote(oldPath: string, newPath: string): Promise<void> {
    // Copy + delete (move() not widely supported)
    const content = await this.readNote(oldPath)
    if (content !== null) {
      await this.writeNote(newPath, content)
      await this.deleteNote(oldPath)
    }
  }

  // --- Metadata (derived from files) ---

  async getMetadata(path: string): Promise<NoteMetadata | null> {
    try {
      const fileHandle = await this.getFileHandle(path)
      const file = await fileHandle.getFile()
      const content = await file.text()
      return this.buildMetadata(path, content, file.lastModified)
    } catch {
      return null
    }
  }

  async setMetadata(_path: string, _metadata: NoteMetadata): Promise<void> {
    // No-op: metadata is derived from file content, not stored separately.
    // Frontmatter is part of the .md file content itself.
  }

  async getAllMetadata(): Promise<NoteMetadata[]> {
    const results: NoteMetadata[] = []
    await this.walkFiles(this.root, '', results)
    return results
  }

  async deleteMetadata(_path: string): Promise<void> {
    // No-op: metadata is derived
  }

  // --- Folders ---

  async createFolder(path: string): Promise<void> {
    await this.ensureDir(path)
  }

  async deleteFolder(path: string): Promise<void> {
    try {
      const dir = parentDir(path)
      const name = basename(path)
      const parentHandle = dir ? await this.getDirHandle(dir) : this.root
      await parentHandle.removeEntry(name, { recursive: true })
    } catch {
      // Folder may not exist
    }
  }

  async listFolders(): Promise<string[]> {
    const folders: string[] = []
    await this.walkFolders(this.root, '', folders)
    return folders
  }

  // --- Bulk ---

  async clear(): Promise<void> {
    for await (const [name] of this.root.entries()) {
      await this.root.removeEntry(name, { recursive: true })
    }
  }

  // --- Private helpers ---

  private async getFileHandle(
    path: string,
    create = false,
  ): Promise<FileSystemFileHandle> {
    const dir = parentDir(path)
    const name = basename(path)
    const dirHandle = dir ? await this.getDirHandle(dir, create) : this.root
    return dirHandle.getFileHandle(name, { create })
  }

  private async getDirHandle(
    path: string,
    create = false,
  ): Promise<FileSystemDirectoryHandle> {
    const parts = path.split('/').filter(Boolean)
    let handle = this.root
    for (const part of parts) {
      handle = await handle.getDirectoryHandle(part, { create })
    }
    return handle
  }

  private async ensureDir(path: string): Promise<void> {
    await this.getDirHandle(path, true)
  }

  private async walkFiles(
    dirHandle: FileSystemDirectoryHandle,
    prefix: string,
    results: NoteMetadata[],
  ): Promise<void> {
    for await (const [name, handle] of dirHandle.entries()) {
      // Skip hidden files/folders
      if (name.startsWith('.')) continue

      const fullPath = prefix ? `${prefix}/${name}` : name

      if (handle.kind === 'file' && name.endsWith('.md')) {
        try {
          const file = await (handle as FileSystemFileHandle).getFile()
          const content = await file.text()
          results.push(this.buildMetadata(fullPath, content, file.lastModified))
        } catch {
          // Skip unreadable files
        }
      } else if (handle.kind === 'directory') {
        await this.walkFiles(
          handle as FileSystemDirectoryHandle,
          fullPath,
          results,
        )
      }
    }
  }

  private async walkFolders(
    dirHandle: FileSystemDirectoryHandle,
    prefix: string,
    results: string[],
  ): Promise<void> {
    for await (const [name, handle] of dirHandle.entries()) {
      if (name.startsWith('.')) continue

      if (handle.kind === 'directory') {
        const fullPath = prefix ? `${prefix}/${name}` : name
        results.push(fullPath)
        await this.walkFolders(
          handle as FileSystemDirectoryHandle,
          fullPath,
          results,
        )
      }
    }
  }

  private buildMetadata(
    path: string,
    content: string,
    lastModified: number,
  ): NoteMetadata {
    const { data } = parseFrontmatter(content)
    const title =
      typeof data.title === 'string'
        ? data.title
        : titleFromPath(path)

    return {
      path,
      title,
      created: typeof data.created === 'number' ? data.created : lastModified,
      modified: lastModified,
      size: content.length,
      frontmatter: data,
      tags: extractTags(data),
    }
  }
}

function basename(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1]
}

function parentDir(path: string): string | null {
  const idx = path.lastIndexOf('/')
  return idx > 0 ? path.slice(0, idx) : null
}

function titleFromPath(path: string): string {
  const name = basename(path)
  return name.endsWith('.md') ? name.slice(0, -3) : name
}
