import { TabEventBus } from './TabEventBus';
import { TabEvent } from '../../../types/tab.types';
import { Actions, Model } from 'flexlayout-react';

// Define props interface for our components
export interface TabProps {
  [key: string]: any;
}

// Enhanced BaseTabComponent with communication capabilities
export abstract class BaseTabComponent {
  static readonly tabType: string = 'tab';
  
  // Static method to get componentType without instantiation
  static componentType(): string {
    throw new Error('componentType must be implemented by subclasses');
  }
  
  abstract displayName(): string;
  abstract readonly label: string;
  abstract readonly closable: boolean;
  abstract readonly icon?: string | React.ReactElement;
  abstract readonly defaultConfig?: TabProps;

  protected eventBus: TabEventBus;
  public tabId: string = '';
  private unsubscribeFunctions: Array<() => void> = [];
  protected node: any;
  protected model: Model;
  protected factory: any;
  public config: TabProps;

  constructor(node: any, factory: any, model: any) {
    this.config = {}
    this.eventBus = TabEventBus.getInstance();
    this.node = node;
    this.tabId = this.node.getId? this.node.getId() : '';
    this.model = model;
    this.factory = factory;
  }

  abstract render(): React.ReactElement;

  // Enhanced lifecycle methods
  onTabCreated?(node: any): void;
  onTabDestroyed?(node: any): void;
  onTabActivated?(node: any): void;
  onTabDeactivated?(node: any): void;

  // Communication methods
  public subscribeToEvent(eventType: string, callback: (event: TabEvent) => void): void {
    const unsubscribe = this.eventBus.subscribe(this.tabId, eventType, callback);
    this.unsubscribeFunctions.push(unsubscribe);
  }

  public saveConfig(): void {
    this.node.getModel().doAction(Actions.updateNodeAttributes(this.tabId, {config: this.config}));
  }

  private updateConfig(config: TabProps): void {
    this.config = {...this.config, ...config };
    this.saveConfig();
  }

  public emitEvent(eventType: string, payload: any, targetTabId?: string): boolean {
    return this.eventBus.emit({
      type: eventType,
      sourceTabId: this.tabId,
      targetTabId,
      payload
    });
  }

  public cleanup(): void {
    // Unsubscribe from all events
    this.unsubscribeFunctions.forEach(unsub => unsub());
    this.unsubscribeFunctions = [];
    this.eventBus.unsubscribeAll(this.tabId);
  }

  // Helper to find related tabs
  protected findRelatedTabs(relationshipType: string): string[] {
    return this.eventBus.getListeners(`${relationshipType}:request`);
  }

  // Methods for Set operations and duplicate detection
  public equals(other: BaseTabComponent): boolean {
    return this.tabId === other.tabId && 
           this.constructor.componentType() === other.constructor.componentType();
  }

  public getUniqueKey(): string {
    return `${this.constructor.componentType()}:${this.tabId}`;
  }

  // Override valueOf for primitive conversion in Set operations
  public valueOf(): string {
    return this.getUniqueKey();
  }

  // Override toString for string representation
  public toString(): string {
    return this.getUniqueKey();
  }

  public tabsetButtons(): React.ReactElement[] {
    return [];
  }
}

