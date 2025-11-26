import { TabContextValue } from '@/types/index';
import { createContext } from 'react';
// import type { TabContextValue } from '@/types/index';

// Create tab context for providing tab state to components
export const TabContext = createContext<TabContextValue | null>(null);

export const TabContextProvider = ({ value, children }) => {
    return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
};
