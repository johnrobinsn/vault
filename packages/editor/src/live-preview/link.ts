import { ViewPlugin, Decoration, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { type Extension } from '@codemirror/state'
import { buildDecorations, shouldUpdate, cursorOnLine } from './utils.js'

/**
 * Live preview for markdown links [text](url):
 * - When cursor is not on the line, show only the link text with link styling
 * - Hides [, ](url) syntax
 */
export function linkPreview(): Extension {
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
        return buildDecorations(view, ['Link'], (v, node) => {
          const text = v.state.doc.sliceString(node.from, node.to)
          const match = text.match(/^\[([^\]]*)\]\(([^)]*)\)$/)
          if (!match) return null

          const decorations = []
          const linkTextStart = node.from + 1
          const linkTextEnd = node.from + 1 + match[1].length

          // Apply link styling to the text part
          decorations.push(
            Decoration.mark({ class: 'cm-link-text' }).range(linkTextStart, linkTextEnd),
          )

          // Hide syntax when cursor is not on this line
          if (!cursorOnLine(v, node.from, node.to)) {
            // Hide opening [
            decorations.push(Decoration.replace({}).range(node.from, node.from + 1))
            // Hide ](url)
            decorations.push(Decoration.replace({}).range(linkTextEnd, node.to))
          }

          return decorations
        })
      }
    },
    { decorations: (v) => v.decorations },
  )
}
