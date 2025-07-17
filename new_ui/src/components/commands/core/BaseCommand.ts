import { CommandArgs, CommandResult } from '../../../types/command.types';
import React from 'react';

// Base class for all commands
export abstract class BaseCommand {
  abstract readonly id: string;
  public abstract readonly icon: () => React.ReactNode;
  public readonly category?: string;
  public args: CommandArgs;
  public addTab?: (tabType: string, config?: any, targetTabset?: string) => void;


  public abstract name(): string;
  public abstract description(): string;
  
  constructor(args: CommandArgs, addTab?: (tabType: string, config?: any, targetTabset?: string) => void) {
    this.args = args;
    this.addTab = addTab;
  }

  // Main execution method
  abstract run(): Promise<CommandResult> | CommandResult;

  // Cleanup method called after execution
  cleanup?(): void;

  // Methods for equality and hashing (similar to tabs)
  public equals(other: BaseCommand): boolean {
    return this.id === other.id && this.argsEqual(this.args, other.args);
  }

  public hash(): string {
    return `${this.id}_${this.argsHash(this.args)}`;
  }

  // Helper method to compare CommandArgs
  private argsEqual(args1?: CommandArgs, args2?: CommandArgs): boolean {
    if (args1 === args2) return true;
    if (!args1 || !args2) return false;
    
    const keys1 = Object.keys(args1);
    const keys2 = Object.keys(args2);
    
    if (keys1.length !== keys2.length) return false;
    
    return keys1.every(key => 
      keys2.includes(key) && 
      JSON.stringify(args1[key]) === JSON.stringify(args2[key])
    );
  }

  // Helper method to generate hash from CommandArgs
  private argsHash(args?: CommandArgs): string {
    if (!args) return 'no_args';
    
    const sortedKeys = Object.keys(args).sort();
    const argsString = sortedKeys
      .map(key => `${key}:${JSON.stringify(args[key])}`)
      .join('|');
    
    return btoa(argsString).replace(/[+/=]/g, '');
  }

  public getUniqueKey(): string {
    return this.hash();
  }

  // Override valueOf for primitive conversion in Set operations
  public valueOf(): string {
    return this.getUniqueKey();
  }

  // Override toString for string representation
  public toString(): string {
    return `${this.name} (${this.id})`;
  }
}
