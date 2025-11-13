import { useContext } from 'react';
import { useParams, useLocation, useNavigate, NavigateFunction, Location, Params } from 'react-router-dom';
import { TabContext } from './TabContextProvider';

interface TabContextReturnType {
    params: Params;
    location: Location | {
        pathname: string;
        search: string;
        hash: string;
        state: null;
        key: string;
    };
    navigate: NavigateFunction | (() => void);
    isActive: boolean;
    isPaneActive: boolean;
    isBackgroundTab: boolean;
}

/**
 * Custom hook that provides tab-aware routing functionality
 * Background tabs use captured URL data instead of live router state
 * Only active tabs in active panes can navigate
 */
export const useTabContext = (): TabContextReturnType => {
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
                console.warn(
                    'Background tabs cannot navigate. Only the active tab in the active pane can change the URL.'
                );
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
export const useIsBackgroundTab = (): boolean => {
    const tabContext = useContext(TabContext);
    return tabContext ? !tabContext.isActive : false;
};

/**
 * Hook for components that need to know if they're in the active pane
 */
export const useIsActivePane = (): boolean => {
    const tabContext = useContext(TabContext);
    return tabContext ? tabContext.isPaneActive : true;
};
