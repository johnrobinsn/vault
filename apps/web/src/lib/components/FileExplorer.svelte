<script lang="ts">
  import { vault, type FileTreeNode } from '$lib/state/vault.svelte.js'
  import { tabs } from '$lib/state/tabs.svelte.js'
  import { activeEditor } from '$lib/state/editor.svelte.js'

  let contextMenu = $state<{ x: number; y: number; node: FileTreeNode | null } | null>(null)
  let renamingPath = $state<string | null>(null)
  let renameValue = $state('')
  let dragOverPath = $state<string | null>(null)
  let explorerEl = $state<HTMLDivElement | null>(null)

  /**
   * Flatten the visible tree into an ordered list for keyboard navigation.
   * Only includes nodes whose parent folders are expanded.
   */
  function flattenVisible(nodes: FileTreeNode[]): FileTreeNode[] {
    const result: FileTreeNode[] = []
    for (const node of nodes) {
      result.push(node)
      if (node.type === 'folder' && node.expanded) {
        result.push(...flattenVisible(node.children))
      }
    }
    return result
  }

  /** Get all tree-button elements in DOM order. */
  function getButtons(): HTMLButtonElement[] {
    if (!explorerEl) return []
    return Array.from(explorerEl.querySelectorAll<HTMLButtonElement>('.tree-button'))
  }

  /** Focus the explorer and optionally a specific button index. */
  export function focusExplorer() {
    const buttons = getButtons()
    if (buttons.length > 0) {
      // Focus the active file's button, or the first one
      const activeBtn = buttons.find((b) => b.classList.contains('active'))
      ;(activeBtn ?? buttons[0]).focus()
    }
  }

  // --- Keyboard navigation ---

  function handleExplorerKeydown(e: KeyboardEvent) {
    if (renamingPath) return // let rename input handle keys

    const target = e.target as HTMLElement
    if (!target.classList.contains('tree-button')) return

    const buttons = getButtons()
    const idx = buttons.indexOf(target as HTMLButtonElement)
    if (idx === -1) return

    const flat = flattenVisible(vault.tree)
    const node = flat[idx]
    if (!node) return

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        const next = buttons[idx + 1]
        next?.focus()
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        const prev = buttons[idx - 1]
        prev?.focus()
        break
      }
      case 'ArrowRight': {
        e.preventDefault()
        if (node.type === 'folder') {
          if (!node.expanded) {
            node.expanded = true
          } else {
            // Move to first child
            const next = buttons[idx + 1]
            next?.focus()
          }
        }
        break
      }
      case 'ArrowLeft': {
        e.preventDefault()
        if (node.type === 'folder' && node.expanded) {
          node.expanded = false
        } else {
          // Move to parent folder — find the previous folder at a shallower depth
          const nodeDepth = node.path.split('/').length
          for (let i = idx - 1; i >= 0; i--) {
            const candidate = flat[i]
            if (candidate.type === 'folder' && candidate.path.split('/').length < nodeDepth) {
              buttons[i]?.focus()
              break
            }
          }
        }
        break
      }
      case 'Enter': {
        e.preventDefault()
        if (node.type === 'file') {
          tabs.open(node.path)
          // Focus editor after opening
          setTimeout(() => activeEditor.view?.focus(), 50)
        } else {
          node.expanded = !node.expanded
        }
        break
      }
      case ' ': {
        e.preventDefault()
        if (node.type === 'folder') {
          node.expanded = !node.expanded
        } else {
          tabs.open(node.path)
        }
        break
      }
      case 'Home': {
        e.preventDefault()
        buttons[0]?.focus()
        break
      }
      case 'End': {
        e.preventDefault()
        buttons[buttons.length - 1]?.focus()
        break
      }
      case 'F2': {
        e.preventDefault()
        startRename(node)
        break
      }
      case 'Delete': {
        e.preventDefault()
        handleDelete(node)
        break
      }
      case 'Escape': {
        e.preventDefault()
        // Return focus to editor
        activeEditor.view?.focus()
        break
      }
    }
  }

  // --- Click handlers ---

  function handleFileClick(node: FileTreeNode) {
    if (node.type === 'file') {
      tabs.open(node.path)
    }
  }

  function handleDblClick(e: MouseEvent, node: FileTreeNode) {
    e.preventDefault()
    startRename(node)
  }

  function toggleFolder(node: FileTreeNode) {
    node.expanded = !node.expanded
  }

  // --- Context menu ---

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

  // --- CRUD operations ---

  async function handleNewNote(folder?: string) {
    closeContextMenu()
    const meta = await vault.createNote(folder)
    tabs.open(meta.path)
    renamingPath = meta.path
    renameValue = meta.title
  }

  async function handleNewFolder(parentFolder?: string) {
    closeContextMenu()
    await vault.createFolder(parentFolder)
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

  // --- Rename ---

  function startRename(node: FileTreeNode) {
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
    } else {
      const dir = node.path.includes('/') ? node.path.slice(0, node.path.lastIndexOf('/')) : ''
      const newPath = dir ? `${dir}/${newName}` : newName
      if (newPath !== node.path) {
        await vault.renameFolder(node.path, newPath)
        for (const tab of tabs.tabs) {
          if (tab.path.startsWith(node.path + '/')) {
            const newTabPath = newPath + tab.path.slice(node.path.length)
            tabs.updatePath(tab.path, newTabPath)
          }
        }
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

  // --- Drag and drop ---

  function handleDragStart(e: DragEvent, node: FileTreeNode) {
    if (!e.dataTransfer) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', node.path)
    e.dataTransfer.setData('application/x-vault-type', node.type)
  }

  function handleDragOver(e: DragEvent, node: FileTreeNode) {
    if (node.type !== 'folder') return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    dragOverPath = node.path
  }

  function handleDragOverRoot(e: DragEvent) {
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    dragOverPath = '__root__'
  }

  function handleDragLeave() {
    dragOverPath = null
  }

  async function handleDrop(e: DragEvent, targetFolder: string | null) {
    e.preventDefault()
    dragOverPath = null
    if (!e.dataTransfer) return

    const sourcePath = e.dataTransfer.getData('text/plain')
    const sourceType = e.dataTransfer.getData('application/x-vault-type')
    if (!sourcePath) return

    const sourceDir = sourcePath.includes('/') ? sourcePath.slice(0, sourcePath.lastIndexOf('/')) : ''
    if (sourceDir === (targetFolder ?? '')) return
    if (targetFolder && targetFolder.startsWith(sourcePath + '/')) return

    const name = sourcePath.split('/').pop()!
    const newPath = targetFolder ? `${targetFolder}/${name}` : name

    if (sourceType === 'file') {
      await vault.renameNote(sourcePath, newPath)
      tabs.updatePath(sourcePath, newPath)
    } else {
      await vault.renameFolder(sourcePath, newPath)
      for (const tab of tabs.tabs) {
        if (tab.path.startsWith(sourcePath + '/')) {
          const newTabPath = newPath + tab.path.slice(sourcePath.length)
          tabs.updatePath(tab.path, newTabPath)
        }
      }
    }
  }

  // --- Move to (context menu) ---

  async function handleMoveTo(node: FileTreeNode) {
    closeContextMenu()
    const folders = await vault.service.listFolders()
    const currentDir = node.path.includes('/') ? node.path.slice(0, node.path.lastIndexOf('/')) : ''

    const destinations: { label: string; path: string }[] = [
      { label: '/ (root)', path: '' },
      ...folders
        .filter((f) => f !== currentDir && f !== node.path && !f.startsWith(node.path + '/'))
        .map((f) => ({ label: f, path: f })),
    ]

    const target = prompt(
      `Move "${node.name}" to folder:\n\n${destinations.map((d, i) => `${i}: ${d.label}`).join('\n')}\n\nEnter number:`,
    )
    if (target === null) return
    const idx = parseInt(target)
    if (isNaN(idx) || idx < 0 || idx >= destinations.length) return

    const dest = destinations[idx]
    const name = node.path.split('/').pop()!
    const newPath = dest.path ? `${dest.path}/${name}` : name

    if (node.type === 'file') {
      await vault.renameNote(node.path, newPath)
      tabs.updatePath(node.path, newPath)
    } else {
      await vault.renameFolder(node.path, newPath)
      for (const tab of tabs.tabs) {
        if (tab.path.startsWith(node.path + '/')) {
          const newTabPath = newPath + tab.path.slice(node.path.length)
          tabs.updatePath(tab.path, newTabPath)
        }
      }
    }
  }

  function handleWindowClick() {
    if (contextMenu) closeContextMenu()
  }
</script>

<svelte:window onclick={handleWindowClick} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="file-explorer"
  bind:this={explorerEl}
  role="tree"
  oncontextmenu={handleBackgroundContextMenu}
  onkeydown={handleExplorerKeydown}
  ondragover={handleDragOverRoot}
  ondragleave={handleDragLeave}
  ondrop={(e) => handleDrop(e, null)}
  class:drag-over-root={dragOverPath === '__root__'}
>
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
      <button onclick={() => contextMenu?.node && startRename(contextMenu.node)}>Rename</button>
      <button onclick={() => contextMenu?.node && handleMoveTo(contextMenu.node)}>Move to...</button>
      <button class="danger" onclick={() => contextMenu?.node && handleDelete(contextMenu.node)}>Delete</button>
    {/if}
  </div>
{/if}

{#snippet treeNode(node: FileTreeNode, depth: number)}
  <div
    class="tree-item"
    role="treeitem"
    aria-expanded={node.type === 'folder' ? node.expanded : undefined}
    style="padding-left: {depth * 16 + 8}px"
    class:drag-over={dragOverPath === node.path}
  >
    {#if renamingPath === node.path}
      <!-- svelte-ignore a11y_autofocus -->
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
        class:focused-node={false}
        onclick={() => node.type === 'folder' ? toggleFolder(node) : handleFileClick(node)}
        ondblclick={(e) => handleDblClick(e, node)}
        oncontextmenu={(e) => handleContextMenu(e, node)}
        draggable="true"
        ondragstart={(e) => handleDragStart(e, node)}
        ondragover={(e) => node.type === 'folder' ? handleDragOver(e, node) : undefined}
        ondragleave={handleDragLeave}
        ondrop={(e) => node.type === 'folder' ? handleDrop(e, node.path) : undefined}
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

  .tree-item.drag-over {
    background: var(--vault-accent);
    opacity: 0.15;
    border-radius: 4px;
  }

  .drag-over-root {
    outline: 2px dashed var(--vault-accent);
    outline-offset: -2px;
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

  .tree-button:focus {
    outline: none;
    background: var(--vault-bg-tertiary);
    box-shadow: inset 0 0 0 1px var(--vault-accent);
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
