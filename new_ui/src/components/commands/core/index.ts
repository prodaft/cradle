import { BaseCommand } from './BaseCommand';
import { CommandRegistry } from './CommandRegistry';


// Decorator to automatically register commands
function RegisterCmd() {
  return function <T extends typeof BaseCommand>(constructor: T) {
    // Register the command when the class is defined
    const registry = CommandRegistry.getInstance();
    registry.register(constructor);
    
    return constructor;
  };
}

// Alternative function-based registration for manual registration
function registerCommand(CommandClass: typeof BaseCommand): void {
  const registry = CommandRegistry.getInstance();
  registry.register(CommandClass);
}

export {
  BaseCommand,
  CommandRegistry,
  RegisterCmd,
  registerCommand,
};