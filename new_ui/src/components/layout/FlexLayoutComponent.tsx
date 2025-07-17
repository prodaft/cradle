import React from 'react';
import { Layout, Model, Action } from 'flexlayout-react';
import { FlexLayoutManager } from './FlexLayoutManager';

interface FlexLayoutComponentProps {
  model: Model;
  layoutManager: FlexLayoutManager;
  onModelChange?: () => void;
}

export const FlexLayoutComponent: React.FC<FlexLayoutComponentProps> = ({
  model,
  layoutManager,
  onModelChange
}) => {
  const factory = layoutManager.getTabFactory();
  const initializer = layoutManager.getTabInitializer();
  
  const onAction = (action: Action) => {
    // Let the model handle the action first
    const result = model.doAction(action);
    
    // Call the change handler if provided
    if (onModelChange) {
      setTimeout(onModelChange, 100);
    }
    
    return result;
  };

  return (
    <Layout
      model={model}
      factory={factory}
      onAction={onAction}
      onRenderTab={(node, renderValues) => {
        const tabComponent = initializer(node)!;
        renderValues.leading = tabComponent.icon;
        renderValues.content = tabComponent.displayName();
        if (node.getParent()?.constructor.TYPE == 'border') {
          renderValues.content = "";
        }
      }}
      onRenderTabSet={(layout, renderValues) => {
        const selectedIdx = layout.getSelected();
        renderValues.buttons = [];
        if (selectedIdx === -1) return;

        const selectedNode = layout.getChildren()[0];
        
        const tabComponent = initializer(selectedNode)!;
        const buttons = tabComponent.tabsetButtons ? tabComponent.tabsetButtons() : [];

        for (const button of buttons) {
          renderValues.buttons.push(button);
        }
      }}
    />
  );
};
