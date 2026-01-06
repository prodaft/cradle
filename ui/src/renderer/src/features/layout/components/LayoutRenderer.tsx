/**
 * LayoutRenderer - Recursively renders the layout tree
 */

import React, { useCallback, useRef, useState } from 'react';
import { LayoutNode, SplitNode, isPaneNode, isSplitNode } from '../types';
import { useLayout } from '../LayoutContext';
import { Pane } from './Pane';

// ============================================================================
// Resizable Split Container
// ============================================================================

interface ResizableSplitProps {
    node: SplitNode;
}

function ResizableSplit({ node }: ResizableSplitProps) {
    const { updateSplitSizes } = useLayout();
    const [sizes, setSizes] = useState<[number, number]>(node.sizes);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const startPosRef = useRef(0);
    const startSizesRef = useRef<[number, number]>([50, 50]);
    
    const isHorizontal = node.orientation === 'horizontal';
    
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDraggingRef.current = true;
        startPosRef.current = isHorizontal ? e.clientY : e.clientX;
        startSizesRef.current = [...sizes];
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!isDraggingRef.current || !containerRef.current) return;
            
            const rect = containerRef.current.getBoundingClientRect();
            const containerSize = isHorizontal ? rect.height : rect.width;
            const currentPos = isHorizontal ? moveEvent.clientY : moveEvent.clientX;
            const delta = currentPos - startPosRef.current;
            const deltaPercent = (delta / containerSize) * 100;
            
            const newSizes: [number, number] = [
                Math.max(10, Math.min(90, startSizesRef.current[0] + deltaPercent)),
                Math.max(10, Math.min(90, startSizesRef.current[1] - deltaPercent)),
            ];
            
            setSizes(newSizes);
        };
        
        const handleMouseUp = () => {
            if (isDraggingRef.current) {
                isDraggingRef.current = false;
                updateSplitSizes(node.id, sizes);
            }
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [isHorizontal, sizes, node.id, updateSplitSizes]);
    
    return (
        <div
            ref={containerRef}
            className="flex h-full w-full"
            style={{ flexDirection: isHorizontal ? 'column' : 'row' }}
        >
            {/* First child */}
            <div style={{ [isHorizontal ? 'height' : 'width']: `${sizes[0]}%`, overflow: 'hidden' }}>
                <LayoutRenderer node={node.children[0]} />
            </div>
            
            {/* Resize handle */}
            <div
                className={`
                    flex-shrink-0 cradle-bg-elevated cradle-border
                    hover:bg-[var(--cradle-accent-primary)] transition-colors
                    ${isHorizontal ? 'h-1 cursor-ns-resize' : 'w-1 cursor-ew-resize'}
                `}
                onMouseDown={handleMouseDown}
            />
            
            {/* Second child */}
            <div style={{ [isHorizontal ? 'height' : 'width']: `${sizes[1]}%`, overflow: 'hidden' }}>
                <LayoutRenderer node={node.children[1]} />
            </div>
        </div>
    );
}

// ============================================================================
// Layout Renderer
// ============================================================================

interface LayoutRendererProps {
    node: LayoutNode;
}

export function LayoutRenderer({ node }: LayoutRendererProps) {
    if (!node) return null;
    
    if (isPaneNode(node)) {
        return <Pane paneId={node.id} />;
    }
    
    if (isSplitNode(node)) {
        return <ResizableSplit node={node} />;
    }
    
    return null;
}

// ============================================================================
// Layout Manager (entry point)
// ============================================================================

export function LayoutManager() {
    const { state } = useLayout();
    
    return (
        <div className="h-full w-full overflow-hidden">
            <LayoutRenderer node={state.root} />
        </div>
    );
}

