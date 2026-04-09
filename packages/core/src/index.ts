export type { VaultStorage, NoteMetadata, VaultFolder } from './storage/types.js'
export { IDBStorage } from './storage/idb-storage.js'
export { MemoryStorage } from './storage/memory-storage.js'
export { createEventBus } from './events.js'
export type { VaultEvents, VaultEventBus } from './events.js'
export { VaultService, titleFromPath, basename, parentPath } from './vault-service.js'
export {
  extractWikiLinks,
  uniqueLinkTargets,
  resolveWikiLink,
  replaceWikiLinkTarget,
} from './markdown/wikilinks.js'
export type { WikiLink } from './markdown/wikilinks.js'
export { parseFrontmatter, extractTags, serializeFrontmatter } from './markdown/frontmatter.js'
export type { ParsedFrontmatter } from './markdown/frontmatter.js'
export { SearchEngine } from './search/search-engine.js'
export type { SearchResult, SearchableNote } from './search/search-engine.js'
export { exportVault, importVault } from './vault-io.js'
export { FSAccessStorage } from './storage/fs-access-storage.js'
export {
  saveDirectoryHandle,
  loadDirectoryHandle,
  clearDirectoryHandle,
  hasFileSystemAccess,
  requestPermission,
} from './storage/handle-store.js'
