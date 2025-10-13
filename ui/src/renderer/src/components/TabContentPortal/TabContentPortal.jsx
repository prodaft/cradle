import React, { useMemo, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { matchPath } from 'react-router-dom';
import { useTabHost } from '../../contexts/TabHostContext/TabHostContext';
import { useRouteConfigs } from '../../contexts/RouteConfigContext/RouteConfigContext';
import { getTitleForPath, getIconForPath } from '../../utils/tabUtils/tabUtils';
import { TabContextProvider } from '../../hooks/useTabContext/TabContextProvider';

export default function TabContentPortal({ tab, isActiveInActivePane, safeNavigate }) {
  const { ensureContainer } = useTabHost();
  const routes = useRouteConfigs();
  const container = useMemo(() => {
    // Only log when this specific tab portal is first created
    if (!TabContentPortal.createdTabs) {
      TabContentPortal.createdTabs = new Set();
    }
    if (!TabContentPortal.createdTabs.has(tab.id)) {
      console.log('[TabContentPortal] First creation for tab:', tab.id, 'path:', tab.path);
      TabContentPortal.createdTabs.add(tab.id);
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
  
  const navigate = (to, opts) => {
    // No-history mode: only allow when active tab in active pane
    if (isActiveInActivePane) safeNavigate?.(to, opts);
  };

  const element = (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <TabContextProvider
        value={{
          params: resolved.params,
          location: { pathname: tab.path, search: '', hash: '' }, // captured
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
