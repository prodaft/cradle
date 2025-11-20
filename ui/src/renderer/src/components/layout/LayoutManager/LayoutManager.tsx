import React, { useCallback, useRef, useState } from 'react';
import { useLayout } from '@/contexts/ui/LayoutContext';
import LayoutPane from './LayoutPane';

// Types from LayoutContext
type PaneNode = {
    type: 'pane';
    id: string;
};

type SplitNode = {
    type: 'split' | 'split-horizontal' | 'split-vertical';
    id: string;
    orientation?: 'horizontal' | 'vertical';
    children: [LayoutNode, LayoutNode];
    sizes: [number, number];
};

type LayoutNode = PaneNode | SplitNode;

interface ResizableContainerProps {
    node: SplitNode;
    outletContext?: unknown;
    isHorizontal: boolean;
    onResize: (newSizes: [number, number]) => void;
}

interface LayoutRendererProps {
    node: LayoutNode;
    outletContext?: unknown;
}

interface LayoutManagerProps {
    outletContext?: unknown;
}

/**
 * ResizableContainer - A container that can be resized
 */
const ResizableContainer = ({ node, outletContext, isHorizontal, onResize }: ResizableContainerProps) => {
    const [sizes, setSizes] = useState<[number, number]>(node.sizes || [50, 50]);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const startPosRef = useRef(0);
    const startSizesRef = useRef<[number, number]>([50, 50]);

    const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
        e.preventDefault();
        isDraggingRef.current = true;
        startPosRef.current = isHorizontal ? e.clientY : e.clientX;
        startSizesRef.current = [...sizes];

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!isDraggingRef.current || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const containerSize = isHorizontal ? containerRect.height : containerRect.width;
            const currentPos = isHorizontal ? moveEvent.clientY : moveEvent.clientX;
            const delta = currentPos - startPosRef.current;
            const deltaPercent = (delta / containerSize) * 100;

            const newSizes: [number, number] = [...startSizesRef.current];
            newSizes[index] = Math.max(10, Math.min(90, newSizes[index] + deltaPercent));
            newSizes[index + 1] = Math.max(10, Math.min(90, newSizes[index + 1] - deltaPercent));

            setSizes(newSizes);
        };

        const handleMouseUp = () => {
            isDraggingRef.current = false;
            if (onResize) {
                onResize(sizes);
            }
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [sizes, isHorizontal, onResize]);

    return (
        <div
            ref={containerRef}
            className='flex h-full w-full'
            style={{
                flexDirection: isHorizontal ? 'column' : 'row',
            }}
        >
            {node.children.map((child, index) => (
                <React.Fragment key={child.id}>
                    <div
                        style={{
                            [isHorizontal ? 'height' : 'width']: `${sizes[index]}%`,
                            overflow: 'hidden',
                        }}
                    >
                        <LayoutRenderer node={child} outletContext={outletContext} />
                    </div>
                    {index < node.children.length - 1 && (
                        <div
                            className={`flex-shrink-0 cradle-bg-elevated cradle-border hover:bg-[#FF8C00] ${
                                isHorizontal ? 'h-1 cursor-ns-resize' : 'w-1 cursor-ew-resize'
                            }`}
                            onMouseDown={(e) => handleMouseDown(e, index)}
                        />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

/**
 * LayoutRenderer - Recursively renders the layout structure
 */
const LayoutRenderer = ({ node, outletContext }: LayoutRendererProps) => {
    const { updatePaneSizes } = useLayout();

    const handleResize = useCallback((newSizes: [number, number]) => {
        updatePaneSizes(node.id, newSizes);
    }, [node.id, updatePaneSizes]);

    if (!node) {
        return null;
    }

    if (node.type === 'pane') {
        return <LayoutPane paneId={node.id} outletContext={outletContext} />;
    }

    if (node.type === 'split-horizontal' || node.type === 'split-vertical') {
        return (
            <ResizableContainer
                node={node as SplitNode}
                outletContext={outletContext}
                isHorizontal={node.type === 'split-horizontal'}
                onResize={handleResize}
            />
        );
    }

    return null;
};

/**
 * LayoutManager component - Manages the entire layout with multiple panes
 */
const LayoutManager = ({ outletContext }: LayoutManagerProps) => {
    const { layout } = useLayout();

    return (
        <div className='h-full w-full overflow-hidden'>
            <LayoutRenderer node={layout} outletContext={outletContext} />
        </div>
    );
};

export default LayoutManager;
