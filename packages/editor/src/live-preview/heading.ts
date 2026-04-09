import { ViewPlugin, Decoration, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { type Extension } from '@codemirror/state'
import { buildDecorations, shouldUpdate, cursorOnLine } from './utils.js'

const headingStyles = [
  Decoration.line({ class: 'cm-heading-1' }),
  Decoration.line({ class: 'cm-heading-2' }),
  Decoration.line({ class: 'cm-heading-3' }),
  Decoration.line({ class: 'cm-heading-4' }),
  Decoration.line({ class: 'cm-heading-5' }),
  Decoration.line({ class: 'cm-heading-6' }),
]

const HEADING_TYPES = [
  'ATXHeading1',
  'ATXHeading2',
  'ATXHeading3',
  'ATXHeading4',
  'ATXHeading5',
  'ATXHeading6',
]

/**
 * Live preview for headings:
 * - Applies heading-level CSS class for font size styling
 * - Hides the `# ` marks when cursor is not on the heading line
 */
export function headingPreview(): Extension {
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
        return buildDecorations(view, HEADING_TYPES, (v, node) => {
          const level = parseInt(node.type.slice(-1)) - 1
          const line = v.state.doc.lineAt(node.from)
          const decorations = []

          // Always apply heading style class
          decorations.push(headingStyles[level].range(line.from))

          // Hide hash marks when cursor is NOT on this line
          if (!cursorOnLine(v, node.from, node.to)) {
            // Find the HeaderMark (the `# ` part)
            const text = v.state.doc.sliceString(line.from, line.to)
            const match = text.match(/^(#{1,6})\s/)
            if (match) {
              decorations.push(
                Decoration.replace({}).range(line.from, line.from + match[0].length),
              )
            }
          }

          return decorations
        })
      }
    },
    { decorations: (v) => v.decorations },
  )
}
