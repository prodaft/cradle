import {
    createContext,
    useContext,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';
import { createPortal } from 'react-dom';

interface SettingsHeaderActionsContextValue {
    container: HTMLDivElement | null;
    setContainer: Dispatch<SetStateAction<HTMLDivElement | null>>;
}

const SettingsHeaderActionsContext =
    createContext<SettingsHeaderActionsContextValue | null>(null);

export function SettingsHeaderActionsProvider({ children }: { children: ReactNode }) {
    const [container, setContainer] = useState<HTMLDivElement | null>(null);

    return (
        <SettingsHeaderActionsContext.Provider value={{ container, setContainer }}>
            {children}
        </SettingsHeaderActionsContext.Provider>
    );
}

export function SettingsHeaderActionsTarget() {
    const context = useContext(SettingsHeaderActionsContext);

    return <div ref={context?.setContainer} className='flex items-center' />;
}

export function useSettingsHeaderActionsContainer() {
    return useContext(SettingsHeaderActionsContext)?.container ?? null;
}

export function SettingsHeaderActionsPortal({ children }: { children: ReactNode }) {
    const container = useSettingsHeaderActionsContainer();

    return container ? createPortal(children, container) : null;
}
