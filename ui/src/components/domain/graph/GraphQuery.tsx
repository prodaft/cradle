import { ScrollArea } from '@/components/ui/scroll-area';
import { EdgeRelation } from '@/services/cradle';
import { XIcon } from 'lucide-react';
import type React from 'react';
import { ComponentType } from 'react';
import GraphControl from './GraphControl';
import { Edge, Node } from './graphFilterUtils';

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
    onLoadingChange?: (isLoading: boolean) => void;
    onFetchProgressChange?: (progress: FetchProgress | null) => void;
    onFetchControlsReady?: (controls: { pause: () => void; resume: () => void }) => void;
}

interface GraphQueryProps {
    selectedEntries: Set<Entry>;
    setSelectedEntries: (entries: Set<Entry>) => void;
    entryGraphColors: Record<string, string>;
    disabledTypes: Set<string>;
    setDisabledTypes: (
        types: Set<string> | ((prev: Set<string>) => Set<string>),
    ) => void;
    config: any;
    setConfig: (config: any) => void;
    SearchComponent: ComponentType<SearchComponentProps>;
    addEdges: (edges: EdgeRelation[]) => void;
    addNodes: (nodes: Node[]) => void;
    addBoth?: (nodes: Node[], edges: EdgeRelation[]) => void;
    nodes: Node[];
    edges: Edge[];
    activePanel: 'explorer' | 'display' | 'filters';
    onClosePanel: () => void;
    cosmographRef: React.MutableRefObject<any>;
    onLoadingChange?: (isLoading: boolean) => void;
    onFetchProgressChange?: (progress: FetchProgress | null) => void;
    onFetchControlsReady?: (controls: { pause: () => void; resume: () => void }) => void;
}

export default function GraphQuery({
    entryGraphColors,
    disabledTypes,
    setDisabledTypes,
    config,
    setConfig,
    SearchComponent,
    addEdges,
    addNodes,
    addBoth,
    nodes,
    edges,
    activePanel,
    onClosePanel,
    cosmographRef,
    selectedEntries,
    setSelectedEntries,
    onLoadingChange,
    onFetchProgressChange,
    onFetchControlsReady,
}: GraphQueryProps) {
    const settingsProps = {
        config,
        setConfig,
    };

    const panelTitle =
        activePanel === 'explorer'
            ? 'Explorer'
            : activePanel === 'display'
              ? 'Display'
              : 'Filters';

    return (
        <div className='h-full rounded-xl flex flex-col relative'>
            <div className='flex flex-col flex-1 overflow-hidden h-[85vh]'>
                {/* Header with title */}
                <div className='flex justify-between items-center pl-4 pr-3 py-3'>
                    <h2 className='text-lg font-semibold'>{panelTitle}</h2>
                </div>
                {/* Close button */}
                <button
                    type='button'
                    onClick={onClosePanel}
                    className='ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4'
                >
                    <XIcon />
                    <span className='sr-only'>Close</span>
                </button>
                <div className='border-b border-border' />
                <ScrollArea className='flex-1'>
                    <GraphControl
                        settingsProps={settingsProps}
                        SearchComponent={SearchComponent}
                        entryGraphColors={entryGraphColors}
                        disabledTypes={disabledTypes}
                        setDisabledTypes={setDisabledTypes}
                        addEdges={addEdges}
                        addNodes={addNodes}
                        addBoth={addBoth}
                        nodes={nodes}
                        edges={edges}
                        activePanel={activePanel}
                        cosmographRef={cosmographRef}
                        selectedEntries={selectedEntries}
                        setSelectedEntries={setSelectedEntries}
                        onLoadingChange={onLoadingChange}
                        onFetchProgressChange={onFetchProgressChange}
                        onFetchControlsReady={onFetchControlsReady}
                    />
                </ScrollArea>
            </div>
        </div>
    );
}
