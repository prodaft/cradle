/**
 * Central export file for all hooks
 *
 * Hooks are organized into functional groups:
 * - api/ - API interaction hooks (useApi, useAPICall, useFormValidation)
 * - auth/ - Authentication and user hooks (useAuth, useProfile)
 * - navigation/ - Navigation hooks (useCradleNavigate)
 * - theme/ - Theme hooks (useTheme)
 * - search/ - Search hooks (useFrontendSearch)
 *
 * Usage:
 * ```typescript
 * // Import from main index
 * import { useApi, useAuth } from '@hooks';
 *
 * // Or import from group
 * import { useApi, useAPICall } from '@hooks/api';
 * import { useAuth, useProfile } from '@hooks/auth';
 * ```
 */

// API-related hooks
export * from './api';
export * from './collab/useCollabExtension';

// Auth-related hooks
export * from './auth';

// Navigation hooks
export * from './navigation';

// Theme hooks
export * from './theme';

// Search hooks
export * from './search';
