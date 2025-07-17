# Command System

A flexible command system for the CRADLE application, similar to the tab system. Commands are reusable units of functionality that can be executed with arguments and return results.

## Architecture

### Core Components

1. **BaseCommand** - Abstract base class for all commands
2. **CommandRegistry** - Singleton registry for managing command types
3. **CommandProvider** - Provider for executing commands with ID and args
4. **@RegisterCmd** - Decorator for automatic command registration

### Types

- **CommandArgs** - Arguments passed to commands
- **CommandResult** - Result returned by commands
- **CommandEvent** - Event emitted during command execution

## Usage

### Creating a Command

```typescript
import { BaseCommand, RegisterCmd } from "./components/commands/core";
import { CommandArgs, CommandResult } from "./types/command.types";

@RegisterCmd("my_command")
export class MyCommand extends BaseCommand {
  readonly id = "my_command";
  readonly name = "My Command";
  readonly description = "Does something useful";

  validate(args: CommandArgs): boolean | string {
    if (!args.requiredParam) {
      return "requiredParam is required";
    }
    return true;
  }

  async run(args: CommandArgs): Promise<CommandResult> {
    // Do something with args
    return {
      success: true,
      data: { result: "Done!" },
    };
  }

  cleanup(): void {
    // Clean up resources
  }
}
```

### Using Commands

#### With the Provider

```typescript
import { CommandProvider } from "./components/commands/core";

const provider = CommandProvider.getInstance();

// Execute a command
const result = await provider.execute("hello_world", { name: "Alice" });
console.log(result); // { success: true, data: { greeting: 'Hello, Alice!' } }

// List available commands
const commands = provider.getAvailableCommands();
```

#### With React Hook

```typescript
import { useCommands } from "./hooks/useCommands";

function MyComponent() {
  const { execute, isExecuting, lastResult, availableCommands } = useCommands();

  const handleClick = async () => {
    await execute("hello_world", { name: "World" });
  };

  return (
    <button onClick={handleClick} disabled={isExecuting}>
      {isExecuting ? "Executing..." : "Execute Command"}
    </button>
  );
}
```

## Example Commands

### Hello World Command

```typescript
@RegisterCmd("hello_world")
export class HelloWorldCommand extends BaseCommand {
  readonly id = "hello_world";
  readonly name = "Hello World";
  readonly description = "A simple hello world command";

  run(args: CommandArgs): CommandResult {
    const name = args.name || "World";
    return {
      success: true,
      data: { greeting: `Hello, ${name}!` },
    };
  }
}
```

## Features

- **Type Safety** - Full TypeScript support
- **Validation** - Optional argument validation
- **Error Handling** - Comprehensive error handling
- **History** - Execution history tracking
- **Events** - Subscribe to command execution events
- **Equality** - Built-in equals() and hash() methods
- **Cleanup** - Optional cleanup after execution

## Registration

Commands are automatically registered when imported using the `@RegisterCmd` decorator:

```typescript
import "./commands/HelloWorldCommand"; // Triggers registration
```

Or manually:

```typescript
import { registerCommand } from "./components/commands/core";
import { MyCommand } from "./MyCommand";

registerCommand(MyCommand);
```

## Error Handling

Commands can fail in several ways:

1. **Command Not Found** - Command ID doesn't exist
2. **Validation Error** - Arguments don't pass validation
3. **Execution Error** - Runtime error during execution

All errors are captured and returned in the `CommandResult`:

```typescript
{
  success: false,
  error: "Error message"
}
```
