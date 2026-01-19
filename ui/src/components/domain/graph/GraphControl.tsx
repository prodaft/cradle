import { EdgeRelation } from '@/services/cradle';
import { CosmographSearch } from '@cosmograph/react';
import type React from 'react';
import { ComponentType, useMemo } from 'react';
import ExplorerPanel from './ExplorerPanel';
import GraphFilters from './GraphFilters';
import { Edge, Node } from './graphFilterUtils';
import GraphSettings from './GraphSettings';

interface Entry {
    id: string;
    label?: string;
    name?: string;
    value?: string;
    [key: string]: any;
}

interface FetchProgress {
    currentPage: number;
    totalPages: number;
    isPaused: boolean;
}

interface SearchComponentProps {
    addEdges: (edges: EdgeRelation[]) => void;
    addNodes: (nodes: Node[]) => void;
    addBoth?: (nodes: Node[], edges: EdgeRelation[]) => void;
    onLoadingChange?: (isLoading: boolean) => void;
    onFetchProgressChange?: (progress: FetchProgress | null) => void;
    onFetchControlsReady?: (controls: { pause: () => void; resume: () => void }) => void;
}

interface GraphControlProps {
    settingsProps: any;
    SearchComponent: ComponentType<SearchComponentProps>;
    entryGraphColors: Record<string, string>;
    disabledTypes: Set<string>;
    setDisabledTypes: (
        types: Set<string> | ((prev: Set<string>) => Set<string>),
    ) => void;
    addNodes: (nodes: Node[]) => void;
    addEdges: (edges: EdgeRelation[]) => void;
    addBoth?: (nodes: Node[], edges: EdgeRelation[]) => void;
    nodes: Node[];
    edges: Edge[];
    activePanel: 'explorer' | 'display' | 'filters';
    cosmographRef: React.MutableRefObject<any>;
    selectedEntries: Set<Entry>;
    setSelectedEntries: (entries: Set<Entry>) => void;
    onLoadingChange?: (isLoading: boolean) => void;
    onFetchProgressChange?: (progress: FetchProgress | null) => void;
    onFetchControlsReady?: (controls: { pause: () => void; resume: () => void }) => void;
}

export default function GraphControl({
    settingsProps,
    SearchComponent,
    entryGraphColors,
    disabledTypes,
    setDisabledTypes,
    addNodes,
    addEdges,
    addBoth,
    nodes,
    edges,
    activePanel,
    cosmographRef,
    selectedEntries,
    setSelectedEntries,
    onLoadingChange,
    onFetchProgressChange,
    onFetchControlsReady,
}: GraphControlProps) {
    const toggleDisabledType = (type: string) => {
        setDisabledTypes((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(type)) newSet.delete(type);
            else newSet.add(type);
            return newSet;
        });
    };

    // Create a map from index to node for reverse lookups
    const indexToNode = useMemo(() => {
        const map = new Map<number, Node>();
        nodes.forEach((node, index) => {
            map.set(index, node);
        });
        return map;
    }, [nodes]);

    return (
        <>
            {/* Explorer Panel Content */}
            <div className={activePanel === 'explorer' ? '' : 'hidden'}>
                <SearchComponent
                    addEdges={addEdges}
                    addNodes={addNodes}
                    addBoth={addBoth}
                    onLoadingChange={onLoadingChange}
                    onFetchProgressChange={onFetchProgressChange}
                    onFetchControlsReady={onFetchControlsReady}
                />
                {/* Graph Search - Only render when nodes are available */}
                {nodes.length > 0 && (
                    <div className='px-4 mt-4'>
                        <div className='bg-background border border-border rounded-lg p-3'>
                            <CosmographSearch
                                accessor='_label'
                                onSelect={(suggestion: any) => {
                                    if (
                                        suggestion == null ||
                                        cosmographRef.current == null
                                    )
                                        return;
                                    const index = suggestion._index;
                                    if (index !== undefined) {
                                        cosmographRef.current.setFocusedPoint(index);
                                        cosmographRef.current.zoomToPoint(index);
                                        const node = indexToNode.get(index);
                                        if (node) {
                                            setSelectedEntries(new Set([node]));
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                )}
                {/* Explorer Panel */}
                <div className='border-t-2 border-t-zinc-400 dark:border-t-zinc-800 mt-4'>
                    <ExplorerPanel
                        selectedNodes={selectedEntries}
                        allNodes={nodes}
                        edges={edges}
                        onNodeClick={(node) => {
                            setSelectedEntries(new Set([node]));
                        }}
                    />
                </div>
            </div>

            {/* Display Panel Content */}
            <div className={activePanel === 'display' ? '' : 'hidden'}>
                <GraphSettings {...settingsProps} nodes={nodes} edges={edges} />
            </div>

            {/* Filters Panel Content */}
            <div className={activePanel === 'filters' ? '' : 'hidden'}>
                <GraphFilters
                    entryGraphColors={entryGraphColors}
                    disabledTypes={disabledTypes}
                    toggleDisabledType={toggleDisabledType}
                    setDisabledTypes={setDisabledTypes}
                />
            </div>
        </>
    );
}
