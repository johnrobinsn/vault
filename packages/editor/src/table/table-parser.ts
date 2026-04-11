export type Alignment = 'left' | 'center' | 'right' | null

export interface TableData {
  headers: string[]
  alignments: Alignment[]
  rows: string[][]
}

/**
 * Parse a row of pipe-delimited cells, handling escaped pipes.
 */
function parseRow(line: string): string[] {
  // Replace escaped pipes with placeholder
  const PH = '\x00PIPE\x00'
  const escaped = line.replace(/\\\|/g, PH)
  const cells = escaped.split('|')

  // Remove empty leading/trailing cells from | col | col | format
  if (cells.length > 0 && cells[0].trim() === '') cells.shift()
  if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop()

  return cells.map((c) => c.replaceAll(PH, '|').trim())
}

function parseAlignment(cell: string): Alignment {
  const t = cell.trim()
  const left = t.startsWith(':')
  const right = t.endsWith(':')
  if (left && right) return 'center'
  if (right) return 'right'
  if (left) return 'left'
  return null
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c.trim()))
}

/**
 * Parse GFM markdown table source into structured data.
 */
export function parseTable(source: string): TableData | null {
  const lines = source.split('\n').filter((l) => l.trim() !== '')
  if (lines.length < 2) return null

  const headers = parseRow(lines[0])
  if (headers.length === 0) return null

  const sepCells = parseRow(lines[1])
  if (!isSeparatorRow(sepCells)) return null
  if (headers.length !== sepCells.length) return null

  const alignments = sepCells.map(parseAlignment)

  const rows: string[][] = []
  for (let i = 2; i < lines.length; i++) {
    const cells = parseRow(lines[i])
    // Pad or truncate to column count
    const row = headers.map((_, idx) => cells[idx] ?? '')
    rows.push(row)
  }

  return { headers, alignments, rows }
}
