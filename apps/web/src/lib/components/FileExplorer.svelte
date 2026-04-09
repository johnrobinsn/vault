<script lang="ts">
  import { vault, type FileTreeNode } from '$lib/state/vault.svelte.js'
  import { tabs } from '$lib/state/tabs.svelte.js'

  let contextMenu = $state<{ x: number; y: number; node: FileTreeNode | null } | null>(null)
  let renamingPath = $state<string | null>(null)
  let renameValue = $state('')

  function handleFileClick(node: FileTreeNode) {
    if (node.type === 'file') {
      tabs.open(node.path)
    }
  }

  function toggleFolder(node: FileTreeNode) {
    node.expanded = !node.expanded
  }

  function handleContextMenu(e: MouseEvent, node: FileTreeNode) {
    e.preventDefault()
    contextMenu = { x: e.clientX, y: e.clientY, node }
  }

  function handleBackgroundContextMenu(e: MouseEvent) {
    e.preventDefault()
    contextMenu = { x: e.clientX, y: e.clientY, node: null }
  }

  function closeContextMenu() {
    contextMenu = null
  }

  async function handleNewNote(folder?: string) {
    closeContextMenu()
    const meta = await vault.createNote(folder)
    tabs.open(meta.path)
    // Start renaming
    renamingPath = meta.path
    renameValue = meta.title
  }

  async function handleNewFolder(parentFolder?: string) {
    closeContextMenu()
    await vault.createFolder(parentFolder)
  }

  function handleRename(node: FileTreeNode) {
    closeContextMenu()
    renamingPath = node.path
    renameValue = node.type === 'file' ? node.name.replace(/\.md$/, '') : node.name
  }

  async function commitRename(node: FileTreeNode) {
    if (!renamingPath || !renameValue.trim()) {
      renamingPath = null
      return
    }

    const newName = renameValue.trim()
    if (node.type === 'file') {
      const dir = node.path.includes('/') ? node.path.slice(0, node.path.lastIndexOf('/')) : ''
      const newPath = dir ? `${dir}/${newName}.md` : `${newName}.md`
      if (newPath !== node.path) {
        await vault.renameNote(node.path, newPath)
        tabs.updatePath(node.path, newPath)
      }
    }
    renamingPath = null
  }

  function handleRenameKeydown(e: KeyboardEvent, node: FileTreeNode) {
    if (e.key === 'Enter') {
      commitRename(node)
    } else if (e.key === 'Escape') {
      renamingPath = null
    }
  }

  async function handleDelete(node: FileTreeNode) {
    closeContextMenu()
    if (node.type === 'file') {
      await vault.deleteNote(node.path)
      tabs.removeByPath(node.path)
    } else {
      await vault.deleteFolder(node.path)
    }
  }

  // Close context menu on click outside
  function handleWindowClick() {
    if (contextMenu) closeContextMenu()
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="file-explorer" oncontextmenu={handleBackgroundContextMenu}>
  {#each vault.tree as node (node.path)}
    {@render treeNode(node, 0)}
  {/each}
</div>

{#if contextMenu}
  <div class="context-menu" style="left: {contextMenu.x}px; top: {contextMenu.y}px">
    <button onclick={() => handleNewNote(contextMenu?.node?.type === 'folder' ? contextMenu.node.path : undefined)}>
      New Note
    </button>
    <button onclick={() => handleNewFolder(contextMenu?.node?.type === 'folder' ? contextMenu.node.path : undefined)}>
      New Folder
    </button>
    {#if contextMenu.node}
      <div class="separator"></div>
      <button onclick={() => contextMenu?.node && handleRename(contextMenu.node)}>Rename</button>
      <button class="danger" onclick={() => contextMenu?.node && handleDelete(contextMenu.node)}>Delete</button>
    {/if}
  </div>
{/if}

{#snippet treeNode(node: FileTreeNode, depth: number)}
  <div class="tree-item" style="padding-left: {depth * 16 + 8}px">
    {#if renamingPath === node.path}
      <input
        class="rename-input"
        bind:value={renameValue}
        onblur={() => commitRename(node)}
        onkeydown={(e) => handleRenameKeydown(e, node)}
        autofocus
      />
    {:else}
      <button
        class="tree-button"
        class:active={tabs.activeTab?.path === node.path}
        onclick={() => node.type === 'folder' ? toggleFolder(node) : handleFileClick(node)}
        oncontextmenu={(e) => handleContextMenu(e, node)}
      >
        <span class="icon">
          {#if node.type === 'folder'}
            {node.expanded ? '▾' : '▸'}
          {:else}
            <span class="file-icon">¶</span>
          {/if}
        </span>
        <span class="name">{node.type === 'file' ? node.name.replace(/\.md$/, '') : node.name}</span>
      </button>
    {/if}
  </div>
  {#if node.type === 'folder' && node.expanded}
    {#each node.children as child (child.path)}
      {@render treeNode(child, depth + 1)}
    {/each}
  {/if}
{/snippet}

<style>
  .file-explorer {
    height: 100%;
    overflow-y: auto;
    user-select: none;
  }

  .tree-item {
    display: flex;
    align-items: center;
  }

  .tree-button {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 4px 8px;
    border: none;
    background: transparent;
    color: var(--vault-text-primary);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
    font-family: inherit;
  }

  .tree-button:hover {
    background: var(--vault-bg-tertiary);
  }

  .tree-button.active {
    background: var(--vault-bg-tertiary);
    color: var(--vault-accent);
  }

  .icon {
    flex-shrink: 0;
    width: 14px;
    text-align: center;
    font-size: 11px;
    color: var(--vault-text-muted);
  }

  .file-icon {
    font-size: 10px;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rename-input {
    width: 100%;
    padding: 3px 6px;
    border: 1px solid var(--vault-accent);
    background: var(--vault-bg-primary);
    color: var(--vault-text-primary);
    font-size: 13px;
    border-radius: 3px;
    outline: none;
    font-family: inherit;
  }

  .context-menu {
    position: fixed;
    z-index: 1000;
    background: var(--vault-bg-secondary);
    border: 1px solid var(--vault-border);
    border-radius: 6px;
    padding: 4px;
    min-width: 160px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .context-menu button {
    display: block;
    width: 100%;
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: var(--vault-text-primary);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
    font-family: inherit;
  }

  .context-menu button:hover {
    background: var(--vault-bg-tertiary);
  }

  .context-menu button.danger {
    color: #e55;
  }

  .separator {
    height: 1px;
    background: var(--vault-border);
    margin: 4px 0;
  }
</style>
