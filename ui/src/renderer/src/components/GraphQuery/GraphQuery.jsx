import { useEffect, useMemo } from 'react';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import NotesList from '../NotesList/NotesList';
import RelationsList from '../RelationsList/RelationsList';
import { Tab, Tabs } from '../Tabs/Tabs';
import GraphControl from './GraphControl';

export default function GraphQuery({
    selectedEntries,
    setSelectedEntries,
    config,
    setConfig,
    SearchComponent,
    addEdges,
    addNodes,
    nodes,
    edges,
}) {
    const { navigate, navigateLink } = useCradleNavigate();

    useEffect(() => {
        console.log(selectedEntries, selectedEntries?.size);
    }, [selectedEntries]);

    // Prepare props for GraphSettings.
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
        <div className='h-full px-3 rounded-xl flex flex-col'>
            <Tabs
                defaultTab={0}
                tabClasses='tabs-underline w-full bg-opacity-9'
                perTabClass='w-[33%] justify-center'
            >
                <Tab title='Search'>
                    <div className='flex flex-col flex-1 overflow-hidden h-[85vh]'>
                        <GraphControl
                            settingsProps={settingsProps}
                            SearchComponent={SearchComponent}
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
                                                key={entry.id || entry.value || entry}
                                                className='badge badge-outline-primary text-sm'
                                            >
                                                {entry.label ||
                                                    entry.name ||
                                                    entry.id ||
                                                    entry}
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
                                                key={entry.id || entry.value || entry}
                                                className='badge badge-outline-primary text-sm'
                                            >
                                                {entry.label ||
                                                    entry.name ||
                                                    entry.id ||
                                                    entry}
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
