import { BaseCommand } from "./BaseCommand";

// Registry to manage all command types
export class CommandRegistry {
  private static instance: CommandRegistry;
  private commands: Map<string, typeof BaseCommand> = new Map();
  private commandInstances: Map<string, BaseCommand> = new Map();

  static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    
    return CommandRegistry.instance;
  }

  // Register a new command type
  register(CommandClass: typeof BaseCommand): void {
    const instance = new (CommandClass as any)();
    this.commands.set(instance.id, CommandClass);
    this.commandInstances.set(instance.id, instance);
  }

  // Get a command class by id
  getCommandClass(commandId: string): typeof BaseCommand | undefined {
    return this.commands.get(commandId);
  }

  // Get all registered commands
  getAllCommands(): Array<{ id: string; }> {
    return Array.from(this.commandInstances.values()).map(command => ({
      id: command.id,
    }));
  }

  // Check if a command exists
  hasCommand(commandId: string): boolean {
    return this.commands.has(commandId);
  }

  // Unregister a command
  unregister(commandId: string): boolean {
    const removed = this.commands.delete(commandId);
    this.commandInstances.delete(commandId);
    return removed;
  }
}
