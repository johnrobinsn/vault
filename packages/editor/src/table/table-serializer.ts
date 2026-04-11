import type { Alignment, TableData } from './table-parser.js'

/**
 * Serialize structured table data back to padded GFM markdown.
 */
export function serializeTable(data: TableData): string {
  const { headers, alignments, rows } = data
  const cols = headers.length

  // Calculate column widths (minimum 3 for separator dashes)
  const widths = headers.map((h, i) => {
    let max = Math.max(3, h.length)
    for (const row of rows) {
      max = Math.max(max, (row[i] ?? '').length)
    }
    return max
  })

  function padCell(text: string, colIdx: number): string {
    return text.padEnd(widths[colIdx])
  }

  function formatRow(cells: string[]): string {
    const padded = cells.map((c, i) => ` ${padCell(c, i)} `)
    return '|' + padded.join('|') + '|'
  }

  function formatSeparator(): string {
    const seps = alignments.map((align, i) => {
      const w = widths[i]
      const dashes = '-'.repeat(w)
      if (align === 'center') return ':' + dashes.slice(1, -1) + ':'
      if (align === 'right') return dashes.slice(0, -1) + ':'
      if (align === 'left') return ':' + dashes.slice(1)
      return dashes
    })
    return '|' + seps.map((s) => ` ${s} `).join('|') + '|'
  }

  const lines = [
    formatRow(headers),
    formatSeparator(),
    ...rows.map((row) => formatRow(row.map((c, i) => c ?? ''))),
  ]

  return lines.join('\n')
}

/**
 * Create a blank table with the given dimensions.
 */
export function createBlankTable(cols: number, rows: number): string {
  const headers = Array.from({ length: cols }, (_, i) => `Header ${i + 1}`)
  const alignments: Alignment[] = Array(cols).fill(null)
  const dataRows = Array.from({ length: rows }, () => Array(cols).fill(''))
  return serializeTable({ headers, alignments, rows: dataRows })
}
