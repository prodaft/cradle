import { useTabHost } from '@/contexts/tabs/TabHostContext';
import { TabContextProvider } from '@/hooks/tabs/TabContextProvider';
import { useRouteConfigs } from '@/hooks/tabs/useRouteConfigs';
import { Tab } from '@/utils/tabs';
import { Suspense, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { matchPath } from 'react-router-dom';

interface TabContentPortalProps {
    tab: Tab;
    isActiveInActivePane: boolean;
    safeNavigate: (path: string) => void;
}

export default function TabContentPortal({
    tab,
    isActiveInActivePane,
    safeNavigate,
}: TabContentPortalProps) {
    const { ensureContainer } = useTabHost();
    const routes = useRouteConfigs();
    const container = useMemo(() => ensureContainer(tab.id), [tab.id, ensureContainer]);

    // Resolve component + params from tab.path
    const resolved = useMemo(() => {
        for (const r of routes) {
            const m = matchPath({ path: r.path, end: r.exact !== false }, tab.path);
            if (m) return { Component: r.component, params: m.params || {} };
        }
        return { Component: null, params: {} };
    }, [routes, tab.path]);

    // Memoize navigate function to avoid recreating on every render
    const navigate = useCallback(
        (to: string, opts?: unknown) => {
            // No-history mode: only allow when active tab in active pane
            if (isActiveInActivePane) safeNavigate?.(to);
        },
        [isActiveInActivePane, safeNavigate],
    );

    // Memoize location object
    const location = useMemo(
        () => ({ pathname: tab.path, search: '', hash: '' }),
        [tab.path],
    );

    // Memoize context value to prevent unnecessary re-renders of children
    const contextValue = useMemo(
        () => ({
            params: resolved.params,
            location,
            navigate,
            isActive: isActiveInActivePane,
            isPaneActive: isActiveInActivePane,
            isBackgroundTab: !isActiveInActivePane,
        }),
        [resolved.params, location, navigate, isActiveInActivePane],
    );

    if (!resolved.Component) return null;

    const element = (
        <div style={{ width: '100%', height: '100%', position: 'relative' }} key={tab.id}>
            <TabContextProvider value={contextValue}>
                <Suspense fallback={null}>
                    <resolved.Component key={tab.id} />
                </Suspense>
            </TabContextProvider>
        </div>
    );

    return createPortal(element, container);
}
