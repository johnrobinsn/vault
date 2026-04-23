import { EditorView, WidgetType } from '@codemirror/view'
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { toggleFrontmatterSource } from './frontmatter-plugin.js'

type PropValue = string | number | boolean | string[] | null

interface Property {
  key: string
  value: PropValue
}

export class FrontmatterWidget extends WidgetType {
  private yamlSource: string
  private from: number
  private to: number

  constructor(yamlSource: string, from: number, to: number, _view: EditorView) {
    super()
    this.yamlSource = yamlSource
    this.from = from
    this.to = to
  }

  eq(other: FrontmatterWidget): boolean {
    return this.yamlSource === other.yamlSource
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div')
    container.className = 'cm-frontmatter-editor'

    let data: Record<string, PropValue> = {}
    try {
      const parsed = parseYaml(this.yamlSource)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        data = parsed as Record<string, PropValue>
      }
    } catch {
      container.innerHTML = '<div class="cm-fm-error">Invalid frontmatter YAML</div>'
      return container
    }

    const props: Property[] = Object.entries(data).map(([key, value]) => ({
      key,
      value: value as PropValue,
    }))

    const from = this.from
    const to = this.to

    const commit = (updatedProps: Property[]) => {
      const obj: Record<string, PropValue> = {}
      for (const p of updatedProps) {
        if (p.key.trim()) obj[p.key.trim()] = p.value
      }
      const yaml = Object.keys(obj).length > 0 ? stringifyYaml(obj).trim() : ''
      const newFm = yaml ? `---\n${yaml}\n---` : `---\n\n---`
      view.dispatch({ changes: { from, to, insert: newFm } })
    }

    // Header
    const header = document.createElement('div')
    header.className = 'cm-fm-header'

    const title = document.createElement('span')
    title.className = 'cm-fm-title'
    title.textContent = 'Properties'
    header.appendChild(title)

    const actions = document.createElement('span')
    actions.className = 'cm-fm-actions'

    const addBtn = document.createElement('button')
    addBtn.type = 'button'
    addBtn.className = 'cm-fm-btn'
    addBtn.textContent = '+'
    addBtn.title = 'Add property'
    actions.appendChild(addBtn)

    const srcBtn = document.createElement('button')
    srcBtn.type = 'button'
    srcBtn.className = 'cm-fm-btn'
    srcBtn.textContent = 'YAML'
    srcBtn.title = 'Edit as YAML'
    srcBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      view.dispatch({
        effects: toggleFrontmatterSource.of(true),
        selection: { anchor: from },
      })
    })
    actions.appendChild(srcBtn)

    header.appendChild(actions)
    container.appendChild(header)

    // Property rows
    const table = document.createElement('div')
    table.className = 'cm-fm-table'

    /**
     * Create a row and append it to the table.
     * If committed=true, the row represents an existing committed property.
     * If committed=false (newly added via +), the row only commits once the user
     * enters a valid key.
     */
    function createRow(prop: Property, committed: boolean): HTMLDivElement {
      const row = document.createElement('div')
      row.className = 'cm-fm-row'

      // Key input
      const keyInput = document.createElement('input')
      keyInput.type = 'text'
      keyInput.className = 'cm-fm-key'
      keyInput.value = prop.key
      keyInput.placeholder = 'property'
      row.appendChild(keyInput)

      // Value input (plain text for simplicity on new rows)
      const value = prop.value
      let valueEl: HTMLElement

      if (Array.isArray(value)) {
        const valInput = document.createElement('input')
        valInput.type = 'text'
        valInput.className = 'cm-fm-value'
        valInput.value = value.join(', ')
        valInput.placeholder = 'value1, value2'
        valueEl = valInput
      } else if (typeof value === 'boolean') {
        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.className = 'cm-fm-checkbox'
        checkbox.checked = value
        valueEl = checkbox
      } else {
        const valInput = document.createElement('input')
        valInput.type = 'text'
        valInput.className = 'cm-fm-value'
        valInput.value = value != null ? String(value) : ''
        valInput.placeholder = 'value'
        valueEl = valInput
      }
      row.appendChild(valueEl)

      // Delete button
      const delBtn = document.createElement('button')
      delBtn.type = 'button'
      delBtn.className = 'cm-fm-del'
      delBtn.textContent = '×'
      delBtn.title = 'Remove property'
      delBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!committed) {
          // Never committed — just remove the row from DOM
          row.remove()
          return
        }
        const idx = props.indexOf(prop)
        if (idx !== -1) {
          props.splice(idx, 1)
          commit(props)
        }
      })
      row.appendChild(delBtn)

      // Handlers
      const readValue = (): PropValue => {
        if (valueEl instanceof HTMLInputElement) {
          if (valueEl.type === 'checkbox') return valueEl.checked
          const text = valueEl.value
          if (Array.isArray(value)) {
            return text.split(',').map((s) => s.trim()).filter(Boolean)
          }
          // Auto-detect basic types
          if (text === 'true') return true
          if (text === 'false') return false
          if (/^\d+$/.test(text)) return parseInt(text)
          return text
        }
        return ''
      }

      const commitRow = () => {
        const newKey = keyInput.value.trim()
        const newValue = readValue()

        if (!newKey) {
          // Empty key — if uncommitted, just do nothing (keep the row visible)
          if (!committed) return
          // Committed with cleared key — remove the property
          const idx = props.indexOf(prop)
          if (idx !== -1) {
            props.splice(idx, 1)
            commit(props)
          }
          return
        }

        if (!committed) {
          // First commit — add to props array
          const newProp: Property = { key: newKey, value: newValue }
          props.push(newProp)
          committed = true
          commit(props)
          return
        }

        // Subsequent edit on existing row
        if (newKey !== prop.key || newValue !== prop.value) {
          prop.key = newKey
          prop.value = newValue
          commit(props)
        }
      }

      keyInput.addEventListener('blur', commitRow)
      keyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
          // Move to value input
          if (valueEl instanceof HTMLInputElement) {
            e.preventDefault()
            valueEl.focus()
          }
        }
      })

      if (valueEl instanceof HTMLInputElement) {
        if (valueEl.type === 'checkbox') {
          valueEl.addEventListener('change', commitRow)
        } else {
          valueEl.addEventListener('blur', commitRow)
          valueEl.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && !e.shiftKey) {
              // Commit and create a new row
              e.preventDefault()
              commitRow()
              // Defer to allow commit to settle before adding new row
              setTimeout(() => addNewRow(), 0)
            } else if (e.key === 'Tab' && e.shiftKey) {
              // Shift+Tab goes back to key input
              e.preventDefault()
              keyInput.focus()
            } else if (e.key === 'Enter') {
              e.preventDefault()
              valueEl.blur()
            }
          })
        }
      }

      return row
    }

    // Add a new uncommitted row and focus its key input
    function addNewRow() {
      const newRow = createRow({ key: '', value: '' }, false)
      table.appendChild(newRow)
      const newKeyInput = newRow.querySelector('.cm-fm-key') as HTMLInputElement | null
      newKeyInput?.focus()
    }

    // Render existing committed properties
    for (const prop of props) {
      table.appendChild(createRow(prop, true))
    }

    // If empty, show a placeholder row so user can start typing immediately
    if (props.length === 0) {
      const placeholderRow = createRow({ key: '', value: '' }, false)
      table.appendChild(placeholderRow)
      // Focus the placeholder's key input after the widget is mounted
      requestAnimationFrame(() => {
        const keyInput = placeholderRow.querySelector('.cm-fm-key') as HTMLInputElement | null
        keyInput?.focus()
      })
    }

    // Wire up the + button to add a new (uncommitted) row
    addBtn.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      addNewRow()
    })

    container.appendChild(table)
    return container
  }

  ignoreEvent(): boolean {
    return true
  }
}
