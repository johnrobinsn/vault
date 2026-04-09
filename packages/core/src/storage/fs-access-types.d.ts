// Augment the built-in FileSystemDirectoryHandle with methods
// that TypeScript's DOM lib doesn't include yet.

interface FileSystemDirectoryHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>
  keys(): AsyncIterableIterator<string>
  values(): AsyncIterableIterator<FileSystemHandle>
  [Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]>
}

interface FileSystemHandle {
  queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>
}

interface Window {
  showDirectoryPicker(options?: {
    mode?: 'read' | 'readwrite'
    startIn?: string | FileSystemHandle
    id?: string
  }): Promise<FileSystemDirectoryHandle>
}
