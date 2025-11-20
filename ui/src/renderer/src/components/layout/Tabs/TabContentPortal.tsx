import React, { useMemo, Suspense, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { matchPath } from 'react-router-dom';
import { useTabHost } from '@/contexts/tabs/TabHostContext';
import { useRouteConfigs } from '@/contexts/routing/RouteConfigContext';
import { getTitleForPath, getIconForPath } from '@/utils/tabs';
import { TabContextProvider } from '@/hooks/tabs/TabContextProvider';

interface Tab {
    id: string;
    path: string;
    title: string;
    icon: ReactNode;
}

interface TabContentPortalProps {
    tab: Tab;
    isActiveInActivePane: boolean;
    safeNavigate: (path: string) => void;
}

// Static property to track created tabs
const TabContentPortalStatic: { createdTabs?: Set<string> } = {};

export default function TabContentPortal({ tab, isActiveInActivePane, safeNavigate }: TabContentPortalProps) {
  const { ensureContainer } = useTabHost();
  const routes = useRouteConfigs();
  const container = useMemo(() => {
    // Only log when this specific tab portal is first created
    if (!TabContentPortalStatic.createdTabs) {
      TabContentPortalStatic.createdTabs = new Set();
    }
    if (!TabContentPortalStatic.createdTabs.has(tab.id)) {
      console.log('[TabContentPortal] First creation for tab:', tab.id, 'path:', tab.path);
      TabContentPortalStatic.createdTabs.add(tab.id);
    }
    return ensureContainer(tab.id);
  }, [tab.id, ensureContainer]);

  // Resolve component + params from tab.path
  const resolved = useMemo(() => {
    for (const r of routes) {
      const m = matchPath({ path: r.path, end: r.exact !== false }, tab.path);
      if (m) return { Component: r.component, params: m.params || {} };
    }
    return { Component: null, params: {} };
  }, [routes, tab.path]);

  // Keep title/icon in sync (no remount)
  tab.title = getTitleForPath(tab.path);
  tab.icon = getIconForPath(tab.path);

  if (!resolved.Component) return null;

  const navigate = (to: string, opts?: unknown) => {
    // No-history mode: only allow when active tab in active pane
    if (isActiveInActivePane) safeNavigate?.(to);
  };

  const element = (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <TabContextProvider
        value={{
          params: resolved.params,
          location: { pathname: tab.path, search: '', hash: '' },
          navigate,
          isActive: isActiveInActivePane,
          isPaneActive: isActiveInActivePane,
          isBackgroundTab: !isActiveInActivePane,
        }}
      >
        <Suspense fallback={null}>
          <resolved.Component />
        </Suspense>
      </TabContextProvider>
    </div>
  );

  return createPortal(element, container);
}
