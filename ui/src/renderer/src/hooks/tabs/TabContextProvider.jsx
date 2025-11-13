import React, { createContext, useContext } from 'react';
import { TabContextValue } from '@/types/index';

// Create tab context for providing tab state to components
export const TabContext = createContext<TabContextValue | null>(null);

export const TabContextProvider = ({ value, children }) => {
  return (
    <TabContext.Provider value={value}>
      {children}
    </TabContext.Provider>
  );
};
