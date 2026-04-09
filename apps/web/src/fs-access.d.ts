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
