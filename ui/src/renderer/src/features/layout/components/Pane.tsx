/**
 * Pane - A single pane containing tabs and content
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLayout } from '../LayoutContext';
import { DropZone, PaneId, TAB_DRAG_TYPE, TabDragData } from '../types';
import { TabBar } from './TabBar';
import { TabContentMount } from './TabContent';

// ============================================================================
// Drop Zone Overlay
// ============================================================================

interface DropZoneOverlayProps {
    zone: DropZone;
    tabBarHeight: number;
}

function DropZoneOverlay({ zone, tabBarHeight }: DropZoneOverlayProps) {
    if (!zone || zone === 'tabs') return null;

    const style: React.CSSProperties = {
        position: 'absolute',
        background: 'var(--cradle-glow-primary)',
        zIndex: 1000,
        pointerEvents: 'none',
    };

    switch (zone) {
        case 'top':
            return (
                <div
                    style={{
                        ...style,
                        top: tabBarHeight,
                        left: 0,
                        right: 0,
                        height: '50%',
                    }}
                />
            );
        case 'bottom':
            return (
                <div
                    style={{ ...style, bottom: 0, left: 0, right: 0, height: '50%' }}
                />
            );
        case 'left':
            return (
                <div
                    style={{
                        ...style,
                        top: tabBarHeight,
                        bottom: 0,
                        left: 0,
                        width: '50%',
                    }}
                />
            );
        case 'right':
            return (
                <div
                    style={{
                        ...style,
                        top: tabBarHeight,
                        bottom: 0,
                        right: 0,
                        width: '50%',
                    }}
                />
            );
        default:
            return null;
    }
}

// ============================================================================
// Pane Component
// ============================================================================

interface PaneProps {
    paneId: PaneId;
}

export function Pane({ paneId }: PaneProps) {
    const { state, setActivePaneId, getPaneState, splitPane, moveTabToPane } =
        useLayout();
    const isPaneActive = state.activePaneId === paneId;
    const paneState = getPaneState(paneId);
    const { tabs, activeTabIndex } = paneState;

    const paneRef = useRef<HTMLDivElement>(null);
    const tabBarRef = useRef<HTMLDivElement>(null);
    const [tabBarHeight, setTabBarHeight] = useState(40);
    const [dropZone, setDropZone] = useState<DropZone>(null);
    const [showOverlay, setShowOverlay] = useState(false);

    // ========================================================================
    // Activate pane on interaction
    // ========================================================================

    useEffect(() => {
        const el = paneRef.current;
        if (!el) return;

        const handleInteraction = () => {
            if (!isPaneActive) {
                setActivePaneId(paneId);
            }
        };

        // Use capture to catch events before portal content
        el.addEventListener('mousedown', handleInteraction, true);
        el.addEventListener('focusin', handleInteraction, true);

        return () => {
            el.removeEventListener('mousedown', handleInteraction, true);
            el.removeEventListener('focusin', handleInteraction, true);
        };
    }, [isPaneActive, paneId, setActivePaneId]);

    // ========================================================================
    // Track tab bar height
    // ========================================================================

    useEffect(() => {
        const el = tabBarRef.current;
        if (!el) return;

        const ro = new ResizeObserver(([entry]) => {
            setTabBarHeight(entry.contentRect.height);
        });
        ro.observe(el);

        return () => ro.disconnect();
    }, []);

    // ========================================================================
    // Drop zone calculation
    // ========================================================================

    const calculateDropZone = useCallback(
        (e: DragEvent | React.DragEvent): DropZone => {
            if (!paneRef.current) return null;

            const rect = paneRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const w = rect.width;
            const h = rect.height;

            // Check if over tab bar
            if (y < tabBarHeight) {
                return 'tabs';
            }

            // Calculate distances to edges
            const dLeft = x;
            const dRight = w - x;
            const dTop = y - tabBarHeight;
            const dBottom = h - y;

            const minDist = Math.min(dLeft, dRight, dTop, dBottom);

            if (minDist === dLeft) return 'left';
            if (minDist === dRight) return 'right';
            if (minDist === dTop) return 'top';
            if (minDist === dBottom) return 'bottom';

            return null;
        },
        [tabBarHeight],
    );

    // ========================================================================
    // Global drag tracking
    // ========================================================================

    useEffect(() => {
        const handleDragOver = (e: DragEvent) => {
            if (!(window as any).__cradleTabDragging) return;
            if (!paneRef.current) return;

            const rect = paneRef.current.getBoundingClientRect();
            const inside =
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom;

            if (inside) {
                setShowOverlay(true);

                // Check if single tab from same pane (can't split)
                try {
                    const data = e.dataTransfer?.getData(TAB_DRAG_TYPE);
                    if (data) {
                        const parsed = JSON.parse(data) as TabDragData;
                        if (parsed.paneId === paneId && parsed.tabCount <= 1) {
                            setDropZone(null);
                            return;
                        }
                    }
                } catch {}

                setDropZone(calculateDropZone(e));
            } else {
                setShowOverlay(false);
                setDropZone(null);
            }
        };

        const handleDragEnd = () => {
            setShowOverlay(false);
            setDropZone(null);
        };

        document.addEventListener('dragover', handleDragOver);
        document.addEventListener('drop', handleDragEnd);
        document.addEventListener('dragend', handleDragEnd);

        return () => {
            document.removeEventListener('dragover', handleDragOver);
            document.removeEventListener('drop', handleDragEnd);
            document.removeEventListener('dragend', handleDragEnd);
        };
    }, [paneId, calculateDropZone]);

    // ========================================================================
    // Handle drop
    // ========================================================================

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const zone = calculateDropZone(e);

            try {
                const data = JSON.parse(
                    e.dataTransfer.getData(TAB_DRAG_TYPE),
                ) as TabDragData;

                // Can't split if single tab from same pane
                if (data.paneId === paneId && data.tabCount <= 1) {
                    return;
                }

                if (zone === 'tabs') {
                    // Move to tab bar (handled by TabBar component)
                    if (data.paneId !== paneId) {
                        moveTabToPane(data.paneId, data.tabIndex, paneId, -1);
                        setActivePaneId(paneId);
                    }
                } else if (zone) {
                    // Create split
                    const direction =
                        zone === 'top' || zone === 'bottom' ? 'horizontal' : 'vertical';
                    const position =
                        zone === 'top' || zone === 'left' ? 'before' : 'after';

                    const result = splitPane(paneId, direction, position);
                    if (result) {
                        // Move tab to new pane
                        moveTabToPane(data.paneId, data.tabIndex, result.newPaneId, 0);
                        setActivePaneId(result.newPaneId);
                    }
                }
            } catch (err) {
                console.error('Failed to handle drop:', err);
            }

            setDropZone(null);
            setShowOverlay(false);
            (window as any).__cradleTabDragging = false;
        },
        [paneId, calculateDropZone, splitPane, moveTabToPane, setActivePaneId],
    );

    // ========================================================================
    // Render
    // ========================================================================

    return (
        <div
            ref={paneRef}
            className='flex flex-col h-full w-full relative'
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
        >
            {/* Drop zone overlay */}
            {showOverlay && (
                <DropZoneOverlay zone={dropZone} tabBarHeight={tabBarHeight} />
            )}

            {/* Tab bar */}
            <div ref={tabBarRef}>
                <TabBar
                    paneId={paneId}
                    tabs={tabs}
                    activeTabIndex={activeTabIndex}
                    isPaneActive={isPaneActive}
                />
            </div>

            {/* Tab content area */}
            <div className='flex-1 overflow-y-auto overflow-x-hidden cradle-scrollbar relative'>
                {tabs.map((tab, index) => (
                    <TabContentMount
                        key={tab.id}
                        tab={tab}
                        paneId={paneId}
                        isActive={index === activeTabIndex}
                        isPaneActive={isPaneActive}
                    />
                ))}
            </div>
        </div>
    );
}
