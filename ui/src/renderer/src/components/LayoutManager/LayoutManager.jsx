import React, { useCallback, useRef, useState } from 'react';
import { useLayout } from '../../contexts/LayoutContext/LayoutContext';
import LayoutPane from '../LayoutPane/LayoutPane';

/**
 * ResizableContainer - A container that can be resized
 */
const ResizableContainer = ({ node, outletContext, isHorizontal, onResize }) => {
    const [sizes, setSizes] = useState(node.sizes || [50, 50]);
    const containerRef = useRef(null);
    const isDraggingRef = useRef(false);
    const startPosRef = useRef(0);
    const startSizesRef = useRef([]);

    const handleMouseDown = useCallback((e, index) => {
        e.preventDefault();
        isDraggingRef.current = true;
        startPosRef.current = isHorizontal ? e.clientY : e.clientX;
        startSizesRef.current = [...sizes];

        const handleMouseMove = (moveEvent) => {
            if (!isDraggingRef.current || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const containerSize = isHorizontal ? containerRect.height : containerRect.width;
            const currentPos = isHorizontal ? moveEvent.clientY : moveEvent.clientX;
            const delta = currentPos - startPosRef.current;
            const deltaPercent = (delta / containerSize) * 100;

            const newSizes = [...startSizesRef.current];
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
const LayoutRenderer = ({ node, outletContext }) => {
    const { updatePaneSizes } = useLayout();

    const handleResize = useCallback((newSizes) => {
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
                node={node}
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
const LayoutManager = ({ outletContext }) => {
    const { layout } = useLayout();

    return (
        <div className='h-full w-full overflow-hidden'>
            <LayoutRenderer node={layout} outletContext={outletContext} />
        </div>
    );
};

export default LayoutManager;

