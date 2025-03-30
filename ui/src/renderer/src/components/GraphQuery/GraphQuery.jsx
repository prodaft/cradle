import React, { forwardRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import GraphControl from './GraphControl';
import NotesList from '../NotesList/NotesList';
import { Tabs, Tab } from '../Tabs/Tabs';
import RelationsList from '../RelationsList/RelationsList';

const GraphQuery = forwardRef(function (
    { selectedEntries, setSelectedEntries, config, setConfig },
    graphRef,
) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialValues = {
        src: searchParams.get('src') || '',
        dst: JSON.parse(searchParams.get('dst') || '[]'),
        max_depth: parseInt(searchParams.get('max_depth') || '2'),
        startDate: searchParams.get('startDate') || '1970-01-01',
        endDate:
            searchParams.get('endDate') || format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    };

    // Prepare props for GraphSearch.
    const searchProps = {
        initialValues,
    };

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
        <div className='h-full p-3 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col'>
            <Tabs
                defaultTab={0}
                tabClasses='tabs-underline w-full'
                perTabClass='w-[33%] justify-center'
            >
                <Tab title='Search' classes='pt-2'>
                    <div className='mt-3 flex flex-col flex-1 overflow-hidden h-[85vh]'>
                        <GraphControl
                            searchProps={searchProps}
                            settingsProps={settingsProps}
                            ref={graphRef}
                        />
                    </div>
                </Tab>
                <Tab title='Notes' classes='pt-2'>
                    <div className='mt-3 flex flex-col flex-1 overflow-hidden h-[85vh]'>
                        <div className='flex-1 overflow-y-auto mt-2 px-4'>
                            {selectedEntries?.length >= 2 ? (
                                <>
                                    {/* Badges for selected entries */}
                                    <div className='flex flex-wrap gap-2 mb-2'>
                                        {selectedEntries.map((entry) => (
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

                                    <NotesList query={graphQuery} />
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
                            {selectedEntries?.length >= 2 ? (
                                <>
                                    {/* Badges for selected entries */}
                                    <div className='flex flex-wrap gap-2 mb-2'>
                                        {selectedEntries.map((entry) => (
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
});

export default GraphQuery;
