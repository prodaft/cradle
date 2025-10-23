import React, { createContext, useContext } from 'react';

// Create tab context for providing tab state to components
export const TabContext = createContext(null);

export const TabContextProvider = ({ value, children }) => {
  return (
    <TabContext.Provider value={value}>
      {children}
    </TabContext.Provider>
  );
};
