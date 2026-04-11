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

    const data = this.data
    const from = this.from
    const to = this.to

    // Commit a change to the CM6 document
    const commit = (updated: TableData) => {
      const markdown = serializeTable(updated)
      view.dispatch({ changes: { from, to, insert: markdown } })
    }

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
      view.dispatch({
        selection: { anchor: from },
        effects: enterTableSourceMode.of({ from, to }),
      })
    })
    toolbar.appendChild(srcBtn)

    // Add row button
    const addRowBtn = document.createElement('button')
    addRowBtn.type = 'button'
    addRowBtn.className = 'cm-table-btn'
    addRowBtn.textContent = '+ Row'
    addRowBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const updated = cloneData(data)
      updated.rows.push(Array(data.headers.length).fill(''))
      commit(updated)
    })
    toolbar.appendChild(addRowBtn)

    // Add column button
    const addColBtn = document.createElement('button')
    addColBtn.type = 'button'
    addColBtn.className = 'cm-table-btn'
    addColBtn.textContent = '+ Col'
    addColBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const updated = cloneData(data)
      updated.headers.push('')
      updated.alignments.push(null)
      updated.rows.forEach((r) => r.push(''))
      commit(updated)
    })
    toolbar.appendChild(addColBtn)

    container.appendChild(toolbar)

    // --- Table ---
    const table = document.createElement('table')
    table.className = 'cm-table'

    // Track all cells for navigation
    const allCells: HTMLTableCellElement[][] = []

    function createCell(
      tag: 'th' | 'td',
      value: string,
      align: Alignment,
      onCommit: (val: string) => void,
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
          onCommit(next)
        }
      })

      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          e.preventDefault()
          e.stopPropagation()
          // Commit current cell
          const next = cell.textContent ?? ''
          if (next !== value) onCommit(next)

          // Move to next/prev cell
          const cols = data.headers.length
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
          if (next !== value) onCommit(next)

          // Move to same column in next row, or create new row
          const nextRow = rowIdx + 1
          if (nextRow < allCells.length && allCells[nextRow]?.[colIdx]) {
            allCells[nextRow][colIdx].focus()
          } else {
            // Add a new row and commit — the widget will rebuild
            const updated = cloneData(data)
            // Apply the current cell value first
            if (rowIdx === 0) {
              updated.headers[colIdx] = cell.textContent ?? ''
            } else {
              updated.rows[rowIdx - 1][colIdx] = cell.textContent ?? ''
            }
            updated.rows.push(Array(data.headers.length).fill(''))
            commit(updated)
          }
        } else if (e.key === 'Escape') {
          e.preventDefault()
          cell.blur()
          view.focus()
        }
      })

      // Context menu for row/column operations
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault()
        e.stopPropagation()
        showContextMenu(e, rowIdx, colIdx, data, commit, container)
      })

      return cell
    }

    // Header row
    const thead = document.createElement('thead')
    const headerTr = document.createElement('tr')
    const headerCells: HTMLTableCellElement[] = []
    data.headers.forEach((h, colIdx) => {
      const th = createCell('th', h, data.alignments[colIdx], (val) => {
        const updated = cloneData(data)
        updated.headers[colIdx] = val
        commit(updated)
      }, 0, colIdx)
      headerCells.push(th)
      headerTr.appendChild(th)
    })
    thead.appendChild(headerTr)
    table.appendChild(thead)
    allCells.push(headerCells)

    // Data rows
    const tbody = document.createElement('tbody')
    data.rows.forEach((row, rowIdx) => {
      const tr = document.createElement('tr')
      const rowCells: HTMLTableCellElement[] = []
      row.forEach((cellVal, colIdx) => {
        const td = createCell('td', cellVal, data.alignments[colIdx], (val) => {
          const updated = cloneData(data)
          updated.rows[rowIdx][colIdx] = val
          commit(updated)
        }, rowIdx + 1, colIdx) // +1 because header is row 0
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
  // Remove any existing context menu
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

  // Alignment options
  items.push(
    { label: '---', action: () => {} }, // separator
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

  // Close on click outside
  const closeHandler = () => {
    menu.remove()
    document.removeEventListener('mousedown', closeHandler)
  }
  setTimeout(() => document.addEventListener('mousedown', closeHandler), 0)

  document.body.appendChild(menu)
}

/**
 * Small widget shown above a table in source mode with a "Visual" button
 * to switch back to the interactive table view.
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
