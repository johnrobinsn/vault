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
  let currentContent = ''
  let savedContent = ''

  function markDirty(dirty: boolean) {
    const tab = tabs.tabs.find((t) => t.path === path)
    if (tab) tabs.markDirty(tab.id, dirty)
  }

  function updateCounts(text: string) {
    activeEditor.charCount = text.length
    activeEditor.wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  }

  function onContentChange(content: string) {
    currentContent = content
    markDirty(content !== savedContent)
    updateCounts(content)
  }

  /** Save the current note to the server. */
  export function saveNow() {
    if (currentContent === savedContent) return
    vault.saveNote(path, currentContent).then(() => {
      savedContent = currentContent
      markDirty(false)
    })
  }

  /** Returns true if there are unsaved changes. */
  export function isDirty(): boolean {
    return currentContent !== savedContent
  }

  async function loadContent() {
    const content = await vault.readNote(path)
    return content ?? ''
  }

  function handleWikiLinkClick(target: string) {
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
      const newPath = target.endsWith('.md') ? target : target + '.md'
      vault.service.createNote(newPath, `# ${target}\n`).then(() => {
        tabs.open(newPath)
      })
    }
  }

  onMount(async () => {
    const content = await loadContent()
    currentContent = content
    savedContent = content

    const opts: CreateEditorOptions = {
      parent: container,
      content,
      onChange: onContentChange,
      onClickWikiLink: handleWikiLinkClick,
      completionSource: {
        getNotes: () => vault.getNoteList(),
      },
    }

    editor = createEditor(opts)
    activeEditor.view = editor
    activeEditor.saveNow = saveNow
    updateCounts(content)
  })

  onDestroy(() => {
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
