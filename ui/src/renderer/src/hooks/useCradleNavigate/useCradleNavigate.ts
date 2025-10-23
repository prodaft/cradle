import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePaneTabs } from '../../contexts/PaneTabsContext/PaneTabsContext';
import { useLayout } from '../../contexts/LayoutContext/LayoutContext';

interface NavigateOptions {
    event?: React.MouseEvent;
    state?: any;
    replace?: boolean;
    [key: string]: any;
}

const useCradleNavigate = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const paneTabsContext = usePaneTabs();
    const layoutContext = useLayout();
    const openTab = paneTabsContext?.openTab;
    const activePaneId = layoutContext?.activePaneId;
    
    const smartNavigate = useCallback(
        (to: string | { pathname: string }, options: NavigateOptions = {}) => {
            // If event is passed in options
            const event = options.event;
            const targetPath = typeof to === 'string' ? to : to.pathname || to;
            
            if (event && (event.ctrlKey || event.metaKey || event.button === 1)) {
                // Ctrl/Cmd + click or middle click: open in new tab in active pane
                if (openTab && activePaneId) {
                    openTab(activePaneId, targetPath);
                } else {
                    // Fallback to opening in new window if tabs context is not available
                    const url = '#' + targetPath;
                    window.open(url, '_blank');
                }
            } else {
                // Normal click or programmatic navigation: use React Router navigation
                const { event: _, ...navOptions } = options; // Remove event from options before passing to navigate
                
                // Set 'from' to current location unless already specified
                const state = {
                    from: location.pathname,
                    ...navOptions.state
                };
                
                navigate(to, { ...navOptions, state });
            }
        },
        [navigate, location, openTab, activePaneId],
    );
    
    return {
        navigate: smartNavigate,
        navigateLink: (to: string | { pathname: string }, options: NavigateOptions = {}) => (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            smartNavigate(to, { event: e, ...options });
        },
    };
};

export default useCradleNavigate;