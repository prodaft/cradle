import { BaseTabComponent } from "./BaseTabComponent";

// Registry to manage all tab types
export class TabRegistry {
  private static instance: TabRegistry;
  private tabTypes: Map<string, typeof BaseTabComponent> = new Map();

  static getInstance(): TabRegistry {
    if (!TabRegistry.instance) {
      TabRegistry.instance = new TabRegistry();
    }
    
    return TabRegistry.instance;
  }

  // Register a new tab type
  register(TabClass: typeof BaseTabComponent): void {
    // Use static method to get componentType without instantiation
    const componentType = (TabClass as any).componentType?.() || 'unknown';
    this.tabTypes.set(componentType, TabClass);
  }

  // Get a tab class by type
  getTabClass(tabType: string): typeof BaseTabComponent | undefined {
    return this.tabTypes.get(tabType);
  }

  // Get all registered tab types
  getAllTabTypes(): Array<{ type: string; displayName: string; icon?: string }> {
    return Array.from(this.tabTypes.entries()).map(([type, TabClass]) => {
      // Create temporary instance to get display info (we still need some instance methods)
      const tempInstance = new (TabClass as any)({}, {}, null);
      return {
        type,
        displayName: tempInstance.displayName(),
        icon: tempInstance.icon,
      };
    });
  }

  // Check if a tab type exists
  hasTabType(tabType: string): boolean {
    return this.tabTypes.has(tabType);
  }
}
