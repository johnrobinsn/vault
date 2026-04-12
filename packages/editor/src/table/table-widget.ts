import { EditorView, WidgetType } from '@codemirror/view'
import type { Alignment, TableData } from './table-parser.js'
import { serializeTable } from './table-serializer.js'
import { enterTableSourceMode, exitTableSourceMode } from './table-plugin.js'

function cloneData(data: TableData): TableData {
  return {
    headers: [...data.headers],
    alignments: [...data.alignments],
    rows: data.rows.map((r) => [...r]),
  }
}

export class TableEditorWidget extends WidgetType {
  constructor(
    readonly data: TableData,
    readonly from: number,
    readonly to: number,
  ) {
    super()
  }

  eq(other: TableEditorWidget): boolean {
    const a = this.data
    const b = other.data
    if (a.headers.length !== b.headers.length || a.rows.length !== b.rows.length) return false
    for (let i = 0; i < a.headers.length; i++) {
      if (a.headers[i] !== b.headers[i] || a.alignments[i] !== b.alignments[i]) return false
    }
    for (let i = 0; i < a.rows.length; i++) {
      for (let j = 0; j < a.headers.length; j++) {
        if (a.rows[i][j] !== b.rows[i][j]) return false
      }
    }
    return true
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div')
    container.className = 'cm-table-editor'

    // Mutable local copy — edits happen here, committed to CM6 on blur-out
    const local = cloneData(this.data)
    const origFrom = this.from
    const origTo = this.to
    let dirty = false

    /**
     * Commit all pending edits to the CM6 document.
     * Only called when focus leaves the table entirely.
     */
    const flush = () => {
      if (!dirty) return
      dirty = false
      const markdown = serializeTable(local)
      const currentFrom = origFrom
      const currentTo = origTo
      view.dispatch({ changes: { from: currentFrom, to: currentTo, insert: markdown } })
    }

    /**
     * Structural change (add/remove row/col) — commit immediately since
     * the widget needs to rebuild.
     */
    const commitStructural = (updated: TableData) => {
      const markdown = serializeTable(updated)
      view.dispatch({ changes: { from: origFrom, to: origTo, insert: markdown } })
    }

    // Detect when focus leaves the table
    container.addEventListener('focusout', (e) => {
      const related = (e as FocusEvent).relatedTarget as HTMLElement | null
      // If focus moved to another element inside this container, don't flush
      if (related && container.contains(related)) return
      flush()
    })

    // --- Toolbar ---
    const toolbar = document.createElement('div')
    toolbar.className = 'cm-table-toolbar'

    const srcBtn = document.createElement('button')
    srcBtn.type = 'button'
    srcBtn.className = 'cm-table-btn'
    srcBtn.textContent = 'Source'
    srcBtn.title = 'Edit as markdown'
    srcBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      flush()
      view.dispatch({
        selection: { anchor: origFrom },
        effects: enterTableSourceMode.of({ from: origFrom, to: origTo }),
      })
    })
    toolbar.appendChild(srcBtn)

    const addRowBtn = document.createElement('button')
    addRowBtn.type = 'button'
    addRowBtn.className = 'cm-table-btn'
    addRowBtn.textContent = '+ Row'
    addRowBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const updated = cloneData(local)
      updated.rows.push(Array(local.headers.length).fill(''))
      commitStructural(updated)
    })
    toolbar.appendChild(addRowBtn)

    const addColBtn = document.createElement('button')
    addColBtn.type = 'button'
    addColBtn.className = 'cm-table-btn'
    addColBtn.textContent = '+ Col'
    addColBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const updated = cloneData(local)
      updated.headers.push('')
      updated.alignments.push(null)
      updated.rows.forEach((r) => r.push(''))
      commitStructural(updated)
    })
    toolbar.appendChild(addColBtn)

    container.appendChild(toolbar)

    // --- Table ---
    const table = document.createElement('table')
    table.className = 'cm-table'

    const allCells: HTMLTableCellElement[][] = []

    function createCell(
      tag: 'th' | 'td',
      value: string,
      align: Alignment,
      onEdit: (val: string) => void,
      rowIdx: number,
      colIdx: number,
    ): HTMLTableCellElement {
      const cell = document.createElement(tag)
      cell.className = 'cm-table-cell'
      cell.contentEditable = 'true'
      cell.spellcheck = false
      cell.textContent = value
      if (align) cell.style.textAlign = align

      cell.addEventListener('blur', () => {
        const next = cell.textContent ?? ''
        if (next !== value) {
          value = next
          onEdit(next)
        }
      })

      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault()
          e.stopPropagation()
          // Save current cell locally
          const next = cell.textContent ?? ''
          if (next !== value) { value = next; onEdit(next) }

          const cols = local.headers.length
          const totalRows = allCells.length
          let r = rowIdx
          let c = colIdx
          if (e.shiftKey) {
            c--
            if (c < 0) { c = cols - 1; r-- }
          } else {
            c++
            if (c >= cols) { c = 0; r++ }
          }
          if (r >= 0 && r < totalRows && allCells[r]?.[c]) {
            allCells[r][c].focus()
          }
        } else if (e.key === 'Enter') {
          e.preventDefault()
          e.stopPropagation()
          const next = cell.textContent ?? ''
          if (next !== value) { value = next; onEdit(next) }

          const nextRow = rowIdx + 1
          if (nextRow < allCells.length && allCells[nextRow]?.[colIdx]) {
            allCells[nextRow][colIdx].focus()
          } else {
            // Add new row — structural change, flush and rebuild
            const updated = cloneData(local)
            updated.rows.push(Array(local.headers.length).fill(''))
            commitStructural(updated)
          }
        } else if (e.key === 'Escape') {
          e.preventDefault()
          cell.blur()
          view.focus()
        }
      })

      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        // Flush current cell
        const next = cell.textContent ?? ''
        if (next !== value) { value = next; onEdit(next) }
        showContextMenu(e, rowIdx, colIdx, local, commitStructural, container)
      })

      return cell
    }

    // Header row
    const thead = document.createElement('thead')
    const headerTr = document.createElement('tr')
    const headerCells: HTMLTableCellElement[] = []
    local.headers.forEach((h, colIdx) => {
      const th = createCell('th', h, local.alignments[colIdx], (val) => {
        local.headers[colIdx] = val
        dirty = true
      }, 0, colIdx)
      headerCells.push(th)
      headerTr.appendChild(th)
    })
    thead.appendChild(headerTr)
    table.appendChild(thead)
    allCells.push(headerCells)

    // Data rows
    const tbody = document.createElement('tbody')
    local.rows.forEach((row, rowIdx) => {
      const tr = document.createElement('tr')
      const rowCells: HTMLTableCellElement[] = []
      row.forEach((cellVal, colIdx) => {
        const td = createCell('td', cellVal, local.alignments[colIdx], (val) => {
          local.rows[rowIdx][colIdx] = val
          dirty = true
        }, rowIdx + 1, colIdx)
        rowCells.push(td)
        tr.appendChild(td)
      })
      tbody.appendChild(tr)
      allCells.push(rowCells)
    })
    table.appendChild(tbody)
    container.appendChild(table)

    return container
  }

  ignoreEvent(): boolean {
    return true
  }
}

function showContextMenu(
  event: MouseEvent,
  rowIdx: number,
  colIdx: number,
  data: TableData,
  commit: (updated: TableData) => void,
  container: HTMLElement,
) {
  const existing = container.querySelector('.cm-table-context-menu')
  if (existing) existing.remove()

  const menu = document.createElement('div')
  menu.className = 'cm-table-context-menu'
  menu.style.left = `${event.clientX}px`
  menu.style.top = `${event.clientY}px`

  const isHeaderRow = rowIdx === 0

  const items: { label: string; action: () => void }[] = [
    {
      label: 'Insert Column Left',
      action: () => {
        const updated = cloneData(data)
        updated.headers.splice(colIdx, 0, '')
        updated.alignments.splice(colIdx, 0, null)
        updated.rows.forEach((r) => r.splice(colIdx, 0, ''))
        commit(updated)
      },
    },
    {
      label: 'Insert Column Right',
      action: () => {
        const updated = cloneData(data)
        updated.headers.splice(colIdx + 1, 0, '')
        updated.alignments.splice(colIdx + 1, 0, null)
        updated.rows.forEach((r) => r.splice(colIdx + 1, 0, ''))
        commit(updated)
      },
    },
    {
      label: 'Delete Column',
      action: () => {
        if (data.headers.length <= 1) return
        const updated = cloneData(data)
        updated.headers.splice(colIdx, 1)
        updated.alignments.splice(colIdx, 1)
        updated.rows.forEach((r) => r.splice(colIdx, 1))
        commit(updated)
      },
    },
  ]

  if (!isHeaderRow) {
    items.push(
      {
        label: 'Insert Row Above',
        action: () => {
          const updated = cloneData(data)
          updated.rows.splice(rowIdx - 1, 0, Array(data.headers.length).fill(''))
          commit(updated)
        },
      },
      {
        label: 'Insert Row Below',
        action: () => {
          const updated = cloneData(data)
          updated.rows.splice(rowIdx, 0, Array(data.headers.length).fill(''))
          commit(updated)
        },
      },
      {
        label: 'Delete Row',
        action: () => {
          const updated = cloneData(data)
          updated.rows.splice(rowIdx - 1, 1)
          commit(updated)
        },
      },
    )
  }

  items.push(
    { label: '---', action: () => {} },
    {
      label: 'Align Left',
      action: () => {
        const updated = cloneData(data)
        updated.alignments[colIdx] = 'left'
        commit(updated)
      },
    },
    {
      label: 'Align Center',
      action: () => {
        const updated = cloneData(data)
        updated.alignments[colIdx] = 'center'
        commit(updated)
      },
    },
    {
      label: 'Align Right',
      action: () => {
        const updated = cloneData(data)
        updated.alignments[colIdx] = 'right'
        commit(updated)
      },
    },
  )

  for (const item of items) {
    if (item.label === '---') {
      const sep = document.createElement('div')
      sep.className = 'cm-table-menu-sep'
      menu.appendChild(sep)
      continue
    }
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'cm-table-menu-item'
    btn.textContent = item.label
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      menu.remove()
      item.action()
    })
    menu.appendChild(btn)
  }

  const closeHandler = () => {
    menu.remove()
    document.removeEventListener('mousedown', closeHandler)
  }
  setTimeout(() => document.addEventListener('mousedown', closeHandler), 0)

  document.body.appendChild(menu)
}

/**
 * Widget shown above a table in source mode with a "Visual" button.
 */
export class TableSourceToggleWidget extends WidgetType {
  constructor(
    readonly from: number,
    readonly to: number,
  ) {
    super()
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div')
    container.className = 'cm-table-toolbar'

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'cm-table-btn'
    btn.textContent = 'Visual'
    btn.title = 'Switch to visual table editor'
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      view.dispatch({
        effects: exitTableSourceMode.of({ from: this.from, to: this.to }),
      })
    })
    container.appendChild(btn)

    return container
  }

  ignoreEvent(): boolean {
    return true
  }
}
