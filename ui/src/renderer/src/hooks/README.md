# Hooks Directory Structure

This directory contains all React custom hooks, organized by functionality.

## Directory Structure

```
hooks/
├── api/              # API interaction hooks
│   ├── useApi.ts              # Access to all API client instances
│   ├── useAPICall.ts          # Wrapper for API calls with error handling
│   └── useFormValidation.ts  # Form validation with API error extraction
│
├── auth/             # Authentication and user hooks
│   ├── useAuth.ts             # Authentication context access
│   └── useProfile.ts          # User profile state management
│
├── useInterval.ts    # Execute callback at regular intervals
├── useFrontendSearch.ts  # Client-side search filtering
└── index.ts          # Central export file
```

## Usage

Import hooks from the central index file:

```typescript
import { useApi, useAuth, useInterval } from '@hooks';
```

Or import directly from their location:

```typescript
import { useApi } from '@hooks/api/useApi';
import { useAuth } from '@hooks/auth/useAuth';
```

## Hook Categories

### API Hooks (`api/`)

Hooks for interacting with the backend API:

- **useApi**: Provides access to all API client instances (NotesApi, UsersApi, etc.)
- **useAPICall**: Wrapper for API calls with automatic error handling and notifications
- **useFormValidation**: Handles form submissions with field-level validation error extraction

### Auth Hooks (`auth/`)

Hooks related to authentication and user management:

- **useAuth**: Access to authentication context (login, logout, user state)
- **useProfile**: Manage user profile state

### General Utility Hooks (Root Level)

Standalone utility hooks that don't fit into specific categories:

- **useInterval**: Execute a callback function at regular intervals
- **useFrontendSearch**: Filter React children based on search input

## Guidelines for Adding New Hooks

1. **Standalone hooks**: Place directly in the `hooks/` root directory
2. **Related hooks**: Group into subdirectories by functionality
3. **Always export**: Add exports to `index.ts` for centralized access
4. **TypeScript**: All hooks must be fully typed with interfaces for return values
5. **Documentation**: Include JSDoc comments with usage examples

## Example Hook Structure

```typescript
/**
 * Hook description
 */

import { useState } from 'react';

/**
 * Return type interface
 */
export interface UseMyHookReturn {
  value: string;
  setValue: (value: string) => void;
}

/**
 * Detailed hook documentation with examples
 *
 * @returns Hook return value
 *
 * @example
 * const { value, setValue } = useMyHook();
 */
export function useMyHook(): UseMyHookReturn {
  const [value, setValue] = useState<string>('');
  return { value, setValue };
}

export default useMyHook;
```
