import React from 'react';
import { BaseCommand } from '../commands/core';

interface CommandItemProps {
  icon?: React.ReactNode;
  name: string;
  details?: string;
  command?: BaseCommand;
  isSelected?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
}

const CommandItem: React.FC<CommandItemProps> = ({
  icon,
  name,
  details,
  command: _command, // Prefix with underscore to indicate it's intentionally unused in this component
  isSelected = false,
  onClick,
  onMouseEnter
}) => {
  return (
    <div
      className={`flex items-center px-1 py-0.5 cursor-pointer text-xs transition-colors ${
        isSelected
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50 text-foreground'
      }`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {icon && (
        <div className="mr-1 text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0 flex items-center justify-between">
        <div className="flex items-center min-w-0 flex-1">
          <span className="font-medium truncate">{name}</span>
          {details && (
            <span className="text-xs text-muted-foreground ml-2 truncate">
              {details}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandItem;
