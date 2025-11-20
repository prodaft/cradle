import React from 'react';
import { usePaneTabs } from '@/contexts/tabs/PaneTabsContext';
import TabContentPortal from '@components/layout/Tabs/TabContentPortal';
import { useLayout } from '@/contexts/ui/LayoutContext';

// Static property to track tab structure changes
const GlobalTabPortalsStatic: { lastTabStructure?: string } = {};

export default function GlobalTabPortals() {
  const { paneTabsState, safeNavigate } = usePaneTabs();
  const { activePaneId } = useLayout();

  // Debug logging with state tracking
  const allTabs = Object.entries(paneTabsState).flatMap(([paneId, pane]) =>
    pane.tabs.map(tab => ({ paneId, tabId: tab.id, path: tab.path }))
  );

  // Only log when the tab structure actually changes
  const tabStructure = JSON.stringify(allTabs.map(t => ({ paneId: t.paneId, tabId: t.tabId })));
  if (GlobalTabPortalsStatic.lastTabStructure !== tabStructure) {
    console.log('[GlobalTabPortals] Tab structure changed:', allTabs);
    GlobalTabPortalsStatic.lastTabStructure = tabStructure;
  }

  return (
    <div style={{ display: 'none' }}>
      {Object.entries(paneTabsState).flatMap(([paneId, pane]) =>
        pane.tabs.map((tab, i) => (
          <TabContentPortal
            key={tab.id}
            tab={tab}
            isActiveInActivePane={paneId === activePaneId && i === pane.activeTabIndex}
            safeNavigate={safeNavigate}
          />
        ))
      )}
    </div>
  );
}
