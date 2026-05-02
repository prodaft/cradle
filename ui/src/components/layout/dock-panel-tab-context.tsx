import type { DockviewPanelApi } from 'dockview';
import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
} from 'react';

export type DockPanelTabIcon =
    | 'account-settings'
    | 'dashboard'
    | 'digest-data'
    | 'enrichment'
    | 'fleeting-note'
    | 'files'
    | 'manage'
    | 'manage-enrichment'
    | 'manage-entities'
    | 'manage-entry-types'
    | 'manage-settings'
    | 'manage-type-mappings'
    | 'manage-users'
    | 'knowledge-graph'
    | 'notes'
    | 'not-found'
    | 'reports';

export interface DockPanelTabMetadata {
    title: string;
    icon: DockPanelTabIcon;
}

type DockPanelTabParams = {
    tabTitle?: string;
    tabIcon?: DockPanelTabIcon | null;
};

type SetMetadata = (metadata: DockPanelTabMetadata) => void;

const DockPanelTabContext = createContext<SetMetadata | null>(null);

/** When set, routes know whether their dock panel is active (foreground in its group). */
const DockPanelActiveContext = createContext<boolean | null>(null);

export function DockPanelActiveProvider({
    active,
    children,
}: {
    active: boolean;
    children: ReactNode;
}) {
    return (
        <DockPanelActiveContext.Provider value={active}>
            {children}
        </DockPanelActiveContext.Provider>
    );
}

/**
 * In docked layout, only the active panel should use the shared `#navbar-actions` slot.
 * Outside a dock panel provider, returns true so portals keep working (e.g. tests).
 */
export function useDockPanelActiveForNavbar(): boolean {
    const active = useContext(DockPanelActiveContext);
    return active !== false;
}

/** Provides a route-scoped way for pages to update their Dockview tab metadata. */
export function DockPanelTabProvider({
    panelApi,
    children,
}: {
    panelApi: DockviewPanelApi;
    children: ReactNode;
}) {
    const setTabMetadata = useCallback(
        ({ title, icon }: DockPanelTabMetadata) => {
            panelApi.updateParameters({
                ...panelApi.getParameters<DockPanelTabParams>(),
                tabTitle: title,
                tabIcon: icon,
            });
            panelApi.setTitle(title);
        },
        [panelApi],
    );

    const value = useMemo(() => setTabMetadata, [setTabMetadata]);

    return (
        <DockPanelTabContext.Provider value={value}>
            {children}
        </DockPanelTabContext.Provider>
    );
}

/** Sets the dock panel tab metadata while this route is mounted (in-app dock tabs). */
export function useDockPanelTab(
    metadata: DockPanelTabMetadata,
    enabled: boolean = true,
): void {
    const setMetadata = useContext(DockPanelTabContext);
    const { icon, title } = metadata;
    useEffect(() => {
        if (!setMetadata || !enabled) {
            return;
        }
        setMetadata({ icon, title });
    }, [enabled, icon, setMetadata, title]);
}
