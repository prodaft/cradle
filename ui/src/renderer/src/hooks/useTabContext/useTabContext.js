import { useContext } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { TabContext } from './TabContextProvider';

/**
 * Custom hook that provides tab-aware routing functionality
 * Background tabs use captured URL data instead of live router state
 * Only active tabs in active panes can navigate
 */
export const useTabContext = () => {
    const tabContext = useContext(TabContext);
    const routerParams = useParams();
    const routerLocation = useLocation();
    const routerNavigate = useNavigate();

    // If we're in a background tab, use captured data
    if (tabContext && !tabContext.isActive) {
        return {
            // Use captured URL data for background tabs
            params: tabContext.capturedParams || {},
            location: {
                pathname: tabContext.capturedPathname || '/',
                search: '',
                hash: '',
                state: null,
                key: 'background-tab',
            },
            // Background tabs cannot navigate
            navigate: () => {
                console.warn('Background tabs cannot navigate. Only the active tab in the active pane can change the URL.');
            },
            // Tab state
            isActive: false,
            isPaneActive: tabContext.isPaneActive || false,
            isBackgroundTab: true,
        };
    }

    // Active tab uses live router data
    return {
        params: routerParams,
        location: routerLocation,
        navigate: routerNavigate,
        isActive: true,
        isPaneActive: tabContext?.isPaneActive || true,
        isBackgroundTab: false,
    };
};

/**
 * Hook for components that need to know if they're in a background tab
 */
export const useIsBackgroundTab = () => {
    const tabContext = useContext(TabContext);
    return tabContext ? !tabContext.isActive : false;
};

/**
 * Hook for components that need to know if they're in the active pane
 */
export const useIsActivePane = () => {
    const tabContext = useContext(TabContext);
    return tabContext ? tabContext.isPaneActive : true;
};
