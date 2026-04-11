<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { createEditor, type CreateEditorOptions } from '@vault/editor'
  import type { EditorView } from '@codemirror/view'
  import { vault } from '$lib/state/vault.svelte.js'
  import { tabs } from '$lib/state/tabs.svelte.js'
  import { activeEditor } from '$lib/state/editor.svelte.js'

  let { path }: { path: string } = $props()

  let container: HTMLDivElement
  let editor: EditorView | null = null
  let saveTimeout: ReturnType<typeof setTimeout> | null = null
  let currentContent = ''

  function markDirty(dirty: boolean) {
    const tab = tabs.tabs.find((t) => t.path === path)
    if (tab) tabs.markDirty(tab.id, dirty)
  }

  function debouncedSave(content: string) {
    currentContent = content
    if (saveTimeout) clearTimeout(saveTimeout)
    markDirty(true)
    saveTimeout = setTimeout(async () => {
      await vault.saveNote(path, content)
      saveTimeout = null
      markDirty(false)
    }, 500)
  }

  /** Immediately save (used by Ctrl+S). */
  export function saveNow() {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      saveTimeout = null
    }
    if (currentContent) {
      vault.saveNote(path, currentContent).then(() => markDirty(false))
    }
  }

  async function loadContent() {
    const content = await vault.readNote(path)
    return content ?? ''
  }

  function handleWikiLinkClick(target: string) {
    // Resolve the link
    const notes = vault.getNoteList()
    const normalizedTarget = target.toLowerCase()
    const match = notes.find((n) => {
      const stem = n.path.endsWith('.md') ? n.path.slice(0, -3) : n.path
      const name = stem.split('/').pop() ?? stem
      return name.toLowerCase() === normalizedTarget || stem.toLowerCase() === normalizedTarget
    })

    if (match) {
      tabs.open(match.path)
    } else {
      // Create new note
      const newPath = target.endsWith('.md') ? target : target + '.md'
      vault.service.createNote(newPath, `# ${target}\n`).then(() => {
        tabs.open(newPath)
      })
    }
  }

  onMount(async () => {
    const content = await loadContent()
    currentContent = content

    const opts: CreateEditorOptions = {
      parent: container,
      content,
      onChange: debouncedSave,
      onClickWikiLink: handleWikiLinkClick,
      completionSource: {
        getNotes: () => vault.getNoteList(),
      },
    }

    editor = createEditor(opts)
    activeEditor.view = editor
    activeEditor.saveNow = saveNow
  })

  onDestroy(() => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      vault.saveNote(path, currentContent)
    }
    if (editor) {
      if (activeEditor.view === editor) {
        activeEditor.view = null
        activeEditor.saveNow = null
      }
      editor.destroy()
    }
  })
</script>

<div class="editor-container" bind:this={container}></div>

<style>
  .editor-container {
    width: 100%;
    height: 100%;
    overflow: auto;
  }

  .editor-container :global(.cm-editor) {
    height: 100%;
  }

  .editor-container :global(.cm-scroller) {
    overflow: auto;
  }
</style>
