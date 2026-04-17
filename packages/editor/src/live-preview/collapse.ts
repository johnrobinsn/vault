import {
  StateField,
  StateEffect,
  type Extension,
  type Range,
} from '@codemirror/state'
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'

/** Effect to toggle collapse at a heading position */
export const toggleCollapse = StateEffect.define<number>()

/**
 * Tracks which heading positions are collapsed.
 * Stores the document position of each collapsed heading's line start.
 */
const collapsedHeadings = StateField.define<Set<number>>({
  create: () => new Set(),
  update(collapsed, tr) {
    // Map positions through doc changes
    const next = new Set<number>()
    for (const pos of collapsed) {
      const mapped = tr.changes.mapPos(pos, 1)
      if (mapped <= tr.newDoc.length) next.add(mapped)
    }
    // Apply toggle effects
    for (const effect of tr.effects) {
      if (effect.is(toggleCollapse)) {
        if (next.has(effect.value)) {
          next.delete(effect.value)
        } else {
          next.add(effect.value)
        }
      }
    }
    return next
  },
})

class TwistieWidget extends WidgetType {
  constructor(
    readonly collapsed: boolean,
    readonly pos: number,
  ) {
    super()
  }

  eq(other: TwistieWidget): boolean {
    return this.collapsed === other.collapsed
  }

  toDOM(view: EditorView): HTMLElement {
    const span = document.createElement('span')
    span.className = `cm-twistie ${this.collapsed ? 'cm-twistie-collapsed' : 'cm-twistie-expanded'}`
    span.textContent = this.collapsed ? '▶' : '▼'
    span.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      view.dispatch({ effects: toggleCollapse.of(this.pos) })
    })
    return span
  }

  ignoreEvent(): boolean {
    return false
  }
}

const HEADING_TYPES = new Set([
  'ATXHeading1', 'ATXHeading2', 'ATXHeading3',
  'ATXHeading4', 'ATXHeading5', 'ATXHeading6',
])

function headingLevel(name: string): number {
  return parseInt(name.slice(-1))
}

/**
 * ViewPlugin that adds twisties to headings and hides collapsed sections.
 */
const collapsePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view)
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        update.transactions.some((tr) =>
          tr.effects.some((e) => e.is(toggleCollapse)),
        )
      ) {
        this.decorations = buildDecorations(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations },
)

function buildDecorations(view: EditorView): DecorationSet {
  const decs: Range<Decoration>[] = []
  const { state } = view
  const collapsed = state.field(collapsedHeadings)
  const tree = syntaxTree(state)

  // Collect all headings with their positions and levels
  const headings: { from: number; to: number; level: number; lineFrom: number }[] = []
  tree.iterate({
    enter(node) {
      if (HEADING_TYPES.has(node.type.name)) {
        const line = state.doc.lineAt(node.from)
        headings.push({
          from: node.from,
          to: node.to,
          level: headingLevel(node.type.name),
          lineFrom: line.from,
        })
      }
    },
  })

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i]
    const isCollapsed = collapsed.has(h.lineFrom)

    // Add twistie widget before the heading
    decs.push(
      Decoration.widget({
        widget: new TwistieWidget(isCollapsed, h.lineFrom),
        side: -1,
      }).range(h.from),
    )

    // If collapsed, hide lines from after the heading to the next heading
    // of equal or higher level (or end of doc)
    if (isCollapsed) {
      const headingLine = state.doc.lineAt(h.from)
      const startHide = headingLine.to + 1 // start of next line

      // Find where to stop hiding
      let endHide = state.doc.length
      for (let j = i + 1; j < headings.length; j++) {
        if (headings[j].level <= h.level) {
          // Stop before this heading's line
          const stopLine = state.doc.lineAt(headings[j].from)
          endHide = stopLine.from > 0 ? stopLine.from - 1 : 0
          break
        }
      }

      if (startHide < endHide && startHide < state.doc.length) {
        // Apply hidden class to each line in the collapsed range
        for (let pos = startHide; pos <= endHide && pos < state.doc.length; ) {
          const line = state.doc.lineAt(pos)
          decs.push(Decoration.line({ class: 'cm-collapsed-line' }).range(line.from))
          pos = line.to + 1
        }
      }
    }
  }

  return Decoration.set(decs.sort((a, b) => a.from - b.from), true)
}

/**
 * Extension that adds collapsible sections to headings.
 */
export function collapsibleHeadings(): Extension {
  return [collapsedHeadings, collapsePlugin]
}
