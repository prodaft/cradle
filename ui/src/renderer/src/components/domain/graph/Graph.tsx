import { useTheme } from '@/contexts/ui/ThemeContext';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { Cosmograph } from '@cosmograph/react';
import { PauseSolid, PlaySolid, Search } from 'iconoir-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Edge, Node } from './graphFilterUtils';

type LayoutMode = 'circular' | 'grid' | 'cluster' | 'random';

interface GraphConfig {
    nodeRadiusCoefficient?: number;
    linkWidthCoefficient?: number;
    layoutMode?: LayoutMode;
}

/**
 * Calculate positions for nodes based on layout mode
 */
function calculateLayout(
    nodes: Node[],
    layoutMode: LayoutMode,
    spaceSize: number = 512
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();
    const centerOffset = spaceSize / 2;
    
    switch (layoutMode) {
        case 'circular': {
            const radius = spaceSize * 0.35;
            const angleStep = (2 * Math.PI) / nodes.length;
            nodes.forEach((node, i) => {
                positions.set(node.id, {
                    x: centerOffset + Math.cos(i * angleStep - Math.PI / 2) * radius,
                    y: centerOffset + Math.sin(i * angleStep - Math.PI / 2) * radius,
                });
            });
            break;
        }
        case 'grid': {
            const cols = Math.ceil(Math.sqrt(nodes.length));
            const cellSize = spaceSize / (cols + 1);
            nodes.forEach((node, i) => {
                const row = Math.floor(i / cols);
                const col = i % cols;
                positions.set(node.id, {
                    x: (col + 1) * cellSize,
                    y: (row + 1) * cellSize,
                });
            });
            break;
        }
        case 'cluster': {
            // Group nodes by type/subtype
            const groups = new Map<string, Node[]>();
            nodes.forEach((node) => {
                const groupKey = node.subtype || node.type || 'default';
                if (!groups.has(groupKey)) {
                    groups.set(groupKey, []);
                }
                groups.get(groupKey)!.push(node);
            });
            
            // Position each cluster in a circle, nodes within cluster also in circle
            const groupArray = Array.from(groups.entries());
            const clusterRadius = spaceSize * 0.3;
            const clusterAngleStep = (2 * Math.PI) / groupArray.length;
            
            groupArray.forEach(([_, groupNodes], groupIndex) => {
                const clusterCenterX = centerOffset + Math.cos(groupIndex * clusterAngleStep - Math.PI / 2) * clusterRadius;
                const clusterCenterY = centerOffset + Math.sin(groupIndex * clusterAngleStep - Math.PI / 2) * clusterRadius;
                
                const nodeRadius = Math.min(spaceSize * 0.15, 30 * groupNodes.length);
                const nodeAngleStep = (2 * Math.PI) / groupNodes.length;
                
                groupNodes.forEach((node, nodeIndex) => {
                    if (groupNodes.length === 1) {
                        positions.set(node.id, { x: clusterCenterX, y: clusterCenterY });
                    } else {
                        positions.set(node.id, {
                            x: clusterCenterX + Math.cos(nodeIndex * nodeAngleStep) * nodeRadius,
                            y: clusterCenterY + Math.sin(nodeIndex * nodeAngleStep) * nodeRadius,
                        });
                    }
                });
            });
            break;
        }
        case 'random':
        default: {
            // Random positions within space
            const margin = spaceSize * 0.1;
            const range = spaceSize - 2 * margin;
            nodes.forEach((node) => {
                positions.set(node.id, {
                    x: margin + Math.random() * range,
                    y: margin + Math.random() * range,
                });
            });
            break;
        }
    }
    
    return positions;
}

interface GraphViewerProps {
    selectedNodes: Set<Node>;
    setSelectedNodes: (nodes: Set<Node>) => void;
    config?: GraphConfig;
    nodes?: Node[];
    edges?: Edge[];
    onClearGraph?: () => void;
    activePanel?: 'explorer' | 'display' | null;
    onTogglePanel?: (panel: 'explorer' | 'display') => void;
    cosmographRef?: React.MutableRefObject<any>;
}

/**
 * Normalizes a node degree value to a size suitable for graph visualization.
 * 
 * @param x - The input value (node degree)
 * @param inputMin - Minimum expected input value (default: 1)
 * @param inputMax - Maximum expected input value (default: 60)
 * @returns Normalized size value between outputMin (4) and outputMax (15)
 * 
 * The function maps node degrees to visual sizes:
 * - Nodes with degree 1 (minimum connections) → size 4
 * - Nodes with degree 60+ (maximum connections) → size 15
 * - Values are clamped to the input range before normalization
 */
function normalize(x: number, inputMin: number, inputMax: number): number {
    // Clamp input to valid range
    x = Math.min(x, inputMax);
    x = Math.max(x, inputMin);
    
    // Output range for node sizes in the graph (increased for better visibility)
    const outputMin = 15;
    const outputMax = 40;

    // Shift to avoid division by zero and normalize
    const shifted = x - inputMin + 1;
    const maxShifted = inputMax - inputMin + 1;

    const normalized = shifted / maxShifted;
    return outputMin + normalized * (outputMax - outputMin);
}

export default function GraphViewer({
    selectedNodes,
    setSelectedNodes,
    config = {},
    nodes = [],
    edges = [],
    onClearGraph,
    activePanel = null,
    onTogglePanel,
    cosmographRef: externalCosmographRef,
}: GraphViewerProps) {
    const { isDarkMode } = useTheme();
    const internalCosmographRef = useRef<any>(null);
    const cosmographRef = externalCosmographRef || internalCosmographRef;
    const { navigate, navigateLink } = useCradleNavigate();
    const [disableSimulation, setDisableSimulation] = useState(true); // Simulation disabled - button kept for future use
    const [graphInstanceKey, setGraphInstanceKey] = useState(0);

    // Filter out invalid nodes first
    const validNodes = useMemo(() => {
        const filtered = nodes.filter((node) => {
            const isValid = node.id != null && node.id !== '';
            if (!isValid) {
                console.warn('[Graph] Filtered out invalid node:', node);
            }
            return isValid;
        });
        
        if (filtered.length < nodes.length) {
            console.warn(`[Graph] Filtered out ${nodes.length - filtered.length} invalid node(s) with null or empty IDs`);
        }
        
        return filtered;
    }, [nodes]);

    // Create a map from node id to index for efficient lookups
    const nodeIdToIndex = useMemo(() => {
        const map = new Map<string, number>();
        validNodes.forEach((node, index) => {
            map.set(node.id, index);
        });
        return map;
    }, [validNodes]);

    // Create a map from index to node for reverse lookups
    const indexToNode = useMemo(() => {
        const map = new Map<number, Node>();
        validNodes.forEach((node, index) => {
            map.set(index, node);
        });
        return map;
    }, [validNodes]);

    // Calculate layout positions based on mode
    const layoutPositions = useMemo(() => {
        return calculateLayout(validNodes, config.layoutMode || 'circular', 1024);
    }, [validNodes, config.layoutMode]);

    // Prepare points data with index column and layout positions for Cosmograph v2
    const pointsData = useMemo(() => {
        return validNodes.map((node, index) => {
            const position = layoutPositions.get(node.id);
            const point: any = {
                ...node,
                _index: index,
                _color: node.color || '#4A90E2',
                _size: normalize(node.degree || 1, 1, 60),
                _label: node.label || node.id,
                x: position?.x ?? 512,
                y: position?.y ?? 512,
            };
            
            return point;
        });
    }, [validNodes, layoutPositions]);

    // Prepare links data for Cosmograph v2
    const linksData = useMemo(() => {
        return edges
            .filter((edge) => {
                const sourceIndex = nodeIdToIndex.get(edge.source);
                const targetIndex = nodeIdToIndex.get(edge.target);
                return sourceIndex !== undefined && targetIndex !== undefined;
            })
            .map((edge) => ({
                ...edge,
                _sourceIndex: nodeIdToIndex.get(edge.source)!,
                _targetIndex: nodeIdToIndex.get(edge.target)!,
            }));
    }, [edges, nodeIdToIndex]);

    // onClick handles both point clicks and background clicks
    const onClick = useCallback(
        (
            index: number | undefined,
            pointPosition: [number, number] | undefined,
            event: MouseEvent,
        ) => {
            try {
                if (index === undefined || index === null) {
                    // Background click - clear selection
                    setSelectedNodes(new Set());
                    cosmographRef.current?.setFocusedPoint(undefined);
                    return;
                }

                const node = indexToNode.get(index);
                if (!node) {
                    console.warn('[Graph] onClick: Node not found for index:', index);
                    return;
                }

                let clickedNodes = [node];
                if (cosmographRef.current != null && selectedNodes.has(node)) {
                    try {
                        const connectedIndices = cosmographRef.current.getConnectedPointIndices(index);
                        if (connectedIndices) {
                            clickedNodes = connectedIndices
                                .map((i: number) => indexToNode.get(i))
                                .filter(Boolean) as Node[];
                            clickedNodes.unshift(node);
                        }
                    } catch (e) {
                        console.warn('[Graph] Error getting connected points:', e);
                    }
                }

                let newNodes = new Set([node]);
                if (event && (event.ctrlKey || event.metaKey)) {
                    newNodes = new Set([...selectedNodes]);
                }

                for (const n of clickedNodes) {
                    if (!newNodes.has(n)) {
                        newNodes.add(n);
                    }
                }
                
                try {
                    cosmographRef.current?.setFocusedPoint(index);
                } catch (e) {
                    console.warn('[Graph] Error setting focused point:', e);
                }
                
                setSelectedNodes(newNodes);
                
                // Open explorer panel when a node is clicked
                if (onTogglePanel && activePanel !== 'explorer') {
                    onTogglePanel('explorer');
                }
            } catch (error) {
                console.error('[Graph] Error in onClick handler:', error);
            }
        },
        [indexToNode, selectedNodes, setSelectedNodes, cosmographRef, onTogglePanel, activePanel],
    );

    // onLinkClick handles link/connection clicks
    const onLinkClick = useCallback(
        (linkIndex: number, event: MouseEvent) => {
            try {
                const link = linksData[linkIndex];
                if (!link) {
                    console.warn('[Graph] onLinkClick: Link not found for index:', linkIndex);
                    return;
                }

                // Get source and target nodes
                const sourceNode = indexToNode.get(link._sourceIndex);
                const targetNode = indexToNode.get(link._targetIndex);

                // Select both nodes connected by the link
                const newNodes = new Set<Node>();
                if (sourceNode) newNodes.add(sourceNode);
                if (targetNode) newNodes.add(targetNode);

                setSelectedNodes(newNodes);

                // Open explorer panel when a connection is clicked
                if (onTogglePanel && activePanel !== 'explorer') {
                    onTogglePanel('explorer');
                }
            } catch (error) {
                console.error('[Graph] Error in onLinkClick handler:', error);
            }
        },
        [linksData, indexToNode, setSelectedNodes, onTogglePanel, activePanel],
    );

    useEffect(() => {
        try {
            if (!cosmographRef.current) return;
            if (selectedNodes.size === 0) {
                cosmographRef.current.unselectAllPoints();
            } else {
                // Convert selected nodes to indices
                const selectedIndices = Array.from(selectedNodes)
                    .map((node) => nodeIdToIndex.get(node.id))
                    .filter((index): index is number => index !== undefined);
                cosmographRef.current.selectPoints(selectedIndices);
            }
        } catch (error) {
            console.error('[Graph] Error updating selected nodes:', error);
        }
    }, [selectedNodes, nodeIdToIndex]);

    // Refresh graph when layout mode changes
    useEffect(() => {
        setGraphInstanceKey((k) => k + 1);
    }, [config.layoutMode]);

    // Cosmograph handles fit view automatically with fitViewDelay
    // This effect is just for manual refresh if needed
    useEffect(() => {
        if (!cosmographRef.current || pointsData.length === 0) return;
        
        // Optional: manually trigger fit view on graph refresh
        if (graphInstanceKey > 0) {
            const fitTimer = setTimeout(() => {
                try {
                    if (typeof cosmographRef.current?.fitView === 'function') {
                        cosmographRef.current.fitView(500, 0.1);
                    }
                } catch (e) {
                    console.warn('Could not fit view:', e);
                }
            }, 600);
            
            return () => clearTimeout(fitTimer);
        }
    }, [pointsData.length, graphInstanceKey]);

    // Only render Cosmograph when we have valid data
    const hasValidData = pointsData.length > 0;

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: isDarkMode ? '#151515' : '#f9f9f9',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {hasValidData ? (
                <>
                    {/* Graph controls - left side */}
                    <div className='absolute top-2 left-2 z-10 flex flex-col gap-1'>
                        {/* Search Panel Toggle Button */}
                        {onTogglePanel && (
                            <button
                                type='button'
                                className={`cradle-btn cradle-btn-secondary p-1.5 w-8 h-8 border flex items-center justify-center ${
                                    activePanel === 'explorer'
                                        ? 'border-cradle-accent-primary' 
                                        : 'border-cradle-border-accent hover:border-cradle-accent-primary'
                                }`}
                                title='Toggle explorer panel'
                                onClick={() => onTogglePanel('explorer')}
                            >
                                <Search width="16" height="16" />
                            </button>
                        )}
                        
                        {/* Display Panel Toggle Button */}
                        {onTogglePanel && (
                            <button
                                type='button'
                                className={`cradle-btn cradle-btn-secondary p-1.5 w-8 h-8 border flex items-center justify-center ${
                                    activePanel === 'display'
                                        ? 'border-cradle-accent-primary' 
                                        : 'border-cradle-border-accent hover:border-cradle-accent-primary'
                                }`}
                                title='Toggle display panel'
                                onClick={() => onTogglePanel('display')}
                            >
                                <svg width="16" height="16" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
                                    <path d="M3 7.4V3.6C3 3.26863 3.26863 3 3.6 3H9.4C9.73137 3 10 3.26863 10 3.6V7.4C10 7.73137 9.73137 8 9.4 8H3.6C3.26863 8 3 7.73137 3 7.4Z" stroke="currentColor" stroke-width="1.5"></path>
                                    <path d="M14 20.4V16.6C14 16.2686 14.2686 16 14.6 16H20.4C20.7314 16 21 16.2686 21 16.6V20.4C21 20.7314 20.7314 21 20.4 21H14.6C14.2686 21 14 20.7314 14 20.4Z" stroke="currentColor" stroke-width="1.5"></path>
                                    <path d="M14 12.4V3.6C14 3.26863 14.2686 3 14.6 3H20.4C20.7314 3 21 3.26863 21 3.6V12.4C21 12.7314 20.7314 13 20.4 13H14.6C14.2686 13 14 12.7314 14 12.4Z" stroke="currentColor" stroke-width="1.5"></path>
                                    <path d="M3 20.4V11.6C3 11.2686 3.26863 11 3.6 11H9.4C9.73137 11 10 11.2686 10 11.6V20.4C10 20.7314 9.73137 21 9.4 21H3.6C3.26863 21 3 20.7314 3 20.4Z" stroke="currentColor" stroke-width="1.5"></path>
                                </svg>
                            </button>
                        )}
                        
                        {/* Simulation Toggle Button */}
                        <button
                            type='button'
                            className='cradle-btn cradle-btn-secondary p-1.5 w-8 h-8 border border-cradle-border-accent hover:border-cradle-accent-primary flex items-center justify-center'
                            title='Toggle simulation'
                            onClick={() => setDisableSimulation(!disableSimulation)}
                        >
                            {disableSimulation ? <PlaySolid width="16" height="16" /> : <PauseSolid width="16" height="16" />}
                        </button>
                        
                        {/* Refresh Button */}
                        <button
                            type='button'
                            className='cradle-btn cradle-btn-secondary p-1.5 w-8 h-8 border border-cradle-border-accent hover:border-cradle-accent-primary flex items-center justify-center'
                            title='Refresh graph'
                            onClick={() => setGraphInstanceKey((k) => k + 1)}
                        >
                            <svg width="16" height="16" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
                                <path d="M21.1679 8C19.6247 4.46819 16.1006 2 11.9999 2C6.81459 2 2.55104 5.94668 2.04932 11" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                                <path d="M17 8H21.4C21.7314 8 22 7.73137 22 7.4V3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                                <path d="M2.88146 16C4.42458 19.5318 7.94874 22 12.0494 22C17.2347 22 21.4983 18.0533 22 13" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                                <path d="M7.04932 16H2.64932C2.31795 16 2.04932 16.2686 2.04932 16.6V21" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                        </button>
                    </div>
                    
                    {/* Zoom controls - top right */}
                    <div className='absolute top-2 right-2 z-10 flex flex-col gap-1'>
                        {/* Fit View Button */}
                        <button
                            type='button'
                            className='cradle-btn cradle-btn-secondary p-1.5 w-8 h-8 border border-cradle-border-accent hover:border-cradle-accent-primary flex items-center justify-center'
                            title='Fit view to show all nodes'
                            onClick={() => {
                                try {
                                    if (cosmographRef.current) {
                                        // Reset selection
                                        cosmographRef.current.unselectAllPoints();
                                        setSelectedNodes(new Set());
                                        // Fit view
                                        if (typeof cosmographRef.current.zoomToFit === 'function') {
                                            cosmographRef.current.zoomToFit();
                                        } else if (typeof cosmographRef.current.fitView === 'function') {
                                            cosmographRef.current.fitView(250, 0.1);
                                        }
                                    }
                                } catch (error) {
                                    console.error('[Graph] Error fitting view:', error);
                                }
                            }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m21 21-6-6m6 6v-4.8m0 4.8h-4.8"></path>
                                <path d="M3 16.2V21m0 0h4.8M3 21l6-6"></path>
                                <path d="M21 7.8V3m0 0h-4.8M21 3l-6 6"></path>
                                <path d="M3 7.8V3m0 0h4.8M3 3l6 6"></path>
                            </svg>
                        </button>
                        
                        <button
                            type='button'
                            className='cradle-btn cradle-btn-secondary p-1.5 w-8 h-8 border border-cradle-border-accent hover:border-cradle-accent-primary flex items-center justify-center'
                            title='Zoom in'
                            onClick={() => {
                                try {
                                    if (cosmographRef.current) {
                                        // Try multiple zoom methods
                                        if (typeof cosmographRef.current.setZoomLevel === 'function') {
                                            const currentZoom = cosmographRef.current.getZoomLevel?.() || 1;
                                            cosmographRef.current.setZoomLevel(currentZoom + 0.2, 250);
                                        } else if (typeof cosmographRef.current.setZoom === 'function') {
                                            const currentZoom = cosmographRef.current.getZoom?.() || 1;
                                            cosmographRef.current.setZoom(currentZoom * 1.2);
                                        } else if (typeof cosmographRef.current.zoomBy === 'function') {
                                            cosmographRef.current.zoomBy(1.2);
                                        }
                                    }
                                } catch (error) {
                                    console.error('[Graph] Error zooming in:', error);
                                }
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 12H20M12 4V20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                        </button>
                        <button
                            type='button'
                            className='cradle-btn cradle-btn-secondary p-1.5 w-8 h-8 border border-cradle-border-accent hover:border-cradle-accent-primary flex items-center justify-center'
                            title='Zoom out'
                            onClick={() => {
                                try {
                                    if (cosmographRef.current) {
                                        // Try multiple zoom methods
                                        if (typeof cosmographRef.current.setZoomLevel === 'function') {
                                            const currentZoom = cosmographRef.current.getZoomLevel?.() || 1;
                                            cosmographRef.current.setZoomLevel(Math.max(0.1, currentZoom - 0.2), 250);
                                        } else if (typeof cosmographRef.current.setZoom === 'function') {
                                            const currentZoom = cosmographRef.current.getZoom?.() || 1;
                                            cosmographRef.current.setZoom(currentZoom * 0.8);
                                        } else if (typeof cosmographRef.current.zoomBy === 'function') {
                                            cosmographRef.current.zoomBy(0.8);
                                        }
                                    }
                                } catch (error) {
                                    console.error('[Graph] Error zooming out:', error);
                                }
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 12H20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                        </button>
                    </div>
                    <Cosmograph
                        key={graphInstanceKey}
                        ref={cosmographRef}
                        points={pointsData}
                        links={linksData}
                        pointIdBy='id'
                        pointIndexBy='_index'
                        pointColorBy='_color'
                        pointLabelBy='_label'
                        pointSizeBy='_size'
                        pointXBy='x'
                        pointYBy='y'
                        linkSourceBy='source'
                        linkTargetBy='target'
                        linkSourceIndexBy='_sourceIndex'
                        linkTargetIndexBy='_targetIndex'
                        backgroundColor={isDarkMode ? '#151515' : '#f9f9f9'}
                        pointGreyoutOpacity={0.1}
                        pointSizeRange={[
                            15 * (config.nodeRadiusCoefficient ?? 1),
                            40 * (config.nodeRadiusCoefficient ?? 1),
                        ]}
                        showDynamicLabels={true}
                        spaceSize={1024}
                        enableSimulation={false}
                        fitViewOnInit={true}
                        fitViewDelay={250}
                        linkColor='#999999'
                        focusedPointRingColor='#f68d2e'
                        linkWidthRange={[
                            4 * (config.linkWidthCoefficient ?? 1),
                            4 * (config.linkWidthCoefficient ?? 1),
                        ]}
                        curvedLinks={false}
                        onClick={onClick}
                        onLinkClick={onLinkClick}
                        selectPointOnClick='single'
                        focusPointOnClick={true}
                        scalePointsOnZoom={false}
                    />
                </>
            ) : (
                <div className='flex items-center justify-center h-full text-gray-500'>
                    <div className='text-center'>
                        <p className='text-lg mb-2'>No graph data available</p>
                        <p className='text-sm'>Add nodes to visualize the graph</p>
                    </div>
                </div>
            )}
        </div>
    );
}
