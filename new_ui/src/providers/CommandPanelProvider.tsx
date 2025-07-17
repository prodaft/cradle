import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import CommandPanel from '../components/ui/CommandPanel';
import { BaseCommand } from '../components/commands/core';

export type CommandProvider = 
  | ((arg0: string) => Promise<BaseCommand[]>)
  | ((arg0: string) => BaseCommand[])
  | BaseCommand[];

interface CommandPanelState {
  isOpen: boolean;
  searchValue: string;
  position: { top: number; left: number; width: number };
  loading: boolean;
  commands: BaseCommand[];
}

interface CommandPanelContextType {
  showPanel: (
    provider: CommandProvider,
    options?: {
      position?: { top: number; left: number; width: number };
      searchValue?: string;
    }
  ) => Promise<void>;
  hidePanel: () => void;
  isOpen: boolean;
}

const CommandPanelContext = createContext<CommandPanelContextType | null>(null);

interface CommandPanelProviderProps {
  children: ReactNode;
}

export const CommandPanelProvider: React.FC<CommandPanelProviderProps> = ({ children }) => {
  const [state, setState] = useState<CommandPanelState>({
    isOpen: false,
    searchValue: '',
    position: { top: 100, left: 100, width: 500 },
    loading: false,
    commands: []
  });

  // Utility function to find and calculate position from TopBar search area
  const getSearchAreaPosition = useCallback(() => {
    // Small delay to ensure DOM is fully rendered
    const searchArea = document.querySelector('[data-search-area]') || 
                      document.querySelector('.search-field') ||
                      // Fallback: look for the search icon and find its parent container
                      document.querySelector('.h-3.w-3.text-muted-foreground')?.closest('.flex.items-center.justify-center');
    
    if (searchArea) {
      const rect = (searchArea as HTMLElement).getBoundingClientRect();
      return rect;
    }
    
    // Fallback position if search area is not found
    return { top: 60, left: Math.max(0, window.innerWidth / 2 - 250), width: 500 };
  }, []);

  const showPanel = useCallback(async (
    provider: CommandProvider,
    options?: {
      position?: { top: number; left: number; width: number };
      searchValue?: string;
    }
  ) => {
    // Calculate position from search area if not provided
    const calculatedPosition = options?.position || getSearchAreaPosition();
    
    // Set initial state with loading
    setState(prev => ({
      ...prev,
      isOpen: true,
      loading: true,
      searchValue: options?.searchValue || '',
      position: calculatedPosition,
      commands: []
    }));

    try {
      let commands: BaseCommand[];

      // Handle different provider types
      if (Array.isArray(provider)) {
        commands = provider;
      } else if (typeof provider === 'function') {
        const result = provider(state.searchValue);
        if (result instanceof Promise) {
          commands = await result;
          console.log(commands)
        } else {
          commands = result;
        }
      } else {
        commands = [];
      }

      // Update with actual commands
      setState(prev => ({
        ...prev,
        loading: false,
        commands
      }));
    } catch (error) {
      console.error('Error loading command items:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        commands: []
      }));
    }
  }, []);

  const hidePanel = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      loading: false,
      commands: [],
      searchValue: ''
    }));
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setState(prev => ({
      ...prev,
      searchValue: value
    }));
  }, []);

  const contextValue: CommandPanelContextType = {
    showPanel,
    hidePanel,
    isOpen: state.isOpen
  };

  return (
    <CommandPanelContext.Provider value={contextValue}>
      {children}
      <CommandPanel
        isOpen={state.isOpen}
        onClose={hidePanel}
        searchValue={state.searchValue}
        onSearchChange={handleSearchChange}
        position={state.position}
        loading={state.loading}
        commands={state.commands}
      />
    </CommandPanelContext.Provider>
  );
};

export const useCommandPanel = (): CommandPanelContextType => {
  const context = useContext(CommandPanelContext);
  if (!context) {
    throw new Error('useCommandPanel must be used within a CommandPanelProvider');
  }
  return context;
};
