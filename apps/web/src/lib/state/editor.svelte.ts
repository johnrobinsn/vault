import type { EditorView } from '@codemirror/view'

/** Shared reference to the currently active CodeMirror editor view and save function. */
class EditorState {
  view = $state<EditorView | null>(null)
  saveNow = $state<(() => void) | null>(null)
  /** Word count, updated on every doc change */
  wordCount = $state(0)
  /** Character count, updated on every doc change */
  charCount = $state(0)
}

export const activeEditor = new EditorState()
