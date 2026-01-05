import { TabContextValue } from '@/types/index';
import { createContext, ReactNode } from 'react';

// Create tab context for providing tab state to components
export const TabContext = createContext<TabContextValue | null>(null);

interface TabContextProviderProps {
    value: TabContextValue;
    children: ReactNode;
}

export const TabContextProvider = ({ value, children }: TabContextProviderProps) => {
    return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
};
