export interface CommandArgs {
  [key: string]: any;
}

export interface CommandResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface CommandEvent {
  type: string;
  commandId: string;
  args: CommandArgs;
  result?: CommandResult;
}

export interface CommandConfig {
  id: string;
  name: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type: string;
    required?: boolean;
    default?: any;
  }>;
}
