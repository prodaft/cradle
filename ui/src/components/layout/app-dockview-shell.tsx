import { PageLoader } from '@/components/base/page-loader';
import { panelRouteTree } from '@/components/layout/dock-panel-route-tree';
import {
    DockPanelActiveProvider,
    DockPanelTabProvider,
    type DockPanelTabIcon,
} from '@/components/layout/dock-panel-tab-context';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
    createMemoryHistory,
    createRouter,
    defaultParseSearch,
    defaultStringifySearch,
    Matches,
    RouterContextProvider,
    useLocation,
    useRouter,
    useRouterState,
    type AnyRouter,
} from '@tanstack/react-router';
import {
    DockviewReact,
    themeDark,
    themeLight,
    type DockviewApi,
    type DockviewPanelApi,
    type DockviewReadyEvent,
    type DockviewTheme,
    type IDockviewHeaderActionsProps,
    type IDockviewPanel,
    type IDockviewPanelHeaderProps,
    type IDockviewPanelProps,
    type SerializedDockview,
} from 'dockview';
import {
    Archive,
    Building2,
    CircleHelp,
    Columns2,
    Crown,
    Database,
    Feather,
    FileBarChart,
    FileText,
    Layers,
    LayoutDashboard,
    Link2,
    ListMinus,
    ListX,
    Network,
    Plus,
    Settings,
    Sparkles,
    Users,
    Wrench,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import React, {
    createContext,
    Suspense,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import '@styles/dockview.css';
import 'dockview/dist/styles/dockview.css';

export type AppRouteTabParams = {
    href: string;
    tabTitle?: string;
    tabIcon?: DockPanelTabIcon | null;
};

const DOCKVIEW_LAYOUT_STORAGE_KEY = 'cradle:dockview:layout:v1';
const DOCKVIEW_LAYOUT_PERSIST_DEBOUNCE_MS = 150;

const TAB_ICONS: Record<DockPanelTabIcon, LucideIcon> = {
    'account-settings': Settings,
    dashboard: LayoutDashboard,
    'digest-data': Database,
    enrichment: Sparkles,
    'fleeting-note': Feather,
    files: Archive,
    manage: Crown,
    'manage-enrichment': Sparkles,
    'manage-entities': Building2,
    'manage-entry-types': Layers,
    'manage-settings': Wrench,
    'manage-type-mappings': Link2,
    'manage-users': Users,
    'knowledge-graph': Network,
    notes: FileText,
    'not-found': CircleHelp,
    reports: FileBarChart,
};

function tabIconForParams(params: AppRouteTabParams): LucideIcon | undefined {
    const icon = params.tabIcon;
    return icon ? TAB_ICONS[icon] : undefined;
}

function tabParamsForHref(href: string): AppRouteTabParams {
    return {
        href,
        tabTitle: '',
        tabIcon: null,
    };
}

function hrefOnlyTabParams(href: string): Pick<AppRouteTabParams, 'href'> {
    return { href };
}

function updatePanelParams(
    panelApi: DockviewPanelApi,
    params: Partial<AppRouteTabParams>,
): void {
    panelApi.updateParameters({
        ...panelApi.getParameters<AppRouteTabParams>(),
        ...params,
    });
}

function readStoredDockviewLayout(): SerializedDockview | null {
    if (typeof window === 'undefined') {
        return null;
    }

    let raw: string | null;
    try {
        raw = window.localStorage.getItem(DOCKVIEW_LAYOUT_STORAGE_KEY);
    } catch {
        return null;
    }

    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as SerializedDockview;
    } catch {
        clearStoredDockviewLayout();
        return null;
    }
}

function clearStoredDockviewLayout(): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.removeItem(DOCKVIEW_LAYOUT_STORAGE_KEY);
    } catch {
        /* ignore storage failures */
    }
}

function writeDockviewLayout(api: DockviewApi): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        window.localStorage.setItem(
            DOCKVIEW_LAYOUT_STORAGE_KEY,
            JSON.stringify(api.toJSON()),
        );
    } catch {
        /* ignore storage quota / availability failures */
    }
}

/**
 * Single shared debounce timer for layout persistence. Both structural changes
 * (`onDidLayoutChange`) and per-panel URL updates funnel through this so we never
 * write more than once per debounce window, regardless of how many sources fire.
 */
let pendingPersistTimer: number | undefined;

function schedulePersistDockviewLayout(api: DockviewApi): void {
    if (typeof window === 'undefined') {
        return;
    }
    if (pendingPersistTimer !== undefined) {
        window.clearTimeout(pendingPersistTimer);
    }
    pendingPersistTimer = window.setTimeout(() => {
        pendingPersistTimer = undefined;
        writeDockviewLayout(api);
    }, DOCKVIEW_LAYOUT_PERSIST_DEBOUNCE_MS);
}

/**
 * Cancel any pending debounced write and immediately flush the latest layout
 * to storage. Safe to call multiple times. No-ops if there's nothing pending,
 * because the most recent state has already been written via the debounced
 * path or the initial post-`onReady` write.
 */
function flushPersistDockviewLayout(api: DockviewApi): void {
    if (typeof window === 'undefined' || pendingPersistTimer === undefined) {
        return;
    }
    window.clearTimeout(pendingPersistTimer);
    pendingPersistTimer = undefined;
    writeDockviewLayout(api);
}

function restoreDockviewLayout(api: DockviewApi): boolean {
    const layout = readStoredDockviewLayout();
    if (!layout) {
        return false;
    }

    try {
        api.fromJSON(layout, { reuseExistingPanels: false });
    } catch {
        clearStoredDockviewLayout();
        api.clear();
        return false;
    }

    const brokenPanels = api.panels.filter((panel) => {
        const href = panelHref(panel);
        return typeof href !== 'string' || href.length === 0;
    });
    for (const panel of brokenPanels) {
        api.removePanel(panel);
    }

    if (api.panels.length === 0) {
        clearStoredDockviewLayout();
        api.clear();
        return false;
    }

    if (brokenPanels.length > 0) {
        writeDockviewLayout(api);
    }

    return true;
}

/** TanStack Router `location.search` is a parsed object, not a query string. */
function serializeSearch(search: unknown): string {
    if (search == null || search === false) {
        return '';
    }
    if (typeof search === 'string') {
        if (search === '') {
            return '';
        }
        return search.startsWith('?') ? search : `?${search}`;
    }
    if (typeof search === 'object' && !Array.isArray(search)) {
        return defaultStringifySearch(search as Record<string, unknown>);
    }
    return '';
}

function locationHref(loc: {
    pathname: string;
    search?: unknown;
    href?: string;
}): string {
    if (typeof loc.href === 'string' && loc.href.length > 0) {
        const h = loc.href;
        if (h.startsWith('http://') || h.startsWith('https://')) {
            try {
                const u = new URL(h);
                return `${u.pathname}${u.search}`;
            } catch {
                /* pathname + search below */
            }
        }
        if (h.startsWith('/') && !h.startsWith('//')) {
            return h;
        }
    }
    return `${loc.pathname}${serializeSearch(loc.search)}`;
}

function parseAppHref(href: string): { to: string; search?: Record<string, unknown> } {
    const q = href.indexOf('?');
    const pathname = (q === -1 ? href : href.slice(0, q)) || '/';
    const searchStr = q === -1 ? '' : href.slice(q + 1);
    if (!searchStr) {
        return { to: pathname };
    }
    return { to: pathname, search: defaultParseSearch(searchStr) };
}

function navigateToHref(router: AnyRouter, href: string, replace = true): void {
    const { to, search } = parseAppHref(href);
    void router.navigate({
        to: to as never,
        search: search as never,
        replace,
    });
}

function newTabId(): string {
    return crypto.randomUUID();
}

function panelHref(panel: IDockviewPanel | undefined): string | undefined {
    return (panel?.params as AppRouteTabParams | undefined)?.href;
}

/**
 * When a duplicate tab is created against a reference panel pointing at the same
 * href, copy its tab title/icon so the new tab doesn't flash blank until the
 * inner route mounts and (re)sets the metadata via `useDockPanelTab`.
 */
function clonedTabParamsForHref(
    href: string,
    referencePanel: IDockviewPanel | undefined,
): AppRouteTabParams {
    if (!referencePanel) {
        return tabParamsForHref(href);
    }
    const refParams = referencePanel.params as AppRouteTabParams | undefined;
    if (!refParams || refParams.href !== href) {
        return tabParamsForHref(href);
    }
    return {
        href,
        tabTitle: refParams.tabTitle ?? '',
        tabIcon: refParams.tabIcon ?? null,
    };
}

function addTabInGroup(
    api: DockviewApi,
    href: string,
    referencePanel: IDockviewPanel,
): IDockviewPanel {
    return api.addPanel({
        id: newTabId(),
        component: 'default',
        title: '',
        params: clonedTabParamsForHref(href, referencePanel),
        renderer: 'always',
        position: { direction: 'within', referencePanel: referencePanel.id },
    });
}

function reconcileDockviewWithOuterLocation(
    api: DockviewApi,
    router: AnyRouter,
    navigateOuterToPanelHref: (href: string) => void,
): void {
    const outerHref = locationHref(router.state.location);
    const activePanel = api.activePanel;
    const activeHref = panelHref(activePanel);

    if (outerHref === activeHref) {
        return;
    }

    const existing = api.panels.find((p) => panelHref(p) === outerHref);
    if (existing) {
        existing.api.setActive();
        return;
    }

    const ref = activePanel ?? api.panels[0];
    if (ref) {
        const added = addTabInGroup(api, outerHref, ref);
        added.api.setActive();
        schedulePersistDockviewLayout(api);
        return;
    }

    if (activeHref) {
        navigateOuterToPanelHref(activeHref);
    }
}

function splitPanelRight(
    api: DockviewApi,
    router: AnyRouter,
    referencePanel: IDockviewPanel,
): void {
    const href = panelHref(referencePanel) ?? locationHref(router.state.location);
    api.addPanel({
        id: newTabId(),
        component: 'default',
        title: '',
        params: clonedTabParamsForHref(href, referencePanel),
        renderer: 'always',
        position: { direction: 'right', referencePanel: referencePanel.id },
    });
}

function usePanelRuntimeState(api: DockviewPanelApi): {
    isActive: boolean;
} {
    const [state, setState] = useState(() => ({
        isActive: api.isActive,
    }));

    useEffect(() => {
        const update = () => {
            setState((current) => {
                const next = {
                    isActive: api.isActive,
                };
                if (current.isActive === next.isActive) {
                    return current;
                }
                return next;
            });
        };

        update();
        const activeSub = api.onDidActiveChange(update);
        const groupSub = api.onDidGroupChange(update);

        return () => {
            activeSub.dispose();
            groupSub.dispose();
        };
    }, [api]);

    return state;
}

function createPanelRouter(href: string) {
    const history = createMemoryHistory({
        initialEntries: [href],
    });

    return createRouter({
        routeTree: panelRouteTree,
        history,
        defaultPreload: false,
        scrollRestoration: false,
    });
}

interface PanelRouteSyncProps {
    isActive: boolean;
    containerApi: DockviewApi;
    outerRouter: AnyRouter;
    panelApi: DockviewPanelApi;
}

function PanelRouteSync({
    isActive,
    containerApi,
    outerRouter,
    panelApi,
}: PanelRouteSyncProps): null {
    const href = useRouterState({ select: (state) => locationHref(state.location) });

    useEffect(() => {
        const currentParams = panelApi.getParameters<AppRouteTabParams>();
        if (currentParams?.href !== href) {
            updatePanelParams(panelApi, hrefOnlyTabParams(href));
            schedulePersistDockviewLayout(containerApi);
        }

        if (isActive && locationHref(outerRouter.state.location) !== href) {
            navigateToHref(outerRouter, href);
        }
    }, [containerApi, href, isActive, outerRouter, panelApi]);

    return null;
}

const RoutePanel: React.FunctionComponent<IDockviewPanelProps<AppRouteTabParams>> = (
    props,
) => {
    const outerRouter = useRouter();
    const { isActive } = usePanelRuntimeState(props.api);
    const href = props.params.href;
    const panelRouterRef = useRef<ReturnType<typeof createPanelRouter> | null>(null);
    if (!panelRouterRef.current) {
        panelRouterRef.current = createPanelRouter(href);
    }
    const panelRouter = panelRouterRef.current;

    useEffect(() => {
        void panelRouter.load();
    }, [panelRouter]);

    useEffect(() => {
        const current = locationHref(panelRouter.state.location);
        if (current !== href) {
            navigateToHref(panelRouter, href);
        }
    }, [href, panelRouter]);

    return (
        <div className='relative box-border h-full min-h-0 w-full overflow-y-auto overflow-x-hidden bg-background text-foreground'>
            <DockPanelActiveProvider active={isActive}>
                <DockPanelTabProvider panelApi={props.api}>
                    <RouterContextProvider router={panelRouter as AnyRouter}>
                        <PanelRouteSync
                            isActive={isActive}
                            containerApi={props.containerApi}
                            outerRouter={outerRouter}
                            panelApi={props.api}
                        />
                        <Suspense fallback={<PageLoader fill='container' />}>
                            <Matches />
                        </Suspense>
                    </RouterContextProvider>
                </DockPanelTabProvider>
            </DockPanelActiveProvider>
        </div>
    );
};

const components = {
    default: RoutePanel,
};

function AppDockviewTab(
    props: IDockviewPanelHeaderProps<AppRouteTabParams>,
): React.JSX.Element {
    const { api } = props;
    const title = props.params.tabTitle ?? '';
    const Icon = title ? tabIconForParams(props.params) : undefined;

    const middleButtonDown = useRef(false);

    const panelCount = api.group.panels.length;
    const canCloseOthers = panelCount > 1;

    const onCloseTab = useCallback(() => {
        api.close();
    }, [api]);

    const onCloseOtherTabs = useCallback(() => {
        const selfId = api.id;
        for (const p of [...api.group.panels]) {
            if (p.api.id !== selfId) {
                p.api.close();
            }
        }
    }, [api]);

    const onCloseAllTabs = useCallback(() => {
        for (const p of [...api.group.panels]) {
            p.api.close();
        }
    }, [api]);

    const onTabPointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            middleButtonDown.current = event.button === 1;
        },
        [],
    );

    const onTabPointerUp = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            if (middleButtonDown.current && event.button === 1) {
                middleButtonDown.current = false;
                event.preventDefault();
                api.close();
            }
        },
        [api],
    );

    const onTabPointerLeave = useCallback(() => {
        middleButtonDown.current = false;
    }, []);

    const onCloseGlyphPointerDown = useCallback(
        (event: React.PointerEvent) => {
            event.preventDefault();
        },
        [],
    );

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className='cradle-dockview-tab-title'
                    onPointerDown={onTabPointerDown}
                    onPointerUp={onTabPointerUp}
                    onPointerLeave={onTabPointerLeave}
                >
                    {Icon ? (
                        <Icon
                            className='cradle-dockview-tab-title-icon'
                            aria-hidden
                            strokeWidth={2}
                        />
                    ) : null}
                    <span className='cradle-dockview-tab-title-text'>{title}</span>
                    <Button
                        type='button'
                        variant='ghost'
                        size='icon-xs'
                        className={cn(
                            'cradle-dockview-tab-title-close',
                            'size-[18px] min-h-0 min-w-0 rounded-[2px] p-0',
                        )}
                        aria-label={`Close ${title || 'tab'}`}
                        onPointerDown={onCloseGlyphPointerDown}
                        onClick={(event) => {
                            event.stopPropagation();
                            api.close();
                        }}
                    >
                        <X aria-hidden className='size-3' strokeWidth={2.2} />
                    </Button>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent
                className={cn(
                    'w-52',
                    'z-[10050]',
                )}
            >
                <ContextMenuItem onSelect={onCloseTab}>
                    <X aria-hidden className='size-4' strokeWidth={2} />
                    Close
                </ContextMenuItem>
                <ContextMenuItem
                    onSelect={onCloseOtherTabs}
                    disabled={!canCloseOthers}
                >
                    <ListMinus aria-hidden className='size-4' strokeWidth={2} />
                    Close others
                </ContextMenuItem>
                <ContextMenuItem
                    variant='destructive'
                    onSelect={onCloseAllTabs}
                >
                    <ListX aria-hidden className='size-4' strokeWidth={2} />
                    Close all
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

function DockviewGroupHeaderActions(props: IDockviewHeaderActionsProps) {
    const router = useRouter();
    const refPanel = props.activePanel ?? props.panels[0];
    if (!refPanel) {
        return null;
    }
    const api = props.containerApi;
    return (
        <div className='cradle-dockview-header-actions'>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type='button'
                        variant='ghost'
                        size='icon-sm'
                        className='dockview-header-toolbar-btn'
                        aria-label='Split right'
                        onClick={(e) => {
                            e.stopPropagation();
                            splitPanelRight(api, router, refPanel);
                        }}
                    >
                        <Columns2 className='size-4' strokeWidth={2} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side='bottom' className='z-[10050]'>
                    Split right
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type='button'
                        variant='ghost'
                        size='icon-sm'
                        className='dockview-header-toolbar-btn'
                        aria-label='New tab'
                        onClick={(e) => {
                            e.stopPropagation();
                            const href =
                                panelHref(refPanel) ??
                                locationHref(router.state.location);
                            addTabInGroup(api, href, refPanel);
                        }}
                    >
                        <Plus className='size-4' strokeWidth={2} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side='bottom' className='z-[10050]'>
                    New tab
                </TooltipContent>
            </Tooltip>
        </div>
    );
}

export interface AppDockviewContextValue {
    api: DockviewApi | null;
}

const AppDockviewContext = createContext<AppDockviewContextValue>({ api: null });

export function useAppDockview(): AppDockviewContextValue {
    return useContext(AppDockviewContext);
}

export function AppDockviewShell(): React.JSX.Element {
    const router = useRouter();
    const location = useLocation();
    const { resolvedTheme } = useTheme();
    const [dockApi, setDockApi] = useState<DockviewApi | null>(null);
    const dockApiRef = useRef<DockviewApi | null>(null);
    const pendingOuterHrefRef = useRef<string | null>(null);

    useEffect(() => {
        dockApiRef.current = dockApi;
    }, [dockApi]);

    const theme: DockviewTheme = resolvedTheme === 'dark' ? themeDark : themeLight;

    const contextValue = useMemo(() => ({ api: dockApi }), [dockApi]);

    const navigateOuterToPanelHref = useCallback(
        (href: string) => {
            if (locationHref(router.state.location) === href) {
                pendingOuterHrefRef.current = null;
                return;
            }
            pendingOuterHrefRef.current = href;
            navigateToHref(router, href);
        },
        [router],
    );

    const onReady = useCallback(
        (event: DockviewReadyEvent) => {
            const { api } = event;
            if (api.panels.length > 0) {
                reconcileDockviewWithOuterLocation(
                    api,
                    router,
                    navigateOuterToPanelHref,
                );
                setDockApi(api);
                return;
            }

            if (restoreDockviewLayout(api)) {
                reconcileDockviewWithOuterLocation(
                    api,
                    router,
                    navigateOuterToPanelHref,
                );
                setDockApi(api);
                return;
            }

            const loc = router.state.location;
            const href = locationHref(loc);
            api.addPanel({
                id: newTabId(),
                component: 'default',
                title: '',
                params: tabParamsForHref(href),
                renderer: 'always',
            });
            setDockApi(api);
        },
        [navigateOuterToPanelHref, router],
    );

    useEffect(() => {
        const api = dockApi;
        if (!api) {
            return;
        }

        const sub = api.onDidLayoutChange(() => {
            schedulePersistDockviewLayout(api);
        });
        writeDockviewLayout(api);

        return () => {
            sub.dispose();
            flushPersistDockviewLayout(api);
        };
    }, [dockApi]);

    useEffect(() => {
        const api = dockApi;
        if (!api) {
            return;
        }
        const sub = api.onDidActivePanelChange((panel) => {
            if (!panel) {
                return;
            }
            const href = (panel.params as AppRouteTabParams | undefined)?.href;
            if (!href) {
                return;
            }
            const cur = locationHref(router.state.location);
            if (cur === href) {
                return;
            }
            navigateOuterToPanelHref(href);
        });
        return () => sub.dispose();
    }, [dockApi, navigateOuterToPanelHref, router]);

    useEffect(() => {
        const api = dockApi;
        const panel = api?.activePanel;
        if (!api || !panel) {
            return;
        }

        const href = locationHref(location);
        const pendingHref = pendingOuterHrefRef.current;
        if (pendingHref !== null) {
            pendingOuterHrefRef.current = null;
            if (pendingHref === href) {
                return;
            }
        }

        if (panelHref(panel) === href) {
            return;
        }

        updatePanelParams(panel.api, hrefOnlyTabParams(href));
        schedulePersistDockviewLayout(api);
    }, [dockApi, location]);

    useEffect(() => {
        const api = dockApi;
        if (!api) {
            return;
        }
        const sub = api.onDidRemovePanel(() => {
            queueMicrotask(() => {
                const a = dockApiRef.current;
                if (!a || a.panels.length > 0) {
                    return;
                }
                const loc = router.state.location;
                const href = locationHref(loc);
                a.addPanel({
                    id: newTabId(),
                    component: 'default',
                    title: '',
                    params: tabParamsForHref(href),
                    renderer: 'always',
                });
            });
        });
        return () => sub.dispose();
    }, [dockApi, router]);

    return (
        <AppDockviewContext.Provider value={contextValue}>
            <DockviewReact
                className={cn(
                    'cradle-dockview absolute inset-0 h-full w-full min-h-0',
                    '[&_.dv-content-container]:bg-background [&_.dv-react-part]:bg-background',
                )}
                theme={theme}
                defaultRenderer='always'
                components={components}
                defaultTabComponent={AppDockviewTab}
                onReady={onReady}
                rightHeaderActionsComponent={DockviewGroupHeaderActions}
            />
        </AppDockviewContext.Provider>
    );
}
