import {
  ViewPlugin,
  Decoration,
  type DecorationSet,
  type ViewUpdate,
  type EditorView,
} from '@codemirror/view'
import { type Extension, type Range } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'

/**
 * Single unified ViewPlugin for Obsidian-style live preview.
 *
 * Walks the Lezer syntax tree once per update and produces one sorted
 * DecorationSet. Uses actual child node positions (HeaderMark, EmphasisMark,
 * CodeMark, LinkMark, etc.) rather than guessing marker lengths.
 */
export function livePreview(): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = buildDecorations(update.view)
        }
      }
    },
    { decorations: (v) => v.decorations },
  )
}

// --- Heading styles (line decorations) ---

const headingLineDecos = [
  Decoration.line({ class: 'cm-heading-1' }),
  Decoration.line({ class: 'cm-heading-2' }),
  Decoration.line({ class: 'cm-heading-3' }),
  Decoration.line({ class: 'cm-heading-4' }),
  Decoration.line({ class: 'cm-heading-5' }),
  Decoration.line({ class: 'cm-heading-6' }),
]

const HEADING_TYPES = new Set([
  'ATXHeading1',
  'ATXHeading2',
  'ATXHeading3',
  'ATXHeading4',
  'ATXHeading5',
  'ATXHeading6',
])

// --- Core decoration builder ---

function buildDecorations(view: EditorView): DecorationSet {
  const decs: Range<Decoration>[] = []
  const { state } = view
  const tree = syntaxTree(state)

  // Collect all cursor line numbers for multi-cursor support
  const cursorLines = new Set<number>()
  for (const range of state.selection.ranges) {
    cursorLines.add(state.doc.lineAt(range.head).number)
    if (!range.empty) {
      cursorLines.add(state.doc.lineAt(range.anchor).number)
    }
  }

  function isCursorOnNode(from: number, to: number): boolean {
    const startLine = state.doc.lineAt(from).number
    const endLine = state.doc.lineAt(Math.min(to, state.doc.length)).number
    for (const cursorLine of cursorLines) {
      if (cursorLine >= startLine && cursorLine <= endLine) return true
    }
    return false
  }

  /** Collect child nodes of a given type from a parent node. */
  function childrenOfType(parent: SyntaxNode, typeName: string): { from: number; to: number }[] {
    const children: { from: number; to: number }[] = []
    let child = parent.firstChild
    while (child) {
      if (child.type.name === typeName) {
        children.push({ from: child.from, to: child.to })
      }
      child = child.nextSibling
    }
    return children
  }

  for (const { from, to } of view.visibleRanges) {
    tree.iterate({
      from,
      to,
      enter(nodeRef) {
        const name = nodeRef.type.name
        const nFrom = nodeRef.from
        const nTo = nodeRef.to

        // --- ATX Headings ---
        if (HEADING_TYPES.has(name)) {
          const level = parseInt(name.slice(-1)) - 1
          const line = state.doc.lineAt(nFrom)

          // Always apply heading font-size class (line decoration)
          decs.push(headingLineDecos[level].range(line.from))

          // Hide HeaderMark (the `# ` prefix) when cursor is away
          if (!isCursorOnNode(nFrom, nTo)) {
            const node = nodeRef.node
            const marks = childrenOfType(node, 'HeaderMark')
            for (const mark of marks) {
              // Include the space after the last hash
              const hideEnd = Math.min(mark.to + 1, line.to)
              decs.push(Decoration.replace({}).range(mark.from, hideEnd))
            }
          }
          return false // Don't descend into heading children
        }

        // --- Emphasis (*italic* or _italic_) ---
        if (name === 'Emphasis') {
          const node = nodeRef.node
          const marks = childrenOfType(node, 'EmphasisMark')
          if (marks.length >= 2) {
            const openMark = marks[0]
            const closeMark = marks[marks.length - 1]

            // Style the content between marks
            if (closeMark.from > openMark.to) {
              decs.push(
                Decoration.mark({ class: 'cm-em' }).range(openMark.to, closeMark.from),
              )
            }

            // Hide markers when cursor is away
            if (!isCursorOnNode(nFrom, nTo)) {
              decs.push(Decoration.replace({}).range(openMark.from, openMark.to))
              decs.push(Decoration.replace({}).range(closeMark.from, closeMark.to))
            }
          }
          return false
        }

        // --- Strong Emphasis (**bold**) ---
        if (name === 'StrongEmphasis') {
          const node = nodeRef.node
          const marks = childrenOfType(node, 'EmphasisMark')
          if (marks.length >= 2) {
            const openMark = marks[0]
            const closeMark = marks[marks.length - 1]

            if (closeMark.from > openMark.to) {
              decs.push(
                Decoration.mark({ class: 'cm-strong' }).range(openMark.to, closeMark.from),
              )
            }

            if (!isCursorOnNode(nFrom, nTo)) {
              decs.push(Decoration.replace({}).range(openMark.from, openMark.to))
              decs.push(Decoration.replace({}).range(closeMark.from, closeMark.to))
            }
          }
          return false
        }

        // --- Strikethrough (~~text~~) ---
        if (name === 'Strikethrough') {
          const node = nodeRef.node
          const marks = childrenOfType(node, 'StrikethroughMark')
          if (marks.length >= 2) {
            const openMark = marks[0]
            const closeMark = marks[marks.length - 1]

            if (closeMark.from > openMark.to) {
              decs.push(
                Decoration.mark({ class: 'cm-strikethrough' }).range(
                  openMark.to,
                  closeMark.from,
                ),
              )
            }

            if (!isCursorOnNode(nFrom, nTo)) {
              decs.push(Decoration.replace({}).range(openMark.from, openMark.to))
              decs.push(Decoration.replace({}).range(closeMark.from, closeMark.to))
            }
          }
          return false
        }

        // --- Inline Code (`code` or ``code``) ---
        if (name === 'InlineCode') {
          const node = nodeRef.node
          const marks = childrenOfType(node, 'CodeMark')
          if (marks.length >= 2) {
            const openMark = marks[0]
            const closeMark = marks[marks.length - 1]

            if (closeMark.from > openMark.to) {
              decs.push(
                Decoration.mark({ class: 'cm-inline-code' }).range(
                  openMark.to,
                  closeMark.from,
                ),
              )
            }

            if (!isCursorOnNode(nFrom, nTo)) {
              decs.push(Decoration.replace({}).range(openMark.from, openMark.to))
              decs.push(Decoration.replace({}).range(closeMark.from, closeMark.to))
            }
          }
          return false
        }

        // --- Links [text](url) ---
        if (name === 'Link') {
          const node = nodeRef.node
          const linkMarks = childrenOfType(node, 'LinkMark')
          const urls = childrenOfType(node, 'URL')

          // A standard link has LinkMark children: [, ], (, )
          // We want to hide everything except the link text
          if (linkMarks.length >= 3) {
            // The text content is between first LinkMark ] and next
            const openBracket = linkMarks[0] // [
            const closeBracket = linkMarks[1] // ]
            const textFrom = openBracket.to
            const textTo = closeBracket.from

            if (textTo > textFrom) {
              decs.push(
                Decoration.mark({ class: 'cm-link-text' }).range(textFrom, textTo),
              )
            }

            if (!isCursorOnNode(nFrom, nTo)) {
              // Hide opening [
              decs.push(Decoration.replace({}).range(openBracket.from, openBracket.to))
              // Hide ](url) — from ] to end of node
              decs.push(Decoration.replace({}).range(closeBracket.from, nTo))
            }
          }
          return false
        }

        // --- Horizontal Rule (--- or *** or ___) ---
        if (name === 'HorizontalRule') {
          if (!isCursorOnNode(nFrom, nTo)) {
            const line = state.doc.lineAt(nFrom)
            decs.push(Decoration.line({ class: 'cm-hr-line' }).range(line.from))
          }
        }
      },
    })
  }

  return Decoration.set(decs, true)
}
