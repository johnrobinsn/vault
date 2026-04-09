import { type EditorView } from '@codemirror/view'
import { type Range } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { type DecorationSet, Decoration, type ViewUpdate } from '@codemirror/view'

/**
 * Check if the cursor is on a given line.
 */
export function cursorOnLine(view: EditorView, lineFrom: number, lineTo: number): boolean {
  const { state } = view
  for (const range of state.selection.ranges) {
    const lineStart = state.doc.lineAt(lineFrom).number
    const lineEnd = state.doc.lineAt(Math.min(lineTo, state.doc.length)).number
    const cursorLine = state.doc.lineAt(range.head).number
    if (cursorLine >= lineStart && cursorLine <= lineEnd) return true
  }
  return false
}

/**
 * Build a decoration set by walking the syntax tree within the viewport.
 */
export function buildDecorations(
  view: EditorView,
  nodeTypes: string[],
  decorateNode: (
    view: EditorView,
    node: { type: string; from: number; to: number },
  ) => Range<Decoration>[] | null,
): DecorationSet {
  const decorations: Range<Decoration>[] = []
  const tree = syntaxTree(view.state)

  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter(node) {
        if (nodeTypes.includes(node.type.name)) {
          const result = decorateNode(view, {
            type: node.type.name,
            from: node.from,
            to: node.to,
          })
          if (result) {
            decorations.push(...result)
          }
        }
      },
    })
  }

  return Decoration.set(decorations, true)
}

export function shouldUpdate(update: ViewUpdate): boolean {
  return update.docChanged || update.viewportChanged || update.selectionSet
}
