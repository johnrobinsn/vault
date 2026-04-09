import { ViewPlugin, Decoration, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { type Extension } from '@codemirror/state'
import { buildDecorations, shouldUpdate, cursorOnLine } from './utils.js'

/**
 * Live preview for horizontal rules (---):
 * - Replaces `---` with a styled horizontal line when cursor is not on the line
 */
export function hrPreview(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: import('@codemirror/view').EditorView) {
        this.decorations = this.build(view)
      }

      update(update: ViewUpdate) {
        if (shouldUpdate(update)) {
          this.decorations = this.build(update.view)
        }
      }

      build(view: import('@codemirror/view').EditorView): DecorationSet {
        return buildDecorations(view, ['HorizontalRule'], (v, node) => {
          if (cursorOnLine(v, node.from, node.to)) return null
          return [Decoration.line({ class: 'cm-hr-line' }).range(v.state.doc.lineAt(node.from).from)]
        })
      }
    },
    { decorations: (v) => v.decorations },
  )
}
