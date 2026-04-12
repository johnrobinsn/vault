/**
 * Debug utility: sends editor DOM analysis to /tmp/vault-debug.json via server.
 * Runs automatically on file open and scroll. Call window.__debugDecorations() manually.
 */

import { activeEditor } from './state/editor.svelte.js'
import { tabs } from './state/tabs.svelte.js'

async function sendDebugReport() {
  const view = activeEditor.view
  if (!view) {
    await postLog({ error: 'No active editor' })
    return
  }

  const doc = view.state.doc
  const report: Record<string, unknown> = {
    file: tabs.activeTab?.path ?? 'unknown',
    docLength: doc.length,
    docLines: doc.lines,
    visibleRanges: view.visibleRanges.map(r => ({ from: r.from, to: r.to })),
  }

  const cmContent = view.contentDOM
  const gaps: Record<string, unknown>[] = []
  const widgets: Record<string, unknown>[] = []
  const emptyLines: Record<string, unknown>[] = []

  for (const child of cmContent.children) {
    const el = child as HTMLElement
    const rect = el.getBoundingClientRect()
    const classes = el.className || ''

    if (classes.includes('cm-widgetBuffer') || classes.includes('cm-gap')) {
      gaps.push({ type: classes, height: Math.round(rect.height) })
    }

    if (classes.includes('cm-table-editor')) {
      widgets.push({
        height: Math.round(rect.height),
        childCount: el.children.length,
        hasTable: el.querySelector('table') !== null,
      })
    }

    if (classes.includes('cm-line') && rect.height > 0) {
      const text = el.textContent || ''
      if (text === '' || text === '\u200b' || text === '\n') {
        const prev = el.previousElementSibling
        const next = el.nextElementSibling
        emptyLines.push({
          height: Math.round(rect.height),
          prevClass: prev?.className?.slice(0, 50) || 'none',
          nextClass: next?.className?.slice(0, 50) || 'none',
        })
      }
    }
  }

  const allLines = cmContent.querySelectorAll('.cm-line')
  const scroller = view.scrollDOM
  report.gaps = gaps
  report.tableWidgets = widgets
  report.emptyLines = emptyLines
  report.totalChildren = cmContent.children.length
  report.renderedLineCount = allLines.length
  report.scrollTop = Math.round(scroller.scrollTop)
  report.scrollHeight = Math.round(scroller.scrollHeight)
  report.clientHeight = Math.round(scroller.clientHeight)

  await postLog(report)
}

async function postLog(data: Record<string, unknown>) {
  try {
    await fetch('/api/debug/editor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data, null, 2),
    })
  } catch {
    // Server might not have the endpoint
  }
}

let debugTimer: ReturnType<typeof setTimeout> | null = null
export function scheduleDebugReport() {
  if (debugTimer) clearTimeout(debugTimer)
  debugTimer = setTimeout(sendDebugReport, 2000)
}

if (typeof window !== 'undefined') {
  (window as any).__debugDecorations = sendDebugReport
}
