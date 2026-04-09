import { ViewPlugin, Decoration, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { type Extension } from '@codemirror/state'
import { buildDecorations, shouldUpdate, cursorOnLine } from './utils.js'

/**
 * Live preview for inline code:
 * - Hides backtick markers when cursor is not on the same line
 * - Applies inline code styling
 */
export function codePreview(): Extension {
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
        return buildDecorations(view, ['InlineCode'], (v, node) => {
          const decorations = []

          // Apply code styling to content between backticks
          if (node.to - node.from > 2) {
            decorations.push(
              Decoration.mark({ class: 'cm-inline-code' }).range(node.from + 1, node.to - 1),
            )
          }

          // Hide backticks when cursor is not on this line
          if (!cursorOnLine(v, node.from, node.to) && node.to - node.from > 2) {
            decorations.push(
              Decoration.replace({}).range(node.from, node.from + 1),
              Decoration.replace({}).range(node.to - 1, node.to),
            )
          }

          return decorations
        })
      }
    },
    { decorations: (v) => v.decorations },
  )
}
