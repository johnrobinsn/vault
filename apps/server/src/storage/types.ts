export interface FileMetadata {
  path: string
  title: string
  created: number
  modified: number
  size: number
}

export interface ServerStorage {
  readFile(filePath: string): Promise<string | null>
  writeFile(filePath: string, content: string): Promise<void>
  deleteFile(filePath: string): Promise<void>
  moveFile(oldPath: string, newPath: string): Promise<void>

  listFiles(): Promise<FileMetadata[]>

  createFolder(folderPath: string): Promise<void>
  deleteFolder(folderPath: string): Promise<void>
  listFolders(): Promise<string[]>
}
