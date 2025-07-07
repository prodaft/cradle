import { VscAccount } from 'react-icons/vsc';
import { BaseTabComponent, RegisterTab } from '../core';

// Sublayout tab class
@RegisterTab
export class SublayoutTab extends BaseTabComponent {
  public readonly tabType = 'sub';
  
  static componentType(): string {
    return 'sublayout';
  }
  
  public displayName(): string {
    return 'Sublayout';
  }
  public readonly label = 'Sublayout';
  public readonly closable = true;
  public readonly icon = <VscAccount size={32} />;
  public readonly defaultConfig = {
    sublayoutId: null,
    allowedTabTypes: ['codeEditor', 'preview'], // Can be configured
  };

  render(): React.ReactElement {
    this.tabId = this.node.getId();
    return <></>;
  }

  setupEventListeners(): void {
    // Listen for sublayout-specific events
    this.subscribeToEvent('sublayout:add_tab', (event) => {
      console.log('Adding tab to sublayout:', event.payload);
    });

    this.subscribeToEvent('sublayout:remove_tab', (event) => {
      console.log('Removing tab from sublayout:', event.payload);
    });
  }

  getInitialSublayoutModel(): any {
    return {
      global: {
        tabEnableClose: true,
        tabEnableRename: true,
        tabClassName: 'sublayout-tab',
        tabSetClassName: 'sublayout-tabset',
      },
      borders: [],
      layout: {
        type: 'row',
        weight: 100,
        children: [
          {
            type: 'tabset',
            id: 'sublayout-tabset',
            children: [
            ]
          }
        ]
      }
    };
  }

  // Method to add a new tab to this sublayout
  public addTab(tabType: string, config: any = {}): void {
    this.emitEvent('sublayout:add_tab', {
      tabType,
      config,
      sublayoutId: this.tabId
    });
  }

  // Method to remove a tab from this sublayout
  public removeTab(tabId: string): void {
    this.emitEvent('sublayout:remove_tab', {
      tabId,
      sublayoutId: this.tabId
    });
  }

  // Get configuration for allowed tab types
  public getAllowedTabTypes(): string[] {
    return this.defaultConfig.allowedTabTypes;
  }

  onTabCreated(_node: any): void {
    console.log('Sublayout tab created:', this.tabId);
  }

  onTabDestroyed(_node: any): void {
    console.log('Sublayout tab destroyed:', this.tabId);
    this.cleanup();
  }

  onTabActivated(_node: any): void {
    console.log('Sublayout tab activated:', this.tabId);
  }

  onTabDeactivated(_node: any): void {
    console.log('Sublayout tab deactivated:', this.tabId);
  }
}
