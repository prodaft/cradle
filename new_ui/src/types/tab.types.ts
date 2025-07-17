export interface TabEvent {
  type: string;
  sourceTabId: string;
  targetTabId?: string;
  payload: any;
}

export interface TabConfig {
  type: string;
  component: string;
  name: string;
  icon?: string;
  config?: any;
  enableClose?: boolean;
  enableDrag?: boolean;
  enableRename?: boolean;
}