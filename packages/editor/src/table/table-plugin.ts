import { syntaxTree } from '@codemirror/language'
import { type Extension, type Range, StateField, StateEffect } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView } from '@codemirror/view'
import { parseTable } from './table-parser.js'
import { TableEditorWidget, TableSourceToggleWidget } from './table-widget.js'

interface SourceRange {
  from: number
  to: number
}

/** Effect to toggle a table into source (raw markdown) mode */
export const enterTableSourceMode = StateEffect.define<SourceRange>()
/** Effect to toggle a table back into visual mode */
export const exitTableSourceMode = StateEffect.define<SourceRange>()

/**
 * Tracks which tables are currently in source mode.
 */
const sourceModeTables = StateField.define<SourceRange[]>({
  create: () => [],
  update(ranges, tr) {
    // Map positions through document changes
    let next = ranges.map((r) => ({
      from: tr.changes.mapPos(r.from, 1),
      to: tr.changes.mapPos(r.to, -1),
    }))

    for (const effect of tr.effects) {
      if (effect.is(enterTableSourceMode)) {
        const mapped = {
          from: tr.changes.mapPos(effect.value.from, 1),
          to: tr.changes.mapPos(effect.value.to, -1),
        }
        // Add if not already present
        if (!next.some((r) => r.from <= mapped.to && r.to >= mapped.from)) {
          next = [...next, mapped]
        }
      } else if (effect.is(exitTableSourceMode)) {
        const mapped = {
          from: tr.changes.mapPos(effect.value.from, 1),
          to: tr.changes.mapPos(effect.value.to, -1),
        }
        next = next.filter((r) => !(r.from <= mapped.to && r.to >= mapped.from))
      }
    }

    return next
  },
})

function isInSourceMode(ranges: SourceRange[], from: number, to: number): boolean {
  return ranges.some((r) => r.from <= to && r.to >= from)
}

/**
 * StateField that builds table decorations.
 */
const tableDecorations = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state)
  },
  update(deco, tr) {
    if (
      tr.docChanged ||
      tr.reconfigured ||
      tr.effects.some((e) => e.is(enterTableSourceMode) || e.is(exitTableSourceMode))
    ) {
      return buildDecorations(tr.state)
    }
    return deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

function buildDecorations(state: import('@codemirror/state').EditorState): DecorationSet {
  const decs: Range<Decoration>[] = []
  const sourceRanges = state.field(sourceModeTables)

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== 'Table') return

      const tableSource = state.doc.sliceString(node.from, node.to)
      const data = parseTable(tableSource)
      if (!data) return

      if (isInSourceMode(sourceRanges, node.from, node.to)) {
        // In source mode — show a "Visual" toggle button above the raw markdown
        const toggleWidget = new TableSourceToggleWidget(node.from, node.to)
        decs.push(
          Decoration.widget({ widget: toggleWidget, block: true }).range(node.from),
        )
        // Highlight source lines
        for (let pos = node.from; pos <= node.to; ) {
          const line = state.doc.lineAt(pos)
          decs.push(Decoration.line({ class: 'cm-table-source-line' }).range(line.from))
          pos = line.to + 1
        }
      } else {
        // Visual mode — replace the entire table with the interactive widget
        const widget = new TableEditorWidget(data, node.from, node.to)
        decs.push(
          Decoration.replace({ widget, block: true }).range(node.from, node.to),
        )
      }
    },
  })

  return Decoration.set(decs.sort((a, b) => a.from - b.from), true)
}

/**
 * Extension that provides visual table editing.
 */
export function tableEditor(): Extension {
  return [sourceModeTables, tableDecorations]
}
