import { EditorView, keymap, highlightActiveLine, drawSelection } from '@codemirror/view'
import { EditorState, type Extension } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
} from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { livePreview } from './live-preview/index.js'
import { collapsibleHeadings } from './live-preview/collapse.js'
import { frontmatterEditor } from './frontmatter/index.js'
import { tableEditor } from './table/index.js'
import { wikilinkDecoration, setWikiLinkClickHandler } from './wikilink-decoration.js'
import { vaultEditorTheme } from './theme.js'
import {
  wikilinkCompletion,
  type WikiLinkCompletionSource,
} from './autocomplete/wikilink-completion.js'

export interface CreateEditorOptions {
  parent: HTMLElement
  content?: string
  onChange?: (content: string) => void
  onClickWikiLink?: (target: string) => void
  completionSource?: WikiLinkCompletionSource
  extensions?: Extension[]
}

export function createEditor({
  parent,
  content = '',
  onChange,
  onClickWikiLink,
  completionSource,
  extensions: extraExtensions = [],
}: CreateEditorOptions): EditorView {
  // Register wiki-link click handler for widget mousedown events
  setWikiLinkClickHandler(onClickWikiLink ?? null)

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && onChange) {
      onChange(update.state.doc.toString())
    }
  })

  // Click handler for wiki-links (both widget and syntax-highlighted forms)
  const clickHandler = EditorView.domEventHandlers({
    click(event: MouseEvent, view: EditorView) {
      if (!onClickWikiLink) return false
      const target = event.target as HTMLElement

      // Click on rendered widget (cursor on different line)
      if (target.classList.contains('cm-wikilink')) {
        const linkTarget = target.dataset.target
        if (linkTarget) {
          event.preventDefault()
          onClickWikiLink(linkTarget)
          return true
        }
      }

      // Ctrl/Cmd+Click on syntax-highlighted wiki-link text (cursor on same line)
      if (event.ctrlKey || event.metaKey) {
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (pos !== null) {
          const line = view.state.doc.lineAt(pos)
          const lineText = line.text
          const re = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g
          let match: RegExpExecArray | null
          while ((match = re.exec(lineText)) !== null) {
            const linkStart = line.from + match.index
            const linkEnd = linkStart + match[0].length
            if (pos >= linkStart && pos <= linkEnd) {
              event.preventDefault()
              onClickWikiLink(match[1].trim())
              return true
            }
          }
        }
      }

      return false
    },
  })

  // Override closeBrackets to not auto-close [ (interferes with [[ wiki-links)
  const closeBracketsConfig = EditorState.languageData.of(() => [
    { closeBrackets: { brackets: ['(', '{', "'", '"'] } },
  ])

  const baseExtensions: Extension[] = [
    vaultEditorTheme(),
    history(),
    drawSelection(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    bracketMatching(),
    closeBracketsConfig,
    closeBrackets(),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...closeBracketsKeymap,
      ...searchKeymap,
      indentWithTab,
    ]),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    syntaxHighlighting(defaultHighlightStyle),
    livePreview(),
    collapsibleHeadings(),
    frontmatterEditor(),
    tableEditor(),
    wikilinkDecoration(),
    updateListener,
    clickHandler,
    EditorView.lineWrapping,
  ]

  if (completionSource) {
    baseExtensions.push(wikilinkCompletion(completionSource))
  }

  const state = EditorState.create({
    doc: content,
    extensions: [...baseExtensions, ...extraExtensions],
  })

  return new EditorView({ state, parent })
}
