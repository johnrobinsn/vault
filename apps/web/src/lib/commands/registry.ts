export interface Command {
  id: string
  label: string
  shortcut?: string
  execute: () => void
}

class CommandRegistry {
  private commands: Map<string, Command> = new Map()

  register(command: Command) {
    this.commands.set(command.id, command)
  }

  unregister(id: string) {
    this.commands.delete(id)
  }

  get(id: string): Command | undefined {
    return this.commands.get(id)
  }

  getAll(): Command[] {
    return Array.from(this.commands.values())
  }

  execute(id: string) {
    const cmd = this.commands.get(id)
    if (cmd) cmd.execute()
  }

  search(query: string): Command[] {
    if (!query.trim()) return this.getAll()
    const terms = query.toLowerCase().split(/\s+/)
    return this.getAll().filter((cmd) => {
      const label = cmd.label.toLowerCase()
      return terms.every((t) => label.includes(t))
    })
  }
}

export const commandRegistry = new CommandRegistry()
