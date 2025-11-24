# Contexts Directory Structure

This directory contains all React context providers, organized by functionality.

## Directory Structure

```
contexts/
├── ui/                   # UI state management contexts
│   ├── ThemeContext/            # Dark/light theme management
│   ├── ModalContext/            # Global modal dialogs
│   ├── NotificationContext/     # Toast notifications
│   ├── LayoutContext/           # Split-pane layout management
│   └── index.ts                 # UI group exports
│
├── tabs/                 # Tab and pane management contexts
│   ├── PaneTabsContext/         # Multi-pane tab management
│   ├── TabHostContext/          # Tab hosting functionality
│   └── index.ts                 # Tabs group exports
│
├── ProfileContext/       # User profile management
├── RouteConfigContext/   # Application route configuration
└── index.ts              # Central export file
```

## Usage

Import contexts from the central index file:

```typescript
import { ThemeProvider, ModalProvider, ProfileProvider } from '@contexts';
```

Or import directly from their group:

```typescript
import { ThemeProvider, ModalProvider } from '@contexts/ui';
import { PaneTabsProvider, TabHostProvider } from '@contexts/tabs';
```

## Context Categories

### UI Contexts (`ui/`)

Contexts for managing UI state and presentation:

- **ThemeContext**: Dark/light theme state and toggle
- **ModalContext**: Global modal dialogs with dynamic content
- **NotificationContext**: Toast notifications using sonner library
- **LayoutContext**: Split-pane layout management with dynamic resizing

### Tab Contexts (`tabs/`)

Contexts for managing tab and pane functionality:

- **PaneTabsContext**: Multi-pane tab state management
- **TabHostContext**: Tab hosting and navigation

### Standalone Contexts (Root Level)

General application contexts that don't fit specific categories:

- **ProfileContext**: User profile data and role-based permissions
- **RouteConfigContext**: Centralized application route configuration

## Typical Provider Hierarchy

```tsx
<ThemeProvider>
  <NotificationProvider>
    <ModalProvider>
      <ProfileProvider>
        <LayoutProvider>
          <PaneTabsProvider>
            <TabHostProvider>
              <RouteConfigProvider>
                <App />
              </RouteConfigProvider>
            </TabHostProvider>
          </PaneTabsProvider>
        </LayoutProvider>
      </ProfileProvider>
    </ModalProvider>
  </NotificationProvider>
</ThemeProvider>
```

## Guidelines for Adding New Contexts

1. **UI-related contexts**: Place in `ui/` directory
2. **Tab/pane-related contexts**: Place in `tabs/` directory
3. **Standalone contexts**: Place directly in `contexts/` root
4. **New categories**: Create new subdirectories for 3+ related contexts
5. **Always export**: Add exports to group `index.ts` and main `index.ts`
6. **TypeScript**: All contexts must be fully typed with proper interfaces
7. **Documentation**: Include JSDoc comments with usage examples

## Context Structure Pattern

Each context should follow this structure:

```typescript
/**
 * Context description
 */

import { createContext, useContext, ReactNode } from 'react';

/**
 * Context value interface
 */
export interface MyContextValue {
  value: string;
  setValue: (value: string) => void;
}

const MyContext = createContext<MyContextValue | undefined>(undefined);

/**
 * Provider props interface
 */
export interface MyProviderProps {
  children: ReactNode;
}

/**
 * Provider component
 */
export function MyProvider({ children }: MyProviderProps): JSX.Element {
  // Provider implementation
  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
}

/**
 * Hook to access context
 * @throws Error if used outside provider
 */
export function useMyContext(): MyContextValue {
  const context = useContext(MyContext);
  if (context === undefined) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
}
```

## Best Practices

1. **Error Handling**: Always check for undefined context and throw descriptive errors
2. **Type Safety**: Export context value interfaces for external use
3. **Memoization**: Use `useMemo` for context values to prevent unnecessary re-renders
4. **Props Interface**: Always define and export provider props interfaces
5. **Hook Naming**: Use consistent naming pattern (e.g., `useTheme`, `useModal`)
6. **Documentation**: Document context purpose, value shape, and usage examples
