import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import NotesList from '@components/domain/notes/NotesList';
import RelationsList from '@components/domain/relations/RelationsList';
import { Tab, Tabs } from '@components/layout/Tabs/Tabs';
import { ComponentType, useMemo } from 'react';
import GraphControl from './GraphControl';

interface Entry {
    id: string;
    label?: string;
    name?: string;
    value?: string;
    [key: string]: any;
}

interface Node {
    id: string;
    [key: string]: any;
}

interface Edge {
    id: string;
    source: string;
    target: string;
    [key: string]: any;
}

interface SearchComponentProps {
    addEdges: (edges: Edge[]) => void;
    addNodes: (nodes: Node[]) => void;
}

interface GraphQueryProps {
    selectedEntries: Set<Entry>;
    setSelectedEntries: (entries: Set<Entry>) => void;
    entryGraphColors: Record<string, string>;
    disabledTypes: Set<string>;
    setDisabledTypes: (types: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
    config: any;
    setConfig: (config: any) => void;
    SearchComponent: ComponentType<SearchComponentProps>;
    addEdges: (edges: Edge[]) => void;
    addNodes: (nodes: Node[]) => void;
    nodes: Node[];
    edges: Edge[];
}

export default function GraphQuery({
    selectedEntries,
    setSelectedEntries,
    entryGraphColors,
    disabledTypes,
    setDisabledTypes,
    config,
    setConfig,
    SearchComponent,
    addEdges,
    addNodes,
    nodes,
    edges,
}: GraphQueryProps) {
    const { navigate, navigateLink } = useCradleNavigate();

    const settingsProps = {
        config,
        setConfig,
    };

    const graphQuery = useMemo(() => {
        return (
            selectedEntries && {
                references: Array.from(selectedEntries).map((entry) => entry.id),
                references_at_least: 2,
            }
        );
    }, [selectedEntries]);

    const relationQuery = useMemo(() => {
        return (
            selectedEntries && {
                relates: Array.from(selectedEntries).map((entry) => entry.id),
            }
        );
    }, [selectedEntries]);

    return (
        <div className='h-full rounded-xl flex flex-col'>
            <Tabs
                defaultTab={0}
                perTabClass=''
            >
                <Tab title='Search'>
                    <div className='flex flex-col flex-1 overflow-hidden h-[85vh]'>
                        <GraphControl
                            settingsProps={settingsProps}
                            SearchComponent={SearchComponent}
                            entryGraphColors={entryGraphColors}
                            disabledTypes={disabledTypes}
                            setDisabledTypes={setDisabledTypes}
                            addEdges={addEdges}
                            addNodes={addNodes}
                            nodes={nodes}
                            edges={edges}
                        />
                    </div>
                </Tab>
                <Tab title='Notes' classes='pt-2'>
                    <div className='mt-3 flex flex-col flex-1 overflow-hidden h-[85vh]'>
                        <div className='flex-1 overflow-y-auto mt-2 px-4'>
                            {selectedEntries?.size >= 2 ? (
                                <>
                                    {/* Badges for selected entries */}
                                    <div className='flex flex-wrap gap-2 mb-2'>
                                        {Array.from(selectedEntries).slice(0, 3).map((entry) => (
                                            <span
                                                key={entry.id || entry.value || String(entry)}
                                                className='badge badge-outline-primary text-sm'
                                            >
                                                {entry.label ||
                                                    entry.name ||
                                                    entry.id ||
                                                    String(entry)}
                                            </span>
                                        ))}
                                    </div>

                                    <NotesList
                                        query={graphQuery}
                                        hideActionBar={true}
                                        forceCardView={true}
                                    />
                                </>
                            ) : (
                                <div className='text-center text-sm text-gray-400 mt-10'>
                                    Select at least two entries to see connected notes
                                </div>
                            )}
                        </div>
                    </div>
                </Tab>
                <Tab title='Relations' classes='pt-2'>
                    <div className='mt-3 flex flex-col flex-1 overflow-hidden h-[85vh]'>
                        <div className='flex-1 overflow-y-auto mt-2 px-4'>
                            {selectedEntries?.size >= 2 ? (
                                <>
                                    {/* Badges for selected entries */}
                                    <div className='flex flex-wrap gap-2 mb-2'>
                                        {Array.from(selectedEntries).slice(0, 3).map((entry) => (
                                            <span
                                                key={entry.id || entry.value || String(entry)}
                                                className='badge badge-outline-primary text-sm'
                                            >
                                                {entry.label ||
                                                    entry.name ||
                                                    entry.id ||
                                                    String(entry)}
                                            </span>
                                        ))}
                                    </div>

                                    <RelationsList query={relationQuery} />
                                </>
                            ) : (
                                <div className='text-center text-sm text-gray-400 mt-10'>
                                    Select at least two entries to see connected
                                    relations
                                </div>
                            )}
                        </div>
                    </div>
                </Tab>
            </Tabs>
        </div>
    );
}
