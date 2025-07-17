import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VscSearch, VscLoading } from 'react-icons/vsc';
import CommandItem from './CommandItem';
import { BaseCommand } from '../commands/core';

interface CommandPanelProps {
  isOpen: boolean;
  onClose: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  position: { top: number; left: number; width: number };
  loading?: boolean;
  commands?: BaseCommand[];
}

const CommandPanel: React.FC<CommandPanelProps> = ({
  isOpen,
  onClose,
  searchValue,
  onSearchChange,
  position,
  loading = false,
  commands = []
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [filteredCommands, setFilteredCommands] = useState<BaseCommand[]>([]);

  // Filter commands based on search value
  useEffect(() => {
    if (loading) {
      setFilteredCommands([]);
      return;
    }

    if (!searchValue.trim()) {
      setFilteredCommands(commands);
    } else {
      const filtered = commands.filter((command: BaseCommand) => 
        command.name().toLowerCase().includes(searchValue.toLowerCase()) ||
        (command.description() && command.description().toLowerCase().includes(searchValue.toLowerCase()))
      );
      setFilteredCommands(filtered);
    }
    setSelectedIndex(0);
  }, [searchValue, commands, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleItemSelect = useCallback(async (command: BaseCommand) => {
    // Execute command
    try {
      await command.run();
    } catch (error) {
      console.error('Command execution failed:', error);
    }
    onClose();
  }, [onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            handleItemSelect(filteredCommands[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose, handleItemSelect]);

  // Handle clicks outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-[9999] bg-gray-50 border border-gray-200 rounded-md shadow-2xl overflow-hidden"
      style={{
        top: position.top,
        left: position.left,
        width: Math.max(position.width, 500), // Ensure minimum width of 500px
        maxHeight: '400px',
      }}
    >
      {/* Search Input */}
      <div className="p-1">
        <div className="flex items-center w-full px-3 py-0.5 bg-gray-50 border-2 border-accent rounded-md overflow-hidden">
          <VscSearch className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files, symbols, commands..."
            className="flex-1 bg-transparent text-xs text-foreground placeholder-muted-foreground outline-none ml-1 min-w-0"
          />
        </div>
      </div>

      {/* Results */}
      <div className="max-h-80 overflow-y-auto bg-gray-50">
        {loading ? (
          <CommandItem
            key="loading"
            icon={<VscLoading className="h-4 w-4 animate-spin" />}
            name="Loading..."
            details="Searching for items..."
            isSelected={true}
          />
        ) : filteredCommands.length === 0 ? (
          <div className="px-3 py-4 text-center text-muted-foreground text-sm">
            No results found
          </div>
        ) : (
          filteredCommands.map((command: BaseCommand, index: number) => (
            <CommandItem
              key={index}
              icon={command.icon()}
              name={command.name()}
              details={command.description()}
              command={command}
              isSelected={index === selectedIndex}
              onClick={() => handleItemSelect(command)}
              onMouseEnter={() => setSelectedIndex(index)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CommandPanel;