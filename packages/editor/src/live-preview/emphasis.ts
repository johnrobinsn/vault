import { ViewPlugin, Decoration, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { type Extension } from '@codemirror/state'
import { buildDecorations, shouldUpdate, cursorOnLine } from './utils.js'

const EMPHASIS_TYPES = ['Emphasis', 'StrongEmphasis', 'Strikethrough']

/**
 * Live preview for emphasis (italic, bold, strikethrough):
 * - Hides `*`, `**`, `~~` markers when cursor is not on the same line
 * - Applies inline styling via mark decorations
 */
export function emphasisPreview(): Extension {
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
        return buildDecorations(view, EMPHASIS_TYPES, (v, node) => {
          const text = v.state.doc.sliceString(node.from, node.to)
          const decorations = []

          let markerLen: number
          let className: string

          if (node.type === 'StrongEmphasis') {
            markerLen = 2
            className = 'cm-strong'
          } else if (node.type === 'Strikethrough') {
            markerLen = 2
            className = 'cm-strikethrough'
          } else {
            // Emphasis — could be * or _
            markerLen = 1
            className = 'cm-em'
          }

          // Apply styling to the content
          if (node.to - node.from > markerLen * 2) {
            decorations.push(
              Decoration.mark({ class: className }).range(
                node.from + markerLen,
                node.to - markerLen,
              ),
            )
          }

          // Hide markers when cursor is not on this line
          if (!cursorOnLine(v, node.from, node.to) && text.length > markerLen * 2) {
            decorations.push(
              Decoration.replace({}).range(node.from, node.from + markerLen),
              Decoration.replace({}).range(node.to - markerLen, node.to),
            )
          }

          return decorations
        })
      }
    },
    { decorations: (v) => v.decorations },
  )
}
