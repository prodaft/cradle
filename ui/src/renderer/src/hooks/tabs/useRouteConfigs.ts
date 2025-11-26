/**
 * Hook to access route configurations
 */

import { RouteConfig, RouteConfigContext } from '@/contexts/routing/RouteConfigContext';
import { useContext } from 'react';

/**
 * Hook to access route configurations
 *
 * @returns Array of route configurations
 */
export const useRouteConfigs = (): RouteConfig[] => {
    const context = useContext(RouteConfigContext);
    return context;
};
