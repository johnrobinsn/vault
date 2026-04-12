import { syntaxTree } from '@codemirror/language'
import { type Extension, type Range, StateField, StateEffect } from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view'
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
        const toggleWidget = new TableSourceToggleWidget(node.from, node.to)
        decs.push(
          Decoration.widget({ widget: toggleWidget }).range(node.from),
        )
        for (let pos = node.from; pos <= node.to; ) {
          const line = state.doc.lineAt(pos)
          decs.push(Decoration.line({ class: 'cm-table-source-line' }).range(line.from))
          pos = line.to + 1
        }
      } else {
        const widget = new TableEditorWidget(data, node.from, node.to)
        decs.push(
          Decoration.replace({ widget }).range(node.from, node.to),
        )
      }
    },
  })

  return Decoration.set(decs.sort((a, b) => a.from - b.from), true)
}

/**
 * Check if any transaction's changes touch a table region.
 */
function docChangeOverlapsTable(update: ViewUpdate): boolean {
  for (const tr of update.transactions) {
    if (!tr.docChanged) continue
    let overlaps = false
    tr.changes.iterChangedRanges((fromA, toA) => {
      if (overlaps) return
      // Check in the OLD tree
      syntaxTree(tr.startState).iterate({
        from: Math.max(0, fromA - 1),
        to: Math.min(tr.startState.doc.length, toA + 1),
        enter(node) {
          if (node.type.name === 'Table') overlaps = true
        },
      })
      // Check in the NEW tree
      const fromB = tr.changes.mapPos(fromA)
      const toB = tr.changes.mapPos(toA)
      syntaxTree(update.state).iterate({
        from: Math.max(0, fromB - 1),
        to: Math.min(update.state.doc.length, toB + 1),
        enter(node) {
          if (node.type.name === 'Table') overlaps = true
        },
      })
    })
    if (overlaps) return true
  }
  return false
}

const tablePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    private treeLen = -1

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view.state)
      this.treeLen = syntaxTree(view.state).length
    }

    update(update: ViewUpdate) {
      const hasEffects = update.transactions.some((tr) =>
        tr.effects.some((e) => e.is(enterTableSourceMode) || e.is(exitTableSourceMode)),
      )

      // Always rebuild on source mode toggle
      if (hasEffects) {
        this.decorations = buildDecorations(update.state)
        this.treeLen = syntaxTree(update.state).length
        return
      }

      if (update.docChanged) {
        if (docChangeOverlapsTable(update)) {
          // Change touches a table — full rebuild
          this.decorations = buildDecorations(update.state)
        } else {
          // Change is outside tables — just map positions
          this.decorations = this.decorations.map(update.changes)
        }
        this.treeLen = syntaxTree(update.state).length
        return
      }

      // Check if the syntax tree grew (async parsing completed)
      const newTreeLen = syntaxTree(update.state).length
      if (newTreeLen !== this.treeLen) {
        this.treeLen = newTreeLen
        this.decorations = buildDecorations(update.state)
      }
    }
  },
  { decorations: (v) => v.decorations },
)

/**
 * Extension that provides visual table editing.
 */
export function tableEditor(): Extension {
  return [sourceModeTables, tablePlugin]
}
