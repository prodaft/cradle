import { BaseTabComponent, TabProps } from '../tabs/core/BaseTabComponent';
import { TabRegistry } from '../tabs/core/TabRegistry';

export class TabFactory {
  private registry: TabRegistry;

  constructor() {
    this.registry = TabRegistry.getInstance();
  }

  initTab = (node: any): BaseTabComponent | null => {
    const tabType = node.getComponent();
    const TabClass = this.registry.getTabClass(tabType);

    if (!TabClass) {
      console.error(`Tab type '${tabType}' not found in registry`);
      return null;
    }

    const tabInstance = new (TabClass as any)(node, this);
    tabInstance.config = {...tabInstance.defaultConfig, ...(node.getConfig() || {})};

    return tabInstance;
  }

  createTab = (node: any) => {
    const tabInstance = this.initTab(node);
    // Call lifecycle method if available
    if (tabInstance && tabInstance.onTabCreated) {
      tabInstance.onTabCreated(node);
    }

    return tabInstance ? tabInstance.render() : null;
  };

  // Utility method to create new tab configurations
  createTabConfig(componentType: string, customConfig: any = {}): any {
    const TabClass = this.registry.getTabClass(componentType);
    if (!TabClass) {
      throw new Error(`Tab type '${componentType}' not found`);
    }

    // Use static methods to get info without instantiation
    const staticTabType = (TabClass as any).tabType;
    const staticComponentType = (TabClass as any).componentType?.() || componentType;
    
    // Create a temporary instance to get display info (we still need some instance methods)
    const tempInstance = new (TabClass as any)({}, {}, this);
    const defaultProps = tempInstance.getDefaultProps?.() || {};
    const defaultConfig = tempInstance.defaultConfig || {};
    console.log('Creating tab config for:', staticTabType, staticComponentType, customConfig);

    return {
      type: staticTabType,
      component: staticComponentType,
      name: TabClass.componentType(),
      icon: tempInstance.icon,
      config: { ...defaultConfig, ...customConfig },
      ...defaultProps,
    };
  }
}
