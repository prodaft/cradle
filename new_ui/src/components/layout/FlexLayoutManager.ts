import { TabFactory } from './TabFactory';
import { TabEventBus } from '../tabs/core/TabEventBus';
import { TabRegistry } from '../tabs/core/TabRegistry';


export class FlexLayoutManager {
  private tabFactory: TabFactory;
  private eventBus: TabEventBus;

  constructor() {
    this.tabFactory = new TabFactory();
    this.eventBus = TabEventBus.getInstance();
  }

  // Method to add a new tab dynamically
  addTab(tabType: string, customConfig: any = {}): any {
    try {
      const tabConfig = this.tabFactory.createTabConfig(tabType, customConfig);
      return tabConfig;
    } catch (error) {
      console.error('Error creating tab:', error);
      return null;
    }
  }

  getTabFactory() {
    return this.tabFactory.createTab;
  }

  getTabInitializer() {
    return this.tabFactory.initTab;
  }

  getAvailableTabTypes() {
    return TabRegistry.getInstance().getAllTabTypes();
  }
}