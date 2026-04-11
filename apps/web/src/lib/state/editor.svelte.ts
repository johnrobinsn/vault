import type { EditorView } from '@codemirror/view'

/** Shared reference to the currently active CodeMirror editor view. */
class EditorState {
  view = $state<EditorView | null>(null)
}

export const activeEditor = new EditorState()
