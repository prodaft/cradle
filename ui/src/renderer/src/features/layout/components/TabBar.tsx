/**
 * TabBar - Tab bar component with drag and drop support
 */

import { Menu, NavArrowDown, Plus, Xmark } from 'iconoir-react';
import { memo, useCallback, useRef, useState } from 'react';
import { useLayout } from '../LayoutContext';
import { PaneId, Tab, TAB_DRAG_TYPE, TabDragData } from '../types';

// ============================================================================
// Tab Item Component
// ============================================================================

interface TabItemProps {
    tab: Tab;
    index: number;
    paneId: PaneId;
    isActive: boolean;
    isPaneActive: boolean;
    isDragging: boolean;
    onClose: (index: number) => void;
    onSelect: (index: number) => void;
    onDragStart: (e: React.DragEvent, index: number) => void;
    onDragOver: (e: React.DragEvent, index: number) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent, index: number) => void;
    onContextMenu: (e: React.MouseEvent, index: number) => void;
}

const TabItem = memo(function TabItem({
    tab,
    index,
    isActive,
    isPaneActive,
    isDragging,
    onClose,
    onSelect,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onContextMenu,
}: TabItemProps) {
    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose(index);
    };

    return (
        <div
            role='tab'
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            draggable
            className={`
                flex items-center gap-2 px-4 h-full min-w-[120px] max-w-[200px]
                cursor-move group relative
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                ${
                    isActive
                        ? 'cradle-bg-primary border-l border-r cradle-border cradle-text-secondary border-b border-cradle-bg-primary'
                        : 'cradle-bg-elevated cradle-text-tertiary cradle-border'
                }
                ${isDragging ? 'opacity-50' : ''}
                ${isActive && isPaneActive ? 'border-t-2' : 'border-t cradle-border'}
            `}
            style={
                isActive && isPaneActive
                    ? { borderTopColor: 'var(--cradle-accent-primary)' }
                    : {}
            }
            onClick={() => onSelect(index)}
            onContextMenu={(e) => onContextMenu(e, index)}
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, index)}
            title={tab.title}
        >
            <div className='flex-shrink-0' style={{ width: '1em', height: '1em' }}>
                <Menu width='1em' height='1em' strokeWidth={1.5} />
            </div>

            <span className='flex-1 truncate text-sm cradle-mono'>{tab.title}</span>

            <button
                aria-label={`Close tab: ${tab.title}`}
                className={`
                    flex-shrink-0 rounded p-0.5
                    border border-transparent hover:cradle-border
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                    ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                `}
                onClick={handleClose}
                title='Close'
            >
                <Xmark width='0.9em' height='0.9em' />
            </button>
        </div>
    );
});

// ============================================================================
// Context Menu Component
// ============================================================================

interface ContextMenuProps {
    position: { x: number; y: number };
    tabIndex: number;
    tabCount: number;
    onClose: () => void;
    onCloseTab: () => void;
    onCloseOthers: () => void;
    onCloseToRight: () => void;
}

function ContextMenu({
    position,
    tabIndex,
    tabCount,
    onClose,
    onCloseTab,
    onCloseOthers,
    onCloseToRight,
}: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    const handleClickOutside = useCallback(
        (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        },
        [onClose],
    );

    // Set up click outside listener
    useState(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    });

    return (
        <div
            ref={menuRef}
            role='menu'
            className='fixed z-50 cradle-bg-elevated cradle-border rounded shadow-lg py-1 min-w-[180px]'
            style={{ left: position.x, top: position.y }}
        >
            <button
                role='menuitem'
                className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2'
                onClick={() => {
                    onCloseTab();
                    onClose();
                }}
            >
                <Xmark width='1em' height='1em' />
                Close
            </button>

            {tabCount > 1 && (
                <button
                    role='menuitem'
                    className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2'
                    onClick={() => {
                        onCloseOthers();
                        onClose();
                    }}
                >
                    <NavArrowDown width='1em' height='1em' />
                    Close Others
                </button>
            )}

            {tabIndex < tabCount - 1 && (
                <button
                    role='menuitem'
                    className='w-full px-4 py-2 text-left text-sm cradle-text-secondary hover:cradle-bg-secondary flex items-center gap-2'
                    onClick={() => {
                        onCloseToRight();
                        onClose();
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
    );
}

// ============================================================================
// TabBar Component
// ============================================================================

interface TabBarProps {
    paneId: PaneId;
    tabs: Tab[];
    activeTabIndex: number;
    isPaneActive: boolean;
}

export function TabBar({ paneId, tabs, activeTabIndex, isPaneActive }: TabBarProps) {
    const {
        closeTab,
        switchTab,
        reorderTabs,
        moveTabToPane,
        closeOtherTabs,
        closeTabsToRight,
        openTab,
        setActivePaneId,
    } = useLayout();

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        index: number;
    } | null>(null);

    // ========================================================================
    // Handlers
    // ========================================================================

    const handleSelect = useCallback(
        (index: number) => {
            if (!isPaneActive) {
                setActivePaneId(paneId);
            }
            switchTab(paneId, index);
        },
        [paneId, isPaneActive, setActivePaneId, switchTab],
    );

    const handleClose = useCallback(
        (index: number) => {
            closeTab(paneId, index);
        },
        [paneId, closeTab],
    );

    const handleContextMenu = useCallback((e: React.MouseEvent, index: number) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, index });
    }, []);

    const handleNewTab = useCallback(() => {
        openTab(paneId, '/');
    }, [paneId, openTab]);

    // ========================================================================
    // Drag and Drop
    // ========================================================================

    const handleDragStart = useCallback(
        (e: React.DragEvent, index: number) => {
            setDraggedIndex(index);

            const dragData: TabDragData = {
                paneId,
                tabIndex: index,
                tabCount: tabs.length,
            };

            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData(TAB_DRAG_TYPE, JSON.stringify(dragData));

            // Set global flag for pane drop zones
            (window as any).__cradleTabDragging = true;
        },
        [paneId, tabs.length],
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent, index: number) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            if (draggedIndex !== index) {
                setDragOverIndex(index);
            }
        },
        [draggedIndex],
    );

    const handleDragLeave = useCallback(() => {
        setDragOverIndex(null);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent, dropIndex: number) => {
            e.preventDefault();
            e.stopPropagation();

            try {
                const data = JSON.parse(
                    e.dataTransfer.getData(TAB_DRAG_TYPE),
                ) as TabDragData;

                if (data.paneId === paneId) {
                    // Same pane - reorder
                    if (data.tabIndex !== dropIndex) {
                        reorderTabs(paneId, data.tabIndex, dropIndex);
                    }
                } else {
                    // Different pane - move
                    moveTabToPane(data.paneId, data.tabIndex, paneId, dropIndex);
                    setActivePaneId(paneId);
                }
            } catch (err) {
                console.error('Failed to parse drag data:', err);
            }

            setDraggedIndex(null);
            setDragOverIndex(null);
            (window as any).__cradleTabDragging = false;
        },
        [paneId, reorderTabs, moveTabToPane, setActivePaneId],
    );

    const handleDragEnd = useCallback(() => {
        setDraggedIndex(null);
        setDragOverIndex(null);
        (window as any).__cradleTabDragging = false;
    }, []);

    // Handle drops on empty area of tab bar
    const handleBarDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();

            try {
                const data = JSON.parse(
                    e.dataTransfer.getData(TAB_DRAG_TYPE),
                ) as TabDragData;

                if (data.paneId !== paneId) {
                    moveTabToPane(data.paneId, data.tabIndex, paneId, -1);
                    setActivePaneId(paneId);
                }
            } catch (err) {
                console.error('Failed to parse drag data:', err);
            }

            (window as any).__cradleTabDragging = false;
        },
        [paneId, moveTabToPane, setActivePaneId],
    );

    // ========================================================================
    // Render
    // ========================================================================

    if (tabs.length === 0) {
        return null;
    }

    return (
        <>
            <div
                role='tablist'
                className={`
                    flex items-center h-10 cradle-bg-elevated overflow-x-auto overflow-y-hidden
                    cradle-scrollbar-thin relative z-20
                    ${isPaneActive ? 'cradle-border-b' : 'cradle-border-b border-opacity-50'}
                `}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={handleBarDrop}
            >
                {tabs.map((tab, index) => (
                    <TabItem
                        key={tab.id}
                        tab={tab}
                        index={index}
                        paneId={paneId}
                        isActive={index === activeTabIndex}
                        isPaneActive={isPaneActive}
                        isDragging={draggedIndex === index}
                        onClose={handleClose}
                        onSelect={handleSelect}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onContextMenu={handleContextMenu}
                    />
                ))}

                {/* New Tab Button */}
                <button
                    aria-label='Create new tab'
                    className='flex items-center justify-center h-full w-10 flex-shrink-0 cradle-text-tertiary cradle-border hover:border-cradle-accent-primary'
                    onClick={handleNewTab}
                    onDragEnd={handleDragEnd}
                    title='New Tab'
                >
                    <Plus width='1.2em' height='1.2em' />
                </button>

                <div className='flex-1' />
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    tabIndex={contextMenu.index}
                    tabCount={tabs.length}
                    onClose={() => setContextMenu(null)}
                    onCloseTab={() => closeTab(paneId, contextMenu.index)}
                    onCloseOthers={() => closeOtherTabs(paneId, contextMenu.index)}
                    onCloseToRight={() => closeTabsToRight(paneId, contextMenu.index)}
                />
            )}
        </>
    );
}
