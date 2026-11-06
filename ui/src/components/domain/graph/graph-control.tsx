import { ActionBarSearch } from '@/components/base/action-bar-controls/action-bar-controls';
import { type RefObject, ComponentType, useMemo, useState } from 'react';
import type Sigma from 'sigma';
import ExplorerPanel, { ColorDot, displayName } from './explorer-panel';
import { type Edge, type EdgeRelation, type Node } from './graph-filter-utils';
import GraphFilters from './graph-filters';
import GraphSettings from './graph-settings';

/** How wide (in pixels) Focus makes a node at least, zooming in as needed. */
const FOCUS_PIXELS = 24;

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
    onFetchControlsReady?: (controls: {
        pause: () => void;
        resume: () => void;
    }) => void;
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
    sigmaRef: RefObject<{ sigma: Sigma } | null>;
    selectedEntries: Set<Entry>;
    setSelectedEntries: (entries: Set<Entry>) => void;
    onLoadingChange?: (isLoading: boolean) => void;
    onFetchProgressChange?: (progress: FetchProgress | null) => void;
    onFetchControlsReady?: (controls: {
        pause: () => void;
        resume: () => void;
    }) => void;
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
    sigmaRef,
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

    const [draft, setDraft] = useState('');
    const nodeResults = useMemo(() => {
        if (!draft.trim()) return nodes.slice(0, 10);
        const q = draft.toLowerCase();
        return nodes
            .filter(
                (n) =>
                    (n.label ?? n.id).toLowerCase().includes(q) ||
                    n.id.toLowerCase().includes(q),
            )
            .slice(0, 10);
    }, [nodes, draft]);

    const focusNode = (node: Node) => {
        const sigma = sigmaRef.current?.sigma;
        const data = sigma?.getNodeDisplayData(node.id);
        if (!sigma || !data) return; // not drawn, such as when filtered out
        const camera = sigma.getCamera();
        const pixels = 2 * sigma.scaleSize(data.size);
        const growth = sigma.getSetting('itemSizesReference') === 'positions' ? 1 : 2;
        const ratio =
            pixels >= FOCUS_PIXELS
                ? camera.ratio
                : camera.ratio * (pixels / FOCUS_PIXELS) ** growth;
        camera.animate({ x: data.x, y: data.y, ratio }, { duration: 250 });
    };

    const selectNode = (node: Node) => {
        focusNode(node);
        setSelectedEntries(new Set([node]));
        setDraft('');
    };

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
                    <div className='px-4 mt-4 relative'>
                        <ActionBarSearch
                            placeholder='Search nodes...'
                            name='graph-node-search'
                            value={draft}
                            className='w-full min-w-0'
                            onValueChange={setDraft}
                            onClear={() => setDraft('')}
                        />
                        {draft && nodeResults.length > 0 && (
                            <div className='absolute z-50 left-4 right-4 mt-1 rounded-md border border-border bg-popover py-1 shadow-md max-h-64 overflow-y-auto'>
                                <ul>
                                    {nodeResults.map((node) => (
                                        <li key={node.id}>
                                            <button
                                                type='button'
                                                className='w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2'
                                                onClick={() => selectNode(node)}
                                            >
                                                <ColorDot color={node.color} />
                                                <span className='truncate'>
                                                    {displayName(node)}
                                                </span>
                                                {node.subtype && (
                                                    <span className='ml-auto shrink-0 text-xs text-muted-foreground'>
                                                        {node.subtype}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
                {/* Explorer Panel */}
                <div className='border-t border-border mt-4'>
                    <ExplorerPanel
                        selectedNodes={selectedEntries}
                        allNodes={nodes}
                        edges={edges}
                        onNodeClick={(node) => {
                            setSelectedEntries(new Set([node]));
                        }}
                        onFocus={focusNode}
                        onClear={() => setSelectedEntries(new Set())}
                    />
                </div>
            </div>

            {/* Display Panel Content */}
            <div className={activePanel === 'display' ? '' : 'hidden'}>
                <GraphSettings {...settingsProps} />
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
