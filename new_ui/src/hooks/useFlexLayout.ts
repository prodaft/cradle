import { useState, useCallback, useEffect } from 'react';
import { Model, Actions, DockLocation } from 'flexlayout-react';
import { FlexLayoutManager } from '../components/layout/FlexLayoutManager';

const LAYOUT_STORAGE_KEY = 'flexlayout-state';
const GLOBALS = {
  tabEnableClose: true,
  splitterSize: 4,
  tabEnablePopout: false,
  tabEnableRename: false,
};


export const useFlexLayout = (initialModel: any) => {
  const [layoutManager] = useState(() => new FlexLayoutManager());
  
  // Load persisted layout or use initial model
  const [model] = useState(() => {
    try {
      const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (savedLayout) {
        const parsedLayout = JSON.parse(savedLayout);
        parsedLayout.global = { ...GLOBALS, ...parsedLayout.global };
        return Model.fromJson(parsedLayout);
      }
    } catch (error) {
      console.warn('Failed to load saved layout, using initial model:', error);
    }
    initialModel.global = { ...GLOBALS, ...initialModel.global };
    return Model.fromJson(initialModel);
  });

  // Save layout changes to localStorage
  const saveLayout = useCallback(() => {
    let initializer = layoutManager.getTabInitializer();

    model.visitNodes((node) => {
      if (node.getType() !== 'tab') return;
      let tabComponent = initializer(node);
      if (tabComponent && typeof tabComponent.saveConfig === 'function') {
        tabComponent.saveConfig();
      }
    });

    try {
      const layoutJson = model.toJson();
      layoutJson.global = { ...GLOBALS, ...layoutJson.global }; // Ensure global settings are included

      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layoutJson));
    } catch (error) {
      console.warn('Failed to save layout:', error);
    }
  }, [model]);

  // Set up model change listener to auto-save
  useEffect(() => {
    // Save layout periodically or when actions are performed
    const intervalId = setInterval(saveLayout, 2000); // Save every 2 seconds
    
    // Save layout when component unmounts
    return () => {
      clearInterval(intervalId);
      saveLayout();
    };
  }, [saveLayout]);

  const addTab = useCallback((tabType: string, config: any = {}, targetTabset?: string) => {
    const tabConfig = layoutManager.addTab(tabType, config);
    if (tabConfig) {
      model.doAction(Actions.addNode(
        tabConfig,
        targetTabset || model.getActiveTabset()?.getId() || 'main',
        DockLocation.CENTER,
        -1
      ));
      // Save layout after adding tab
      setTimeout(saveLayout, 100);
    }
  }, [layoutManager, model, saveLayout]);

  const resetLayout = useCallback(() => {
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
    // Reload the page to reset to initial model
    window.location.reload();
  }, []);

  return {
    model,
    layoutManager,
    addTab,
    resetLayout,
    saveLayout,
  };
};