import { EditorView, keymap } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'

export interface CreateEditorOptions {
  parent: HTMLElement
  content?: string
  onChange?: (content: string) => void
}

export function createEditor({ parent, content = '', onChange }: CreateEditorOptions): EditorView {
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && onChange) {
      onChange(update.state.doc.toString())
    }
  })

  const state = EditorState.create({
    doc: content,
    extensions: [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown({ base: markdownLanguage }),
      syntaxHighlighting(defaultHighlightStyle),
      updateListener,
      EditorView.lineWrapping,
    ],
  })

  return new EditorView({ state, parent })
}
