import React from 'react';
import { RegisterCmd, BaseCommand} from '../core';
import { CommandArgs, CommandResult } from '../../../types/command.types';
import { VscHeart } from 'react-icons/vsc';

@RegisterCmd()
export class HelloWorldCommand extends BaseCommand {
  readonly id = 'hello_world';

  readonly icon = () => React.createElement(VscHeart, { className: 'h-4 w-4' });
  readonly category = 'example';

  public name(): string {
    return 'Hello World';
  }

  public description(): string {
    return 'A simple hello world command that greets the user';
  }

  constructor(args: CommandArgs = {}) {
    super(args);
  }

  validate(args: CommandArgs): boolean | string {
    // Optional validation - check if name is provided and is a string
    if (args.name && typeof args.name !== 'string') {
      return 'Name must be a string';
    }
    return true;
  }

  run(): CommandResult {
    const name = this.args.name || 'World';
    const greeting = `Hello, ${name}!`;
    
    console.log(greeting);
    
    return {
      success: true,
      data: {
        greeting,
        timestamp: new Date().toISOString()
      }
    };
  }

  cleanup(): void {
    // Clean up any resources if needed
    console.log('HelloWorldCommand cleanup completed');
  }
}
