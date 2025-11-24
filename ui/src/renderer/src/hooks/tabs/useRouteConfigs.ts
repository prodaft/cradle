/**
 * Hook to access route configurations
 */

import { useContext } from 'react';
import { RouteConfigContext, RouteConfig } from '@/contexts/routing/RouteConfigContext';

/**
 * Hook to access route configurations
 *
 * @returns Array of route configurations
 */
export const useRouteConfigs = (): RouteConfig[] => {
  const context = useContext(RouteConfigContext);
  return context;
};

