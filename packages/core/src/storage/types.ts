export interface NoteMetadata {
  path: string
  title: string
  created: number
  modified: number
  size: number
  frontmatter: Record<string, unknown>
  tags: string[]
}

export interface VaultFolder {
  path: string
  name: string
  children: string[]
}

export interface VaultStorage {
  // Notes
  readNote(path: string): Promise<string | null>
  writeNote(path: string, content: string): Promise<void>
  deleteNote(path: string): Promise<void>
  moveNote(oldPath: string, newPath: string): Promise<void>

  // Metadata
  getMetadata(path: string): Promise<NoteMetadata | null>
  setMetadata(path: string, metadata: NoteMetadata): Promise<void>
  getAllMetadata(): Promise<NoteMetadata[]>
  deleteMetadata(path: string): Promise<void>

  // Folders
  createFolder(path: string): Promise<void>
  deleteFolder(path: string): Promise<void>
  listFolders(): Promise<string[]>

  // Bulk operations
  clear(): Promise<void>
}
