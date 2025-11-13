import * as Iconoir from 'iconoir-react';
import { NavArrowDown, Plus, SplitArea, Xmark } from 'iconoir-react';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useLayout } from '@/contexts/LayoutContext/LayoutContext';
import { usePaneTabs } from '@/contexts/PaneTabsContext/PaneTabsContext';
import { useTabHost } from '@/contexts/TabHostContext/TabHostContext';

const getTabbarTopOverride = (tabbarEl) => {
    const h = tabbarEl?.getBoundingClientRect().height || 0;
    // Use ~40% of tabbar height, clamped to sensible bounds
    return Math.max(8, Math.min(32, Math.round(h * 0.4)));
};

const getStickyPx = (tabbarEl) => {
    const base = tabbarEl?.getBoundingClientRect().height || 40;
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    return Math.max(8, Math.min(40, Math.round((base * 0.6) / dpr)));
};

// DND constants and helpers
const DND_MIME = 'application/x-cradle-tab';

const setCradleTab = (dt, payload) => dt.setData(DND_MIME, JSON.stringify(payload));
const getCradleTab = (dt) => {
    try { return JSON.parse(dt.getData(DND_MIME)); } catch { return null; }
};
const hasCradleTab = (dt) => {
    const t = dt?.types || [];
    return (typeof t.contains === 'function' ? t.contains(DND_MIME) : Array.from(t).includes(DND_MIME)) || !!dt?.getData(DND_MIME);
};

// Global drag flag helpers
const setGlobalDragFlag = (value) => {
    try { window.__cradleTabDragging = value; } catch { }
};
const clearGlobalDragFlag = () => {
    try { window.__cradleTabDragging = false; } catch { }
};

/**
 * Robust helper to detect if we're dragging a Cradle tab
 * Handles various browser quirks with dataTransfer.types
 */
function isCradleTabDrag(e) {
    if (typeof window !== 'undefined' && window.__cradleTabDragging) return true;
    const dt = e.dataTransfer;
    if (!dt) return false;
    return hasCradleTab(dt);
}

/**
 * Helper to compute reorder target index with consistent logic
 */
const computeReorderTarget = ({ sourceIndex, hoverIndex, dropBefore }) => {
    let target = dropBefore ? hoverIndex : hoverIndex + 1;
    if (sourceIndex < hoverIndex && target > sourceIndex) target -= 1;
    if (sourceIndex > hoverIndex && target <= sourceIndex) target += 0; // no change
    return target;
};



/**
 * Tab component - Individual tab with drag and drop support
 */
const Tab = memo(({
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
    onKeyDown
}) => {
    const getIconComponent = useCallback((iconName) => {
        const IconComponent = Iconoir[iconName];
        const iconProps = { width: '1em', height: '1em', strokeWidth: 1.5 };
        return IconComponent ? <IconComponent {...iconProps} /> : <Iconoir.Page {...iconProps} />;
    }, []);

    return (
        <div key={`tab-wrapper-${tab.id}`} className='relative flex items-center h-full'>
            <div
                role="tab"
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
                style={isTabActive && isActive ? {
                    borderTopColor: 'var(--cradle-accent-primary)'
                } : {}}
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
                <div className='flex-shrink-0' style={{ width: '1em', height: '1em' }}>
                    {getIconComponent(tab.icon)}
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
});

Tab.displayName = 'Tab';

/**
 * PaneTabs component - Tab bar for a single pane
 */
const PaneTabs = ({ paneId, isActive, onRootRef }) => {
    const { getPaneTabsState, switchToTab, closeTab, closeOtherTabs, closeTabsToRight, reorderTabs, createNewTab, moveTabBetweenPanes } = usePaneTabs();
    const { splitPane, setActivePaneId } = useLayout();
    const paneState = getPaneTabsState(paneId);
    const { tabs, activeTabIndex } = paneState;

    const [contextMenuTab, setContextMenuTab] = useState(null);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [draggedTab, setDraggedTab] = useState(null);
    const [dragOverTab, setDragOverTab] = useState(null);
    const [isDraggedOver, setIsDraggedOver] = useState(false);
    const contextMenuRef = useRef(null);
    const tabBarRef = useRef(null);
    const tabbarDragDepthRef = useRef(0);

    const handleContextMenu = (e, index) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenuTab(index);
        setContextMenuPosition({ x: e.clientX, y: e.clientY });
    };

    const handleCloseContextMenu = () => {
        setContextMenuTab(null);
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
                handleCloseContextMenu();
            }
        };

        if (contextMenuTab !== null) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }

        // Always return cleanup function
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [contextMenuTab]);

    const handleTabClick = useCallback((index) => {
        if (isActive) {
            // Pane is already active - just switch tabs (switchToTab will navigate)
            switchToTab(paneId, index);
        } else {
            // Pane is not active - we need to:
            // 1. Update the active tab index
            // 2. Activate the pane
            // 3. Navigate to the tab

            // Update tab index first
            switchToTab(paneId, index);

            // Then activate pane (with a small delay to ensure state is updated)
            requestAnimationFrame(() => {
                if (isMountedRef.current) {
                    setActivePaneId(paneId);
                }
            });
        }
    }, [isActive, switchToTab, paneId, setActivePaneId]);

    const handleCloseClick = useCallback((e, index) => {
        e.stopPropagation();
        closeTab(paneId, index);
    }, [closeTab, paneId]);

    const handleDragStart = useCallback((e, index) => {
        if (!e.dataTransfer) return;
        setDraggedTab(index);
        e.dataTransfer.effectAllowed = 'move';
        setGlobalDragFlag(true);

        const dragInfo = {
            paneId: paneId,
            tabIndex: index,
            tabCount: tabs.length,
        };

        setCradleTab(e.dataTransfer, dragInfo);
    }, [paneId, tabs.length]);

    const handleDragOver = useCallback((e, index) => {
        if (!e.dataTransfer) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // Check if we have local drag or need to handle cross-pane
        const isSameTab = draggedTab === index;

        if (!isSameTab) {
            const rect = e.currentTarget.getBoundingClientRect();
            const midPoint = rect.left + rect.width / 2;
            const dropBefore = e.clientX < midPoint;
            setDragOverTab({ index, dropBefore });
        }
    }, [draggedTab]);

    const handleDragLeave = useCallback(() => {
        setDragOverTab(null);
    }, []);

    const handleDrop = useCallback((e, index) => {
        if (!e.dataTransfer) return;
        e.preventDefault();
        e.stopPropagation();

        const dragData = getCradleTab(e.dataTransfer);
        if (!dragData) return;

        const { paneId: sourcePaneId, tabIndex: sourceIndex } = dragData;

        // Validate drag data
        if (!sourcePaneId || sourceIndex === undefined || sourceIndex < 0) {
            console.warn('Invalid drag data:', dragData);
            return;
        }

        if (dragOverTab) {
            if (sourcePaneId === paneId) {
                // Same pane - reorder
                const targetIndex = computeReorderTarget({
                    sourceIndex,
                    hoverIndex: index,
                    dropBefore: dragOverTab.dropBefore,
                });
                if (targetIndex !== sourceIndex) {
                    reorderTabs(paneId, sourceIndex, targetIndex);
                }
            } else {
                // Different pane - move between panes
                const targetIndex = dragOverTab.dropBefore ? index : index + 1;
                moveTabBetweenPanes(sourcePaneId, sourceIndex, paneId, targetIndex);
                setActivePaneId(paneId);
            }
        }

        setDraggedTab(null);
        setDragOverTab(null);
        clearGlobalDragFlag();
    }, [dragOverTab, paneId, reorderTabs, moveTabBetweenPanes, setActivePaneId]);

    const handleDragEnd = useCallback(() => {
        setDraggedTab(null);
        setDragOverTab(null);
        clearGlobalDragFlag();
    }, []);

    const handleKeyDown = useCallback((e, index) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTabClick(index);
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
            e.preventDefault();
            handleCloseClick(e, index);
        }
    }, [handleTabClick, handleCloseClick]);

    /**
     * Handles drag enter on tab bar
     */
    const handleTabBarDragEnter = (e) => {
        if (!isCradleTabDrag(e)) return;
        tabbarDragDepthRef.current += 1;
        setIsDraggedOver(true);
    };

    /**
     * Handles drag over the tab bar (for dropping at the end)
     */
    const handleTabBarDragOver = (e) => {
        if (!e.dataTransfer) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    /**
     * Handles drag leave from tab bar
     */
    const handleTabBarDragLeave = (e) => {
        if (!isCradleTabDrag(e)) return;
        tabbarDragDepthRef.current -= 1;
        if (tabbarDragDepthRef.current <= 0) {
            tabbarDragDepthRef.current = 0;
            setIsDraggedOver(false);
        }
    };

    /**
     * Handles drop on the tab bar (at the end)
     */
    const handleTabBarDrop = (e) => {
        if (!e.dataTransfer) return;
        e.preventDefault();
        e.stopPropagation();

        const dragData = getCradleTab(e.dataTransfer);
        if (!dragData) return;

        const { paneId: sourcePaneId, tabIndex: sourceIndex } = dragData;

        if (sourcePaneId !== paneId) {
            // Move to end of this pane
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
        <div
            ref={(el) => {
                tabBarRef.current = el;
                if (onRootRef) onRootRef(el);
            }}
            role="tablist"
            className={`flex items-center h-10 cradle-bg-elevated overflow-x-auto overflow-y-hidden cradle-scrollbar-thin relative z-20 ${isActive ? 'cradle-border-b' : 'cradle-border-b border-opacity-50'}`}
            onDragEnter={handleTabBarDragEnter}
            onDragOver={handleTabBarDragOver}
            onDragLeave={handleTabBarDragLeave}
            onDrop={handleTabBarDrop}
        >
            {tabs.map((tab, index) => {
                const isTabActive = index === activeTabIndex;
                const isDragging = draggedTab === index;
                const showDropBefore = dragOverTab?.index === index && dragOverTab?.dropBefore;
                const showDropAfter = dragOverTab?.index === index && !dragOverTab?.dropBefore;

                return (
                    <Tab
                        key={tab.id}
                        tab={tab}
                        index={index}
                        isTabActive={isTabActive}
                        isActive={isActive}
                        isDragging={isDragging}
                        showDropBefore={showDropBefore}
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
                aria-label="Create new tab"
                className='flex items-center justify-center h-full w-10 flex-shrink-0 cradle-text-tertiary border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                style={{
                    borderColor: 'var(--cradle-border-primary)',
                    '--hover-border-color': 'var(--cradle-accent-primary)'
                }}
                onMouseEnter={(e) => e.target.style.borderColor = 'var(--cradle-accent-primary)'}
                onMouseLeave={(e) => e.target.style.borderColor = 'var(--cradle-border-primary)'}
                onClick={() => createNewTab(paneId)}
                title='New Tab'
            >
                <Plus width='1.2em' height='1.2em' />
            </button>

            <div className='flex-1'></div>

            {isActive && (
                <>
                    <button
                        aria-label="Split pane horizontally"
                        className='flex items-center justify-center h-full w-10 flex-shrink-0 cradle-text-tertiary hover:cradle-text-secondary border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                        style={{
                            borderColor: 'var(--cradle-border-primary)',
                            '--hover-border-color': 'var(--cradle-accent-primary)'
                        }}
                        onMouseEnter={(e) => e.target.style.borderColor = 'var(--cradle-accent-primary)'}
                        onMouseLeave={(e) => e.target.style.borderColor = 'var(--cradle-border-primary)'}
                        onClick={() => splitPane(paneId, 'vertical', 'after')}
                        title='Split Horizontally'
                    >
                        <SplitArea width='1.2em' height='1.2em' style={{ transform: 'rotate(90deg)' }} />
                    </button>

                    <button
                        aria-label="Split pane vertically"
                        className='flex items-center justify-center h-full w-10 flex-shrink-0 cradle-text-tertiary hover:cradle-text-secondary border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                        style={{
                            borderColor: 'var(--cradle-border-primary)',
                            '--hover-border-color': 'var(--cradle-accent-primary)'
                        }}
                        onMouseEnter={(e) => e.target.style.borderColor = 'var(--cradle-accent-primary)'}
                        onMouseLeave={(e) => e.target.style.borderColor = 'var(--cradle-border-primary)'}
                        onClick={() => splitPane(paneId, 'horizontal', 'after')}
                        title='Split Vertically'
                    >
                        <SplitArea width='1.2em' height='1.2em' />
                    </button>
                </>
            )}

            {/* Context Menu */}
            {contextMenuTab !== null && (
                <div
                    ref={contextMenuRef}
                    role="menu"
                    className='fixed z-50 cradle-bg-elevated cradle-border rounded shadow-lg py-1 min-w-[180px]'
                    style={{
                        left: `${contextMenuPosition.x}px`,
                        top: `${contextMenuPosition.y}px`,
                    }}
                >
                    <button
                        role="menuitem"
                        className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                        onClick={() => {
                            closeTab(paneId, contextMenuTab);
                            handleCloseContextMenu();
                        }}
                    >
                        <Xmark width='1em' height='1em' />
                        Close
                    </button>
                    {tabs.length > 1 && (
                        <button
                            role="menuitem"
                            className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                            onClick={() => {
                                closeOtherTabs(paneId, contextMenuTab);
                                handleCloseContextMenu();
                            }}
                        >
                            <NavArrowDown width='1em' height='1em' />
                            Close Others
                        </button>
                    )}
                    {contextMenuTab < tabs.length - 1 && (
                        <button
                            role="menuitem"
                            className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                            onClick={() => {
                                closeTabsToRight(paneId, contextMenuTab);
                                handleCloseContextMenu();
                            }}
                        >
                            <NavArrowDown width='1em' height='1em' style={{ transform: 'rotate(-90deg)' }} />
                            Close to the Right
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * LayoutPane component - A single pane with its own tabs and content
 */
const LayoutPane = ({ paneId, outletContext }) => {
    const { activePaneId, setActivePaneId, splitPane } = useLayout();
    const { getPaneTabsState, initializePaneIfNeeded, activatePane, handleSplitWithTab, moveTabBetweenPanes } = usePaneTabs();
    const { attach } = useTabHost();
    const isActive = activePaneId === paneId;
    const mountedTabsRef = useRef(new Set());
    const wasActiveRef = useRef(isActive);
    const paneRef = useRef(null);
    const isMountedRef = useRef(true);
    const mountRefs = useRef(new Map());
    const [dropZone, setDropZone] = useState(null); // 'top', 'bottom', 'left', 'right', 'tabbar', or null
    const [showOverlay, setShowOverlay] = useState(false);
    const [tabbarH, setTabbarH] = useState(0);
    const [paneSize, setPaneSize] = useState({ w: 0, h: 0 });
    const dragDepthRef = useRef(0);
    const layoutTabBarRef = useRef(null);
    const rafIdRef = useRef(null);
    const lastInsideRef = useRef(false);
    const lastZoneRef = useRef(null);
    const lastPointRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        initializePaneIfNeeded(paneId);
    }, [paneId, initializePaneIfNeeded]);

    // Set mounted ref on mount and cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // ResizeObserver for tabbar height
    useEffect(() => {
        if (!layoutTabBarRef.current) return;
        const ro = new ResizeObserver(([e]) => setTabbarH(e.contentRect.height));
        ro.observe(layoutTabBarRef.current);
        return () => ro.disconnect();
    }, []);

    // ResizeObserver for pane size
    useEffect(() => {
        if (!paneRef.current) return;
        const ro = new ResizeObserver(([e]) => setPaneSize({ w: e.contentRect.width, h: e.contentRect.height }));
        ro.observe(paneRef.current);
        return () => ro.disconnect();
    }, []);

    const paneState = getPaneTabsState(paneId);
    const { tabs, activeTabIndex } = paneState;

    // When this pane becomes active, navigate to its active tab
    useEffect(() => {
        const becameActive = isActive && !wasActiveRef.current;
        wasActiveRef.current = isActive;

        if (becameActive) {
            // Pane just became active - navigate to its active tab
            activatePane(paneId);
        }
    }, [isActive, activatePane, paneId]);

    useEffect(() => {
        if (tabs) {
            tabs.forEach(tab => {
                mountedTabsRef.current.add(tab.path);
            });

            const currentPaths = new Set(tabs.map(t => t.path));
            mountedTabsRef.current.forEach(path => {
                if (!currentPaths.has(path)) {
                    mountedTabsRef.current.delete(path);
                }
            });
        }

        // Cleanup on unmount
        return () => {
            mountedTabsRef.current.clear();
        };
    }, [tabs]);

    // Proactive overlay with document-level sentinel and rAF throttling
    useEffect(() => {
        const onGlobalDragOver = (ev) => {
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
                        // Check if we're dragging a single tab from the same pane
                        const dragData = getCradleTab(ev.dataTransfer);
                        const isSingleTabSamePane = dragData &&
                            dragData.paneId === paneId &&
                            dragData.tabCount <= 1;

                        if (isSingleTabSamePane) {
                            // Don't show drop zones for single tab in same pane
                            // (can't reorder, can't split, tabbar drop would be no-op)
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
            if (rafIdRef.current) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
        };
        document.addEventListener('dragover', onGlobalDragOver, { passive: false });
        document.addEventListener('drop', onGlobalDragEnd, { passive: false });
        document.addEventListener('dragend', onGlobalDragEnd, { passive: true });
        return () => {
            document.removeEventListener('dragover', onGlobalDragOver);
            document.removeEventListener('drop', onGlobalDragEnd);
            document.removeEventListener('dragend', onGlobalDragEnd);
            if (rafIdRef.current) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
        };
    }, []);

    const handlePaneClick = (e) => {
        if (!isActive) {
            // Activate this pane (the effect will handle navigation)
            setActivePaneId(paneId);
        }
    };

    /**
     * Calculates drop zone based on cursor position using beefed-up area zones
     */
    const calculateDropZone = (e) => {
        if (!paneRef.current) return null;

        const paneRect = paneRef.current.getBoundingClientRect();
        const x = e.clientX - paneRect.left;
        const y = e.clientY - paneRect.top;
        const w = paneSize.w || paneRect.width;
        const h = paneSize.h || paneRect.height;

        // --- Sizing: exactly half of pane per axis ---
        const currentTabbarH = tabbarH || (layoutTabBarRef.current?.getBoundingClientRect().height || 0);

        const wStrip = w * 0.5;
        const hTopContentStrip = (h - currentTabbarH) * 0.5;
        const hBottomStrip = h * 0.5;

        const yContent = Math.max(0, y - currentTabbarH); // y inside content area

        // --- Priority: TAB BAR vs TOP override ---
        if (layoutTabBarRef.current) {
            const t = layoutTabBarRef.current.getBoundingClientRect();

            // if we're over the tabbar at all...
            if (e.clientX >= t.left && e.clientX <= t.right && e.clientY >= t.top && e.clientY <= t.bottom) {
                // ...but within a small band at the *bottom* of it, treat as TOP split (so "responds on tabs")
                const distFromBottom = t.bottom - e.clientY;
                if (distFromBottom <= getTabbarTopOverride(layoutTabBarRef.current)) {
                    return 'top';
                }
                // otherwise, it's a normal tabbar drop target
                return 'tabbar';
            }
        }

        // --- Nearest-edge logic (uses 50% strips only as visuals) ---
        // If we're in the content area, select the closest pane edge
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

    /**
     * Sticky zone picker that prevents flicker on small cursor movements
     */
    const pickZoneSticky = (zone, e) => {
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
            // keep previous zone if still meaningful
            return lastZoneRef.current ?? zone;
        }
        lastZoneRef.current = zone;
        lastPointRef.current = { x: e.clientX, y: e.clientY };
        return zone;
    };

    /**
     * Handles drag enter on pane (capture phase)
     */
    const handlePaneDragEnterCapture = (e) => {
        if (!isCradleTabDrag(e)) return;
        dragDepthRef.current += 1;
        setShowOverlay(true);
    };

    /**
     * Handles drag leave from pane (capture phase)
     */
    const handlePaneDragLeaveCapture = (e) => {
        if (!isCradleTabDrag(e)) return;
        dragDepthRef.current -= 1;
        if (dragDepthRef.current <= 0) {
            dragDepthRef.current = 0;
            setDropZone(null);
            setShowOverlay(false);
        }
    };

    /**
     * Handles drag over the pane content area (capture phase)
     */
    const handlePaneDragOverCapture = (e) => {
        if (!isCradleTabDrag(e)) return;

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // Get drag data from dataTransfer instead of global
        const meta = getCradleTab(e.dataTransfer);

        if (meta && meta.paneId === paneId && meta.tabCount <= 1) {
            setDropZone(null);
            return;
        }

        let zone = calculateDropZone(e);
        zone = pickZoneSticky(zone, e);
        if (zone !== dropZone) setDropZone(zone);
    };

    /**
     * Handles drop on the pane (for split creation)
     */
    const handlePaneDrop = (e) => {
        if (!e.dataTransfer) return;
        e.preventDefault();
        e.stopPropagation();

        const dragData = getCradleTab(e.dataTransfer);
        if (!dragData) {
            setDropZone(null);
            setShowOverlay(false);
            return;
        }

        // Recompute drop zone synchronously to avoid stale state
        const liveZone = calculateDropZone(e);

        if (!dragData || typeof dragData.paneId !== 'string' || typeof dragData.tabIndex !== 'number') {
            console.warn('Invalid drag data structure:', dragData);
            setDropZone(null);
            setShowOverlay(false);
            return;
        }

        const { paneId: sourcePaneId, tabIndex: sourceIndex, tabCount } = dragData;

        // Validate source pane exists and tab index is valid
        if (!sourcePaneId || sourceIndex < 0 || sourceIndex >= tabCount) {
            console.warn('Invalid drag data values:', dragData);
            setDropZone(null);
            setShowOverlay(false);
            return;
        }

        // same-pane single-tab guard — prevent all drop operations (tabbar, splits, reorders)
        // Can't move single tab within same pane (would be no-op for tabbar, invalid for splits)
        if (sourcePaneId === paneId && tabCount <= 1) {
            setDropZone(null);
            setShowOverlay(false);
            clearGlobalDragFlag();
            return;
        }

        // --- TAB BAR DROP: move tab into this pane's tab bar (end) ---
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

        // --- EDGE DROP: split ---
        const direction = (liveZone === 'top' || liveZone === 'bottom') ? 'horizontal' : 'vertical';
        const position = (liveZone === 'top' || liveZone === 'left') ? 'before' : 'after';
        const { originalPaneId, newPaneId } = splitPane(paneId, direction, position);

        setDropZone(null);
        setShowOverlay(false);

        // Call handleSplitWithTab IMMEDIATELY before component unmounts
        // (splitting causes this component to unmount)
        handleSplitWithTab(paneId, originalPaneId, newPaneId, sourcePaneId, sourceIndex);

        // Activate the new pane after state settles
        requestAnimationFrame(() => {
            if (isMountedRef.current) {
                setActivePaneId(newPaneId);
            }
        });
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
            {/* Drag overlay that actually captures events over iframes/canvases */}
            {showOverlay && (
                <div
                    className="absolute"
                    style={{ top: tabbarH, left: 0, right: 0, bottom: 0, zIndex: 900, pointerEvents: 'auto' }}
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

            {/* Drop zone indicators — BIG AREAS */}
            {dropZone === 'top' && (
                <div className='absolute left-0 right-0 pointer-events-none'
                    style={{
                        top: tabbarH,
                        height: (paneSize.h - tabbarH) * 0.5,
                        background: 'var(--cradle-glow-primary)',
                        zIndex: 1000
                    }}
                />
            )}

            {dropZone === 'bottom' && (
                <div className='absolute left-0 right-0 pointer-events-none'
                    style={{
                        bottom: 0,
                        height: paneSize.h * 0.5,
                        background: 'var(--cradle-glow-primary)',
                        zIndex: 1000
                    }}
                />
            )}

            {dropZone === 'left' && (
                <div className='absolute pointer-events-none'
                    style={{
                        top: tabbarH,
                        bottom: 0,
                        left: 0,
                        width: paneSize.w * 0.5,
                        background: 'var(--cradle-glow-primary)',
                        zIndex: 1000
                    }}
                />
            )}

            {dropZone === 'right' && (
                <div className='absolute pointer-events-none'
                    style={{
                        top: tabbarH,
                        bottom: 0,
                        right: 0,
                        width: paneSize.w * 0.5,
                        background: 'var(--cradle-glow-primary)',
                        zIndex: 1000
                    }}
                />
            )}

            <PaneTabs paneId={paneId} isActive={isActive} onRootRef={(el) => (layoutTabBarRef.current = el)} />
            <div className='flex-1 overflow-y-auto overflow-x-hidden cradle-scrollbar relative'>
                {tabs && tabs.map((tab, index) => {
                    const isTabActive = index === activeTabIndex;

                    return (
                        <div
                            key={`mount-${tab.id}`}
                            ref={(el) => {
                                if (el) {
                                    mountRefs.current.set(tab.id, el);
                                    // Only log when this specific tab is first attached to this pane
                                    const attachmentKey = `${tab.id}-${paneId}`;
                                    if (!LayoutPane.attachedTabs) {
                                        LayoutPane.attachedTabs = new Set();
                                    }
                                    if (!LayoutPane.attachedTabs.has(attachmentKey)) {
                                        console.log('[LayoutPane] First attachment of tab:', tab.id, 'to pane:', paneId);
                                        LayoutPane.attachedTabs.add(attachmentKey);
                                    }
                                    // Use requestAnimationFrame to ensure styles are applied
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
                                zIndex: isTabActive ? 1 : 0
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default LayoutPane;

