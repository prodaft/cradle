import React from 'react';
import { FlexLayoutComponent } from './components/layout/FlexLayoutComponent';
import { useFlexLayout } from './hooks/useFlexLayout';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { ConfigurationProvider } from './providers/ConfigurationProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import LoginForm from './components/ui/LoginForm';
import TopBar from './components/ui/TopBar';
import { loadAllTabs } from './components/tabs';
import { loadAllCmds } from './components/commands';
import { CommandPanelProvider } from './providers/CommandPanelProvider';

const initialModel = {
  globals: {},
  borders: [
    {
      type: 'border',
      location: 'left',
      size: 200,
      children: [
          {
            type: 'tab',
            component: 'sublayout',
            name: 'Sublayout',
            enableClose: false,
          }
      ]
    }
  ],
  layout: {
    type: 'row',
    weight:50,
    children: [
      {
        type: 'tabset',
        id: 'main-tabset',
        children: [
          {
            type: 'tab',
            component: 'codeEditor',
            name: 'Code Editor',
          },
          {
            type: 'tab',
            component: 'preview',
            name: 'Preview',
          },
        ]
      }
    ]
  }
};

const MainApp: React.FC = () => {
  const { model, layoutManager, saveLayout, addTab } = useFlexLayout(initialModel);

  return (
    <div className="h-screen flex flex-col">
      <div className="relative z-50">
        <TopBar addTab={addTab} />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        <FlexLayoutComponent
          model={model}
          layoutManager={layoutManager}
          onModelChange={saveLayout}
        />
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <MainApp /> : <LoginForm />;
};

const App: React.FC = () => {
  loadAllTabs();
  loadAllCmds();

  return (
    <ConfigurationProvider>
      <ThemeProvider>
        <AuthProvider>
          <CommandPanelProvider>
            <AppContent />
          </CommandPanelProvider>
        </AuthProvider>
      </ThemeProvider>
    </ConfigurationProvider>
  );
};

export default App;
