import { EdgeRelation } from '@/services/cradle';
import { ComponentType, MutableRefObject } from 'react';
import { Edge, Node } from './graphFilterUtils';
import GraphControl from './GraphControl';

interface Entry {
    id: string;
    label?: string;
    name?: string;
    value?: string;
    [key: string]: any;
}

interface SearchComponentProps {
    addEdges: (edges: EdgeRelation[]) => void;
    addNodes: (nodes: Node[]) => void;
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
    activePanel: 'explorer' | 'display';
    onClosePanel: () => void;
    cosmographRef: MutableRefObject<any>;
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
}: GraphQueryProps) {
    const settingsProps = {
        config,
        setConfig,
    };

    const panelTitle = activePanel === 'explorer' ? 'Explorer' : 'Display';

    return (
        <div className='h-full rounded-xl flex flex-col'>
            <div className='flex flex-col flex-1 overflow-hidden h-[85vh]'>
                {/* Header with title and close button */}
                <div className='flex justify-between items-center pl-4 pr-3 py-3'>
                    <h2 className='text-lg font-semibold'>{panelTitle}</h2>
                    <button
                        type='button'
                        className='cradle-btn cradle-btn-secondary p-1.5 w-8 h-8 border border-cradle-border-accent hover:border-cradle-accent-primary flex items-center justify-center'
                        title='Close panel'
                        onClick={onClosePanel}
                    >
                        <svg width="16" height="16" stroke-width="1.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="currentColor">
                            <path d="M6.75827 17.2426L12.0009 12M17.2435 6.75736L12.0009 12M12.0009 12L6.75827 6.75736M12.0009 12L17.2435 17.2426" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"></path>
                        </svg>
                    </button>
                </div>
                <div className='border-b-2 border-b-zinc-400 dark:border-b-zinc-800' />
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
                />
            </div>
        </div>
    );
}
