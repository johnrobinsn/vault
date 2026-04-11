import type { EditorView } from '@codemirror/view'

/** Shared reference to the currently active CodeMirror editor view and save function. */
class EditorState {
  view = $state<EditorView | null>(null)
  /** Call this to immediately save the current note (flushes debounce). */
  saveNow = $state<(() => void) | null>(null)
}

export const activeEditor = new EditorState()
