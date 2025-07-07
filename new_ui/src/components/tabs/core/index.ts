import { BaseTabComponent } from './BaseTabComponent';
import { TabEventBus } from './TabEventBus';
import { TabRegistry } from './TabRegistry';

function RegisterTab(TabClass: any): any {
  const registry = TabRegistry.getInstance();
  registry.register(TabClass);
  return TabClass;
}

export {
  BaseTabComponent,
  TabEventBus,
  TabRegistry,
  RegisterTab
}
