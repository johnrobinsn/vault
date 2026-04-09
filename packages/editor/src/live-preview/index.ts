import { type Extension } from '@codemirror/state'
import { headingPreview } from './heading.js'
import { emphasisPreview } from './emphasis.js'
import { codePreview } from './code.js'
import { linkPreview } from './link.js'
import { hrPreview } from './hr.js'

/**
 * Bundle of all live preview extensions.
 * Hides markdown syntax when cursor is not on the same line.
 */
export function livePreview(): Extension {
  return [headingPreview(), emphasisPreview(), codePreview(), linkPreview(), hrPreview()]
}
