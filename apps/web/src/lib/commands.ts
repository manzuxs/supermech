export interface Command {
  name: string;
  aliases?: string[];
  description: string;
  run: () => void | Promise<void>;
}

const commands = new Map<string, Command>();

export function registerCommand(cmd: Command) {
  commands.set(cmd.name, cmd);
  for (const alias of cmd.aliases ?? []) {
    commands.set(alias, cmd);
  }
}

export function getCommand(input: string): Command | null {
  return commands.get(input.toLowerCase()) ?? null;
}

export function listCommands(): Command[] {
  return [...new Set(commands.values())];
}
