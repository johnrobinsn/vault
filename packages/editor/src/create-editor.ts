import { EditorView, keymap, highlightActiveLine, drawSelection } from '@codemirror/view'
import { EditorState, type Extension } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
} from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { livePreview } from './live-preview/index.js'
import { wikilinkDecoration } from './wikilink-decoration.js'
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
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged && onChange) {
      onChange(update.state.doc.toString())
    }
  })

  // Click handler for wiki-links
  const clickHandler = EditorView.domEventHandlers({
    click(event: MouseEvent, view: EditorView) {
      if (!onClickWikiLink) return false
      const target = event.target as HTMLElement
      if (target.classList.contains('cm-wikilink') && (event.ctrlKey || event.metaKey)) {
        const linkTarget = target.dataset.target
        if (linkTarget) {
          onClickWikiLink(linkTarget)
          return true
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
    markdown({ base: markdownLanguage }),
    syntaxHighlighting(defaultHighlightStyle),
    livePreview(),
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
