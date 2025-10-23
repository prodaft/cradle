import React from 'react';
import { usePaneTabs } from '../../contexts/PaneTabsContext/PaneTabsContext';
import TabContentPortal from '../TabContentPortal/TabContentPortal';
import { useLayout } from '../../contexts/LayoutContext/LayoutContext';

export default function GlobalTabPortals() {
  const { paneTabsState, safeNavigate } = usePaneTabs();
  const { activePaneId } = useLayout();

  // Debug logging with state tracking
  const allTabs = Object.entries(paneTabsState).flatMap(([paneId, pane]) =>
    pane.tabs.map(tab => ({ paneId, tabId: tab.id, path: tab.path }))
  );
  
  // Only log when the tab structure actually changes
  const tabStructure = JSON.stringify(allTabs.map(t => ({ paneId: t.paneId, tabId: t.tabId })));
  if (GlobalTabPortals.lastTabStructure !== tabStructure) {
    console.log('[GlobalTabPortals] Tab structure changed:', allTabs);
    GlobalTabPortals.lastTabStructure = tabStructure;
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
