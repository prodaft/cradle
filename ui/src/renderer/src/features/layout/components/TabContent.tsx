/**
 * TabContent - Renders tab content into a portal for persistence
 */

import { createContext, Suspense, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { matchPath } from 'react-router-dom';
import { useLayout } from '../LayoutContext';
import { useTabPortalHost } from '../TabPortalHost';
import { PaneId, Tab } from '../types';

// ============================================================================
// Tab Context - Provides tab info to rendered components
// ============================================================================

interface TabContextValue {
    tabId: string;
    paneId: PaneId;
    path: string;
    params: Record<string, string>;
    isActive: boolean;
    isPaneActive: boolean;
    navigate: (path: string) => void;
}

const TabContext = createContext<TabContextValue | null>(null);

export function useTabContext(): TabContextValue {
    const ctx = useContext(TabContext);
    if (!ctx) {
        throw new Error('useTabContext must be used within a TabContent');
    }
    return ctx;
}

// ============================================================================
// Route Config Hook (placeholder - wire up with actual routes)
// ============================================================================

interface RouteConfig {
    path: string;
    component: React.ComponentType<any>;
    exact?: boolean;
}

// This should be replaced with your actual route configuration
function useRouteConfigs(): RouteConfig[] {
    // Import this from your routes configuration
    // For now, return empty - you'll need to wire this up
    return [];
}

// ============================================================================
// TabContent Component
// ============================================================================

interface TabContentProps {
    tab: Tab;
    paneId: PaneId;
    isActive: boolean;
    isPaneActive: boolean;
}

export function TabContent({ tab, paneId, isActive, isPaneActive }: TabContentProps) {
    const { getContainer } = useTabPortalHost();
    const { navigate } = useLayout();
    const routes = useRouteConfigs();

    // Get container for this tab
    const container = useMemo(() => getContainer(tab.id), [tab.id, getContainer]);

    // Resolve component from path
    const resolved = useMemo(() => {
        for (const route of routes) {
            const match = matchPath(
                { path: route.path, end: route.exact !== false },
                tab.path,
            );
            if (match) {
                return {
                    Component: route.component,
                    params: (match.params || {}) as Record<string, string>,
                };
            }
        }
        return { Component: null, params: {} };
    }, [routes, tab.path]);

    // Create tab context value
    const contextValue = useMemo<TabContextValue>(
        () => ({
            tabId: tab.id,
            paneId,
            path: tab.path,
            params: resolved.params,
            isActive,
            isPaneActive,
            navigate: (path: string) => {
                if (isActive && isPaneActive) {
                    navigate(path);
                }
            },
        }),
        [tab.id, tab.path, paneId, resolved.params, isActive, isPaneActive, navigate],
    );

    // Don't render if no component found
    if (!resolved.Component) {
        return null;
    }

    // Render into portal
    const element = (
        <div
            key={tab.id}
            style={{ width: '100%', height: '100%', position: 'relative' }}
        >
            <TabContext.Provider value={contextValue}>
                <Suspense
                    fallback={
                        <div className='flex items-center justify-center h-full'>
                            Loading...
                        </div>
                    }
                >
                    <resolved.Component key={tab.id} />
                </Suspense>
            </TabContext.Provider>
        </div>
    );

    return createPortal(element, container);
}

// ============================================================================
// TabContentMount - Mount point for tab content in pane
// ============================================================================

interface TabContentMountProps {
    tab: Tab;
    paneId: PaneId;
    isActive: boolean;
    isPaneActive: boolean;
}

export function TabContentMount({
    tab,
    paneId,
    isActive,
    isPaneActive,
}: TabContentMountProps) {
    const { attach } = useTabPortalHost();

    return (
        <>
            {/* Mount point for portal attachment */}
            <div
                ref={(el) => {
                    if (el) {
                        requestAnimationFrame(() => attach(tab.id, el));
                    }
                }}
                className='absolute inset-0'
                style={{
                    opacity: isActive ? 1 : 0,
                    pointerEvents: isActive ? 'auto' : 'none',
                    zIndex: isActive ? 1 : 0,
                }}
            />

            {/* Render the actual content into portal */}
            <TabContent
                tab={tab}
                paneId={paneId}
                isActive={isActive}
                isPaneActive={isPaneActive}
            />
        </>
    );
}
