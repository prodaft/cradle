import { useTheme } from '@/contexts/ui/ThemeContext';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { Cosmograph, CosmographProvider, CosmographSearch } from '@cosmograph/react';
import { Erase, PauseSolid, PlaySolid, RefreshDouble } from 'iconoir-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Edge, Node } from './graphFilterUtils';

interface GraphConfig {
    nodeRadiusCoefficient?: number;
    linkWidthCoefficient?: number;
    simulationGravity?: number;
    simulationRepulsion?: number;
    simulationLinkSpring?: number;
    simulationLinkDistance?: number;
}

interface GraphViewerProps {
    selectedNodes: Set<Node>;
    setSelectedNodes: (nodes: Set<Node>) => void;
    config?: GraphConfig;
    nodes?: Node[];
    edges?: Edge[];
    onClearGraph?: () => void;
}

function normalize(x: number, inputMin: number, inputMax: number): number {
    x = Math.min(x, inputMax);
    x = Math.max(x, inputMin);
    const outputMin = 2,
        outputMax = 10;

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
}: GraphViewerProps) {
    const { isDarkMode } = useTheme();
    const cosmographRef = useRef<any>(null);
    const { navigate, navigateLink } = useCradleNavigate();
    const [disableSimulation, setDisableSimulation] = useState(false);
    const [graphInstanceKey, setGraphInstanceKey] = useState(0);

    // Create a map from node id to index for efficient lookups
    const nodeIdToIndex = useMemo(() => {
        const map = new Map<string, number>();
        nodes.forEach((node, index) => {
            map.set(node.id, index);
        });
        return map;
    }, [nodes]);

    // Create a map from index to node for reverse lookups
    const indexToNode = useMemo(() => {
        const map = new Map<number, Node>();
        nodes.forEach((node, index) => {
            map.set(index, node);
        });
        return map;
    }, [nodes]);

    // Prepare points data with index column for Cosmograph v2
    const pointsData = useMemo(() => {
        return nodes.map((node, index) => ({
            ...node,
            _index: index,
            _color: node.color || '#4A90E2',
            _size: normalize(node.degree || 1, 1, 60),
            _label: node.label || node.id,
        }));
    }, [nodes]);

    // Prepare links data for Cosmograph v2
    const linksData = useMemo(() => {
        return edges.map((edge) => ({
            ...edge,
            _sourceIndex: nodeIdToIndex.get(edge.source) ?? 0,
            _targetIndex: nodeIdToIndex.get(edge.target) ?? 0,
        }));
    }, [edges, nodeIdToIndex]);

    // onClick handles both point clicks and background clicks
    const onClick = useCallback(
        (
            index: number | undefined,
            pointPosition: [number, number] | undefined,
            event: MouseEvent,
        ) => {
            if (index === undefined || index === null) {
                // Background click - clear selection
                setSelectedNodes(new Set());
                cosmographRef.current?.setFocusedPoint(undefined);
                return;
            }

            const node = indexToNode.get(index);
            if (!node) return;

            let clickedNodes = [node];
            if (cosmographRef.current != null && selectedNodes.has(node)) {
                const connectedIndices = cosmographRef.current.getConnectedPointIndices(index);
                if (connectedIndices) {
                    clickedNodes = connectedIndices
                        .map((i: number) => indexToNode.get(i))
                        .filter(Boolean) as Node[];
                    clickedNodes.unshift(node);
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
            cosmographRef.current?.setFocusedPoint(index);
            setSelectedNodes(newNodes);
        },
        [indexToNode, selectedNodes, setSelectedNodes],
    );

    useEffect(() => {
        if (cosmographRef.current == null) return;
        if (disableSimulation) {
            cosmographRef.current.pause();
        } else {
            cosmographRef.current.start();
        }
    }, [disableSimulation]);

    useEffect(() => {
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
    }, [selectedNodes, nodeIdToIndex]);

    return (
        <div
            style={{
                width: '100%',
                height: '100vh',
                backgroundColor: isDarkMode ? '#151515' : '#f9f9f9',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <CosmographProvider>
                <div className='absolute top-2 right-2 z-10 flex items-center gap-2 cradle-bg-elevated cradle-border px-3 py-2'>
                    <CosmographSearch
                        accessor='_label'
                        onSelect={(suggestion: any) => {
                            if (suggestion == null || cosmographRef.current == null) return;
                            const index = suggestion._index;
                            if (index !== undefined) {
                                cosmographRef.current.setFocusedPoint(index);
                                cosmographRef.current.zoomToPoint(index);
                                const node = indexToNode.get(index);
                                if (node) {
                                    setSelectedNodes(new Set([node]));
                                }
                            }
                        }}
                    />
                    <button
                        type='button'
                        className='cradle-btn cradle-btn-secondary p-2 hover:border-[#FF8C00] border border-transparent'
                        title='Clear graph elements'
                        onClick={() => onClearGraph && onClearGraph()}
                    >
                        <Erase />
                    </button>
                    <button
                        type='button'
                        className='cradle-btn cradle-btn-secondary p-2 hover:border-[#FF8C00] border border-transparent'
                        title='Toggle simulation'
                        onClick={() => setDisableSimulation(!disableSimulation)}
                    >
                        {disableSimulation ? <PlaySolid /> : <PauseSolid />}
                    </button>
                    <button
                        type='button'
                        className='cradle-btn cradle-btn-secondary p-2 hover:border-[#FF8C00] border border-transparent'
                        title='Refresh graph'
                        onClick={() => setGraphInstanceKey((k) => k + 1)}
                    >
                        <RefreshDouble />
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
                    linkSourceBy='source'
                    linkTargetBy='target'
                    linkSourceIndexBy='_sourceIndex'
                    linkTargetIndexBy='_targetIndex'
                    backgroundColor={isDarkMode ? '#151515' : '#f9f9f9'}
                    pointGreyoutOpacity={0.1}
                    pointSizeRange={[
                        2 * (config.nodeRadiusCoefficient ?? 1),
                        10 * (config.nodeRadiusCoefficient ?? 1),
                    ]}
                    showDynamicLabels={true}
                    enableSimulation={true}
                    linkColor='#999999'
                    focusedPointRingColor='#f68d2e'
                    linkWidthRange={[
                        2 * (config.linkWidthCoefficient ?? 1),
                        2 * (config.linkWidthCoefficient ?? 1),
                    ]}
                    simulationGravity={config.simulationGravity ?? 0.2}
                    simulationRepulsion={config.simulationRepulsion ?? 1.5}
                    simulationLinkSpring={config.simulationLinkSpring ?? 0.5}
                    simulationLinkDistance={config.simulationLinkDistance ?? 10}
                    curvedLinks={false}
                    onClick={onClick}
                    selectPointOnClick='single'
                    focusPointOnClick={true}
                />
            </CosmographProvider>
        </div>
    );
}
