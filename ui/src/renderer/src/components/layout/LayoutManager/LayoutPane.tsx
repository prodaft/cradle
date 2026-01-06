import { usePaneTabs } from '@/contexts/tabs/PaneTabsContext';
import { useTabHost } from '@/contexts/tabs/TabHostContext';
import { useLayout } from '@/contexts/ui/LayoutContext';
import { Tab } from '@/utils/tabs';
import { Menu, NavArrowDown, Plus, SplitArea, Xmark } from 'iconoir-react';
import React, {
    CSSProperties,
    memo,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

// Extend window interface for drag flag
declare global {
    interface Window {
        __cradleTabDragging?: boolean;
    }
}

interface DragData {
    paneId: string;
    tabIndex: number;
    tabCount: number;
}

interface DragOverState {
    index: number;
    dropBefore: boolean;
}

type DropZone = 'top' | 'bottom' | 'left' | 'right' | 'tabbar' | null;

const getTabbarTopOverride = (tabbarEl: HTMLElement | null): number => {
    const h = tabbarEl?.getBoundingClientRect().height || 0;
    return Math.max(8, Math.min(32, Math.round(h * 0.4)));
};

const getStickyPx = (tabbarEl: HTMLElement | null): number => {
    const base = tabbarEl?.getBoundingClientRect().height || 40;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    return Math.max(8, Math.min(40, Math.round((base * 0.6) / dpr)));
};

// DND constants and helpers
const DND_MIME = 'application/x-cradle-tab';

const setCradleTab = (dt: DataTransfer, payload: DragData): void =>
    dt.setData(DND_MIME, JSON.stringify(payload));
const getCradleTab = (dt: DataTransfer | null): DragData | null => {
    if (!dt) return null;
    try {
        return JSON.parse(dt.getData(DND_MIME));
    } catch {
        return null;
    }
};
const hasCradleTab = (dt: DataTransfer | null): boolean => {
    if (!dt) return false;
    const t = dt?.types || [];
    return (
        (typeof (t as any).contains === 'function'
            ? (t as any).contains(DND_MIME)
            : Array.from(t).includes(DND_MIME)) || !!dt?.getData(DND_MIME)
    );
};

// Global drag flag helpers
const setGlobalDragFlag = (value: boolean): void => {
    try {
        window.__cradleTabDragging = value;
    } catch { }
};
const clearGlobalDragFlag = (): void => {
    try {
        window.__cradleTabDragging = false;
    } catch { }
};

/**
 * Robust helper to detect if we're dragging a Cradle tab
 */
function isCradleTabDrag(e: DragEvent | React.DragEvent): boolean {
    if (typeof window !== 'undefined' && window.__cradleTabDragging) return true;
    const dt = e.dataTransfer;
    if (!dt) return false;
    return hasCradleTab(dt);
}

/**
 * Helper to compute reorder target index with consistent logic
 */
const computeReorderTarget = ({
    sourceIndex,
    hoverIndex,
    dropBefore,
}: {
    sourceIndex: number;
    hoverIndex: number;
    dropBefore: boolean;
}): number => {
    let target = dropBefore ? hoverIndex : hoverIndex + 1;
    if (sourceIndex < hoverIndex && target > sourceIndex) target -= 1;
    if (sourceIndex > hoverIndex && target <= sourceIndex) target += 0;
    return target;
};

interface TabItemProps {
    tab: Tab;
    index: number;
    isTabActive: boolean;
    isActive: boolean;
    isDragging: boolean;
    showDropBefore: boolean;
    showDropAfter: boolean;
    onTabClick: (index: number) => void;
    onCloseClick: (e: React.MouseEvent, index: number) => void;
    onContextMenu: (e: React.MouseEvent, index: number) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent, index: number) => void;
    onDragEnd: () => void;
    onKeyDown: (e: React.KeyboardEvent, index: number) => void;
}

/**
 * TabItem component - Individual tab with drag and drop support
 */
const TabItem = memo(
    ({
        tab,
        index,
        isTabActive,
        isActive,
        isDragging,
        showDropBefore,
        showDropAfter,
        onTabClick,
        onCloseClick,
        onContextMenu,
        onDragStart,
        onDragOver,
        onDragLeave,
        onDrop,
        onDragEnd,
        onKeyDown,
    }: TabItemProps) => {
        // Render tab icon - can be a ReactNode or fallback to Menu icon
        const renderIcon = () => {
            if (tab.icon && typeof tab.icon !== 'string') {
                return tab.icon;
            }
            return <Menu width='1em' height='1em' strokeWidth={1.5} />;
        };

        return (
            <div
                key={`tab-wrapper-${tab.id}`}
                className='relative flex items-center h-full'
            >
                <div
                    role='tab'
                    aria-selected={isTabActive}
                    tabIndex={isTabActive ? 0 : -1}
                    draggable
                    className={`
                    flex items-center gap-2 px-4 h-full min-w-[120px] max-w-[200px]
                    cursor-move group relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                    ${isTabActive
                            ? 'cradle-bg-primary border-l border-r cradle-border cradle-text-secondary border-b border-cradle-bg-primary'
                            : 'cradle-bg-elevated cradle-text-tertiary cradle-border'
                        }
                    ${isDragging ? 'opacity-50' : ''}
                    ${isTabActive && isActive ? 'border-t-2' : 'border-t cradle-border'}
                `}
                    style={
                        isTabActive && isActive
                            ? {
                                borderTopColor: 'var(--cradle-accent-primary)',
                            }
                            : {}
                    }
                    onClick={() => onTabClick(index)}
                    onContextMenu={(e) => onContextMenu(e, index)}
                    onKeyDown={(e) => onKeyDown(e, index)}
                    onDragStart={(e) => onDragStart(e, index)}
                    onDragOver={(e) => onDragOver(e, index)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, index)}
                    onDragEnd={onDragEnd}
                    title={tab.title}
                >
                    <div
                        className='flex-shrink-0'
                        style={{ width: '1em', height: '1em' }}
                    >
                        {renderIcon()}
                    </div>

                    <span className='flex-1 truncate text-sm cradle-mono'>
                        {tab.title}
                    </span>

                    <button
                        aria-label={`Close tab: ${tab.title}`}
                        className={`
                        flex-shrink-0 rounded p-0.5
                        border border-transparent hover:cradle-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                        ${isTabActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                    `}
                        onClick={(e) => onCloseClick(e, index)}
                        title='Close'
                    >
                        <Xmark width='0.9em' height='0.9em' />
                    </button>
                </div>
            </div>
        );
    },
);

TabItem.displayName = 'TabItem';

interface PaneTabsProps {
    paneId: string;
    isActive: boolean;
    onRootRef?: (el: HTMLElement | null) => void;
}

/**
 * PaneTabs component - Tab bar for a single pane
 */
const PaneTabs = ({ paneId, isActive, onRootRef }: PaneTabsProps) => {
    const {
        getPaneTabsState,
        switchToTab,
        closeTab,
        closeOtherTabs,
        closeTabsToRight,
        reorderTabs,
        createNewTab,
        moveTabBetweenPanes,
    } = usePaneTabs();
    const { splitPane, setActivePaneId } = useLayout();
    const paneState = getPaneTabsState(paneId);
    const { tabs, activeTabIndex } = paneState;

    const [contextMenuTab, setContextMenuTab] = useState<number | null>(null);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [draggedTab, setDraggedTab] = useState<number | null>(null);
    const [dragOverTab, setDragOverTab] = useState<DragOverState | null>(null);
    const [isDraggedOver, setIsDraggedOver] = useState(false);
    const contextMenuRef = useRef<HTMLDivElement>(null);
    const tabBarRef = useRef<HTMLDivElement | null>(null);
    const tabbarDragDepthRef = useRef(0);
    const isMountedRef = useRef(true);

    const handleContextMenu = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuTab(index);
        setContextMenuPosition({ x: e.clientX, y: e.clientY });
    };

    const handleCloseContextMenu = () => {
        setContextMenuTab(null);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                contextMenuRef.current &&
                !contextMenuRef.current.contains(e.target as Node)
            ) {
                handleCloseContextMenu();
            }
        };

        if (contextMenuTab !== null) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [contextMenuTab]);

    const handleTabClick = useCallback(
        (index: number) => {
            if (isActive) {
                switchToTab(paneId, index);
            } else {
                switchToTab(paneId, index);
                requestAnimationFrame(() => {
                    if (isMountedRef.current) {
                        setActivePaneId(paneId);
                    }
                });
            }
        },
        [isActive, switchToTab, paneId, setActivePaneId],
    );

    const handleCloseClick = useCallback(
        (e: React.MouseEvent, index: number) => {
            e.stopPropagation();
            closeTab(paneId, index);
        },
        [closeTab, paneId],
    );

    const handleDragStart = useCallback(
        (e: React.DragEvent, index: number) => {
            if (!e.dataTransfer) return;
            setDraggedTab(index);
            e.dataTransfer.effectAllowed = 'move';
            setGlobalDragFlag(true);

            const dragInfo: DragData = {
                paneId: paneId,
                tabIndex: index,
                tabCount: tabs.length,
            };

            setCradleTab(e.dataTransfer, dragInfo);
        },
        [paneId, tabs.length],
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent, index: number) => {
            if (!e.dataTransfer) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            const isSameTab = draggedTab === index;

            if (!isSameTab) {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const midPoint = rect.left + rect.width / 2;
                const dropBefore = e.clientX < midPoint;
                setDragOverTab({ index, dropBefore });
            }
        },
        [draggedTab],
    );

    const handleDragLeave = useCallback(() => {
        setDragOverTab(null);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent, index: number) => {
            if (!e.dataTransfer) return;
            e.preventDefault();
            e.stopPropagation();

            const dragData = getCradleTab(e.dataTransfer);
            if (!dragData) return;

            const { paneId: sourcePaneId, tabIndex: sourceIndex } = dragData;

            if (!sourcePaneId || sourceIndex === undefined || sourceIndex < 0) {
                console.warn('Invalid drag data:', dragData);
                return;
            }

            if (dragOverTab) {
                if (sourcePaneId === paneId) {
                    const targetIndex = computeReorderTarget({
                        sourceIndex,
                        hoverIndex: index,
                        dropBefore: dragOverTab.dropBefore,
                    });
                    if (targetIndex !== sourceIndex) {
                        reorderTabs(paneId, sourceIndex, targetIndex);
                    }
                } else {
                    const targetIndex = dragOverTab.dropBefore ? index : index + 1;
                    moveTabBetweenPanes(sourcePaneId, sourceIndex, paneId, targetIndex);
                    setActivePaneId(paneId);
                }
            }

            setDraggedTab(null);
            setDragOverTab(null);
            clearGlobalDragFlag();
        },
        [dragOverTab, paneId, reorderTabs, moveTabBetweenPanes, setActivePaneId],
    );

    const handleDragEnd = useCallback(() => {
        setDraggedTab(null);
        setDragOverTab(null);
        clearGlobalDragFlag();
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, index: number) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTabClick(index);
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
                e.preventDefault();
                handleCloseClick(e as any, index);
            }
        },
        [handleTabClick, handleCloseClick],
    );

    const handleTabBarDragEnter = (e: React.DragEvent) => {
        if (!isCradleTabDrag(e)) return;
        tabbarDragDepthRef.current += 1;
        setIsDraggedOver(true);
    };

    const handleTabBarDragOver = (e: React.DragEvent) => {
        if (!e.dataTransfer) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleTabBarDragLeave = (e: React.DragEvent) => {
        if (!isCradleTabDrag(e)) return;
        tabbarDragDepthRef.current -= 1;
        if (tabbarDragDepthRef.current <= 0) {
            tabbarDragDepthRef.current = 0;
            setIsDraggedOver(false);
        }
    };

    const handleTabBarDrop = (e: React.DragEvent) => {
        if (!e.dataTransfer) return;
        e.preventDefault();
        e.stopPropagation();

        const dragData = getCradleTab(e.dataTransfer);
        if (!dragData) return;

        const { paneId: sourcePaneId, tabIndex: sourceIndex } = dragData;

        if (sourcePaneId !== paneId) {
            moveTabBetweenPanes(sourcePaneId, sourceIndex, paneId, -1);
            setActivePaneId(paneId);
        }

        setDraggedTab(null);
        setDragOverTab(null);
        clearGlobalDragFlag();
    };

    if (!tabs || tabs.length === 0) {
        return null;
    }

    return (
        <>
            <div
                ref={(el) => {
                    tabBarRef.current = el;
                    if (onRootRef) onRootRef(el);
                }}
                role='tablist'
                className={`flex items-center h-10 cradle-bg-elevated overflow-x-auto overflow-y-hidden cradle-scrollbar-thin relative z-20 ${isActive ? 'cradle-border-b' : 'cradle-border-b border-opacity-50'}`}
                onDragEnter={handleTabBarDragEnter}
                onDragOver={handleTabBarDragOver}
                onDragLeave={handleTabBarDragLeave}
                onDrop={handleTabBarDrop}
            >
                {tabs.map((tab, index) => {
                    const isTabActive = index === activeTabIndex;
                    const isDragging = draggedTab === index;
                    const showDropBefore =
                        dragOverTab?.index === index && dragOverTab?.dropBefore;
                    const showDropAfter =
                        dragOverTab?.index === index && !dragOverTab?.dropBefore;

                    return (
                        <TabItem
                            key={tab.id}
                            tab={tab}
                            index={index}
                            isTabActive={isTabActive}
                            isActive={isActive}
                            isDragging={isDragging}
                            showDropBefore={showDropBefore ?? false}
                            showDropAfter={showDropAfter}
                            onTabClick={handleTabClick}
                            onCloseClick={handleCloseClick}
                            onContextMenu={handleContextMenu}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            onKeyDown={handleKeyDown}
                        />
                    );
                })}

                <button
                    aria-label='Create new tab'
                    className='flex items-center justify-center h-full w-10 flex-shrink-0 cradle-text-tertiary border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                    style={
                        {
                            borderColor: 'var(--cradle-border-primary)',
                            '--hover-border-color': 'var(--cradle-accent-primary)',
                        } as CSSProperties
                    }
                    onMouseEnter={(e) =>
                    ((e.target as HTMLElement).style.borderColor =
                        'var(--cradle-accent-primary)')
                    }
                    onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.borderColor =
                        'var(--cradle-border-primary)')
                    }
                    onClick={() => createNewTab(paneId)}
                    title='New Tab'
                >
                    <Plus width='1.2em' height='1.2em' />
                </button>

                <div className='flex-1'></div>

                {isActive && (
                    <>
                        <button
                            aria-label='Split pane horizontally'
                            className='flex items-center justify-center h-full w-10 flex-shrink-0 cradle-text-tertiary hover:cradle-text-secondary border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                            style={
                                {
                                    borderColor: 'var(--cradle-border-primary)',
                                    '--hover-border-color':
                                        'var(--cradle-accent-primary)',
                                } as CSSProperties
                            }
                            onMouseEnter={(e) =>
                            ((e.target as HTMLElement).style.borderColor =
                                'var(--cradle-accent-primary)')
                            }
                            onMouseLeave={(e) =>
                            ((e.target as HTMLElement).style.borderColor =
                                'var(--cradle-border-primary)')
                            }
                            onClick={() => splitPane(paneId, 'horizontal', 'after')}
                            title='Split Horizontally'
                        >
                            <SplitArea width='1.2em' height='1.2em' />
                        </button>

                        <button
                            aria-label='Split pane vertically'
                            className='flex items-center justify-center h-full w-10 flex-shrink-0 cradle-text-tertiary hover:cradle-text-secondary border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                            style={
                                {
                                    borderColor: 'var(--cradle-border-primary)',
                                    '--hover-border-color':
                                        'var(--cradle-accent-primary)',
                                } as CSSProperties
                            }
                            onMouseEnter={(e) =>
                            ((e.target as HTMLElement).style.borderColor =
                                'var(--cradle-accent-primary)')
                            }
                            onMouseLeave={(e) =>
                            ((e.target as HTMLElement).style.borderColor =
                                'var(--cradle-border-primary)')
                            }
                            onClick={() => splitPane(paneId, 'vertical', 'after')}
                            title='Split Vertically'
                        >
                            <SplitArea
                                width='1.2em'
                                height='1.2em'
                                style={{ transform: 'rotate(90deg)' }}
                            />
                        </button>
                    </>
                )}

                {contextMenuTab !== null && (
                    <div
                        ref={contextMenuRef}
                        role='menu'
                        className='fixed z-50 cradle-bg-elevated cradle-border rounded shadow-lg py-1 min-w-[180px]'
                        style={{
                            left: `${contextMenuPosition.x}px`,
                            top: `${contextMenuPosition.y}px`,
                        }}
                    >
                        <button
                            role='menuitem'
                            className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                            onClick={() => {
                                if (contextMenuTab !== null) {
                                    closeTab(paneId, contextMenuTab);
                                }
                                handleCloseContextMenu();
                            }}
                        >
                            <Xmark width='1em' height='1em' />
                            Close
                        </button>
                        {tabs.length > 1 && (
                            <button
                                role='menuitem'
                                className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                                onClick={() => {
                                    if (contextMenuTab !== null) {
                                        closeOtherTabs(paneId, contextMenuTab);
                                    }
                                    handleCloseContextMenu();
                                }}
                            >
                                <NavArrowDown width='1em' height='1em' />
                                Close Others
                            </button>
                        )}
                        {contextMenuTab !== null &&
                            contextMenuTab! < tabs.length - 1 && (
                                <button
                                    role='menuitem'
                                    className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                                    onClick={() => {
                                        if (contextMenuTab !== null) {
                                            closeTabsToRight(
                                                paneId,
                                                contextMenuTab,
                                            );
                                        }
                                        handleCloseContextMenu();
                                    }}
                                >
                                    <NavArrowDown
                                        width='1em'
                                        height='1em'
                                        style={{ transform: 'rotate(-90deg)' }}
                                    />
                                    Close to the Right
                                </button>
                            )}
                    </div>
                )}
            </div>
        </>
    );
};

interface LayoutPaneProps {
    paneId: string;
    outletContext?: unknown;
}

/**
 * LayoutPane component - A single pane with its own tabs and content
 */
const LayoutPane = ({ paneId, outletContext }: LayoutPaneProps) => {
    const { activePaneId, setActivePaneId, splitPane } = useLayout();
    const {
        getPaneTabsState,
        initializePaneIfNeeded,
        activatePane,
        handleSplitWithTab,
        moveTabBetweenPanes,
    } = usePaneTabs();
    const { attach } = useTabHost();
    const isActive = activePaneId === paneId;
    const mountedTabsRef = useRef(new Set<string>());
    const wasActiveRef = useRef(isActive);
    const paneRef = useRef<HTMLDivElement>(null);
    const isMountedRef = useRef(true);
    const mountRefs = useRef(new Map<string, HTMLElement>());
    const [dropZone, setDropZone] = useState<DropZone>(null);
    const [showOverlay, setShowOverlay] = useState(false);
    const [tabbarH, setTabbarH] = useState(0);
    const [paneSize, setPaneSize] = useState({ w: 0, h: 0 });
    const dragDepthRef = useRef(0);
    const layoutTabBarRef = useRef<HTMLElement | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const lastInsideRef = useRef(false);
    const lastZoneRef = useRef<DropZone>(null);
    const lastPointRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        initializePaneIfNeeded(paneId);
    }, [paneId, initializePaneIfNeeded]);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!layoutTabBarRef.current) return;
        const ro = new ResizeObserver(([e]) => setTabbarH(e.contentRect.height));
        ro.observe(layoutTabBarRef.current);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!paneRef.current) return;
        const ro = new ResizeObserver(([e]) =>
            setPaneSize({ w: e.contentRect.width, h: e.contentRect.height }),
        );
        ro.observe(paneRef.current);
        return () => ro.disconnect();
    }, []);

    // Use native DOM event to activate pane on any interaction
    // This is needed because portal content is DOM-reparented and React events don't bubble correctly
    useEffect(() => {
        const paneEl = paneRef.current;
        if (!paneEl) return;

        const handleInteraction = () => {
            if (!isActive) {
                setActivePaneId(paneId);
            }
        };

        // Use capture phase to ensure we catch events before any handlers can stop propagation
        paneEl.addEventListener('mousedown', handleInteraction, true);
        paneEl.addEventListener('focusin', handleInteraction, true);

        return () => {
            paneEl.removeEventListener('mousedown', handleInteraction, true);
            paneEl.removeEventListener('focusin', handleInteraction, true);
        };
    }, [isActive, paneId, setActivePaneId]);

    const paneState = getPaneTabsState(paneId);
    const { tabs, activeTabIndex } = paneState;

    useEffect(() => {
        const becameActive = isActive && !wasActiveRef.current;
        wasActiveRef.current = isActive;

        if (becameActive) {
            activatePane(paneId);
        }
    }, [isActive, activatePane, paneId]);

    useEffect(() => {
        if (tabs) {
            tabs.forEach((tab) => {
                mountedTabsRef.current.add(tab.path);
            });

            const currentPaths = new Set(tabs.map((t) => t.path));
            mountedTabsRef.current.forEach((path) => {
                if (!currentPaths.has(path)) {
                    mountedTabsRef.current.delete(path);
                }
            });
        }

        return () => {
            mountedTabsRef.current.clear();
        };
    }, [tabs]);

    useEffect(() => {
        const onGlobalDragOver = (ev: DragEvent) => {
            if (!window.__cradleTabDragging || !paneRef.current) return;
            const r = paneRef.current.getBoundingClientRect();
            const { clientX: x, clientY: y } = ev;
            const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

            if (rafIdRef.current == null) {
                rafIdRef.current = requestAnimationFrame(() => {
                    rafIdRef.current = null;
                    if (inside !== lastInsideRef.current) {
                        lastInsideRef.current = inside;
                        setShowOverlay(inside);
                        if (!inside) setDropZone(null);
                    }
                    if (inside) {
                        const dragData = getCradleTab(ev.dataTransfer);
                        const isSingleTabSamePane =
                            dragData &&
                            dragData.paneId === paneId &&
                            dragData.tabCount <= 1;

                        if (isSingleTabSamePane) {
                            setDropZone(null);
                            return;
                        }

                        let zone = calculateDropZone(ev);
                        zone = pickZoneSticky(zone, ev);
                        setDropZone((prev) => (prev !== zone ? zone : prev));
                    }
                });
            }
        };
        const onGlobalDragEnd = () => {
            lastInsideRef.current = false;
            setShowOverlay(false);
            setDropZone(null);
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
        document.addEventListener('dragover', onGlobalDragOver);
        document.addEventListener('drop', onGlobalDragEnd);
        document.addEventListener('dragend', onGlobalDragEnd);
        return () => {
            document.removeEventListener('dragover', onGlobalDragOver);
            document.removeEventListener('drop', onGlobalDragEnd);
            document.removeEventListener('dragend', onGlobalDragEnd);
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [paneId]);

    const handlePaneClick = () => {
        if (!isActive) {
            setActivePaneId(paneId);
        }
    };

    const calculateDropZone = (e: DragEvent | React.DragEvent): DropZone => {
        if (!paneRef.current) return null;

        const paneRect = paneRef.current.getBoundingClientRect();
        const x = e.clientX - paneRect.left;
        const y = e.clientY - paneRect.top;
        const w = paneSize.w || paneRect.width;
        const h = paneSize.h || paneRect.height;

        const currentTabbarH =
            tabbarH || layoutTabBarRef.current?.getBoundingClientRect().height || 0;

        if (layoutTabBarRef.current) {
            const t = layoutTabBarRef.current.getBoundingClientRect();

            if (
                e.clientX >= t.left &&
                e.clientX <= t.right &&
                e.clientY >= t.top &&
                e.clientY <= t.bottom
            ) {
                const distFromBottom = t.bottom - e.clientY;
                if (distFromBottom <= getTabbarTopOverride(layoutTabBarRef.current)) {
                    return 'top';
                }
                return 'tabbar';
            }
        }

        if (y >= currentTabbarH) {
            const dLeft = x;
            const dRight = w - x;
            const dTop = y - currentTabbarH;
            const dBottom = h - y;

            const minDist = Math.min(dLeft, dRight, dTop, dBottom);
            if (minDist === dLeft) return 'left';
            if (minDist === dRight) return 'right';
            if (minDist === dTop) return 'top';
            if (minDist === dBottom) return 'bottom';
        }

        return null;
    };

    const pickZoneSticky = (
        zone: DropZone,
        e: DragEvent | React.DragEvent,
    ): DropZone => {
        if (!lastZoneRef.current || !lastPointRef.current) {
            lastZoneRef.current = zone;
            lastPointRef.current = { x: e.clientX, y: e.clientY };
            return zone;
        }
        const dx = e.clientX - lastPointRef.current.x;
        const dy = e.clientY - lastPointRef.current.y;
        const dist2 = dx * dx + dy * dy;
        const sticky = getStickyPx(layoutTabBarRef.current);
        if (dist2 <= sticky * sticky) {
            return lastZoneRef.current ?? zone;
        }
        lastZoneRef.current = zone;
        lastPointRef.current = { x: e.clientX, y: e.clientY };
        return zone;
    };

    const handlePaneDragEnterCapture = (e: React.DragEvent) => {
        if (!isCradleTabDrag(e)) return;
        dragDepthRef.current += 1;
        setShowOverlay(true);
    };

    const handlePaneDragLeaveCapture = (e: React.DragEvent) => {
        if (!isCradleTabDrag(e)) return;
        dragDepthRef.current -= 1;
        if (dragDepthRef.current <= 0) {
            dragDepthRef.current = 0;
            setDropZone(null);
            setShowOverlay(false);
        }
    };

    const handlePaneDragOverCapture = (e: React.DragEvent) => {
        if (!isCradleTabDrag(e)) return;

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const meta = getCradleTab(e.dataTransfer);

        if (meta && meta.paneId === paneId && meta.tabCount <= 1) {
            setDropZone(null);
            return;
        }

        let zone = calculateDropZone(e);
        zone = pickZoneSticky(zone, e);
        if (zone !== dropZone) setDropZone(zone);
    };

    const handlePaneDrop = (e: React.DragEvent) => {
        if (!e.dataTransfer) return;
        e.preventDefault();
        e.stopPropagation();

        const dragData = getCradleTab(e.dataTransfer);
        if (!dragData) {
            setDropZone(null);
            setShowOverlay(false);
            return;
        }

        const liveZone = calculateDropZone(e);

        if (
            !dragData ||
            typeof dragData.paneId !== 'string' ||
            typeof dragData.tabIndex !== 'number'
        ) {
            console.warn('Invalid drag data structure:', dragData);
            setDropZone(null);
            setShowOverlay(false);
            return;
        }

        const { paneId: sourcePaneId, tabIndex: sourceIndex, tabCount } = dragData;

        if (!sourcePaneId || sourceIndex < 0 || sourceIndex >= tabCount) {
            console.warn('Invalid drag data values:', dragData);
            setDropZone(null);
            setShowOverlay(false);
            return;
        }

        if (sourcePaneId === paneId && tabCount <= 1) {
            setDropZone(null);
            setShowOverlay(false);
            clearGlobalDragFlag();
            return;
        }

        if (liveZone === 'tabbar') {
            if (sourcePaneId !== paneId) {
                moveTabBetweenPanes(sourcePaneId, sourceIndex, paneId, -1);
                setActivePaneId(paneId);
            }
            setDropZone(null);
            setShowOverlay(false);
            clearGlobalDragFlag();
            return;
        }

        if (!liveZone) {
            setDropZone(null);
            setShowOverlay(false);
            return;
        }

        const direction =
            liveZone === 'top' || liveZone === 'bottom' ? 'horizontal' : 'vertical';
        const position = liveZone === 'top' || liveZone === 'left' ? 'before' : 'after';
        const { originalPaneId, newPaneId } = splitPane(paneId, direction, position);

        setDropZone(null);
        setShowOverlay(false);

        if (newPaneId) {
            handleSplitWithTab(
                paneId,
                originalPaneId,
                newPaneId,
                sourcePaneId,
                sourceIndex,
            );

            requestAnimationFrame(() => {
                if (isMountedRef.current) {
                    setActivePaneId(newPaneId);
                }
            });
        }
    };

    return (
        <div
            ref={paneRef}
            className='flex flex-col h-full w-full relative'
            onClick={handlePaneClick}
            onMouseDown={handlePaneClick}
            onDragEnterCapture={handlePaneDragEnterCapture}
            onDragOverCapture={handlePaneDragOverCapture}
            onDragLeaveCapture={handlePaneDragLeaveCapture}
            onDrop={handlePaneDrop}
        >
            {showOverlay && (
                <div
                    className='absolute'
                    style={{
                        top: tabbarH,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 900,
                        pointerEvents: 'auto',
                    }}
                    onDragEnter={handlePaneDragEnterCapture}
                    onDragOver={handlePaneDragOverCapture}
                    onDragLeave={handlePaneDragLeaveCapture}
                    onDrop={(e) => {
                        handlePaneDrop(e);
                        clearGlobalDragFlag();
                        setShowOverlay(false);
                    }}
                />
            )}

            {dropZone === 'top' && (
                <div
                    className='absolute left-0 right-0 pointer-events-none'
                    style={{
                        top: tabbarH,
                        height: (paneSize.h - tabbarH) * 0.5,
                        background: 'var(--cradle-glow-primary)',
                        zIndex: 1000,
                    }}
                />
            )}

            {dropZone === 'bottom' && (
                <div
                    className='absolute left-0 right-0 pointer-events-none'
                    style={{
                        bottom: 0,
                        height: paneSize.h * 0.5,
                        background: 'var(--cradle-glow-primary)',
                        zIndex: 1000,
                    }}
                />
            )}

            {dropZone === 'left' && (
                <div
                    className='absolute pointer-events-none'
                    style={{
                        top: tabbarH,
                        bottom: 0,
                        left: 0,
                        width: paneSize.w * 0.5,
                        background: 'var(--cradle-glow-primary)',
                        zIndex: 1000,
                    }}
                />
            )}

            {dropZone === 'right' && (
                <div
                    className='absolute pointer-events-none'
                    style={{
                        top: tabbarH,
                        bottom: 0,
                        right: 0,
                        width: paneSize.w * 0.5,
                        background: 'var(--cradle-glow-primary)',
                        zIndex: 1000,
                    }}
                />
            )}

            <PaneTabs
                paneId={paneId}
                isActive={isActive}
                onRootRef={(el) => (layoutTabBarRef.current = el)}
            />
            <div className='flex-1 overflow-y-auto overflow-x-hidden cradle-scrollbar relative'>
                {tabs &&
                    tabs.map((tab, index) => {
                        const isTabActive = index === activeTabIndex;

                        return (
                            <div
                                key={`mount-${tab.id}`}
                                ref={(el) => {
                                    if (el) {
                                        mountRefs.current.set(tab.id, el);
                                        requestAnimationFrame(() => {
                                            if (isMountedRef.current) {
                                                attach(tab.id, el);
                                            }
                                        });
                                    }
                                }}
                                className='absolute inset-0'
                                style={{
                                    opacity: isTabActive ? 1 : 0,
                                    pointerEvents: isTabActive ? 'auto' : 'none',
                                    zIndex: isTabActive ? 1 : 0,
                                }}
                            />
                        );
                    })}
            </div>
        </div>
    );
};

export default LayoutPane;
