import { addDays, format } from 'date-fns';
import { forwardRef, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tab, Tabs } from '../Tabs/Tabs';
import PaginatedGraphFetch from './PaginatedGraphFetch';
import PathFindSearch from './PathFindSearch';

const GraphSearch = forwardRef(({ processNewNode, addEdge }, graphRef) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const [queryValues, setQueryValues] = useState({
        pathfind: {
            src: JSON.parse(searchParams.get('pf_src') || 'null'),
            dst: JSON.parse(searchParams.get('pf_dst') || '[]'),
            max_depth: parseInt(searchParams.get('pf_max_depth') || '2'),
            startDate: searchParams.get('pf_startDate') || '1970-01-01',
            endDate:
                searchParams.get('pf_endDate') ||
                format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        },
        paginatedgraphfetch: {
            src: JSON.parse(searchParams.get('pgf_src') || 'null'),
            startDate: searchParams.get('pgf_startDate') || '1970-01-01',
            endDate:
                searchParams.get('pgf_endDate') ||
                format(addDays(new Date(), 1), 'yyyy-MM-dd'),
            pageSize: parseInt(searchParams.get('pgf_pageSize') || '10'),
        },
    });

    useEffect(() => {
        const newParams = new URLSearchParams(searchParams);

        const pf = queryValues.pathfind;
        newParams.set('pf_src', JSON.stringify(pf.src));
        newParams.set('pf_dst', JSON.stringify(pf.dst));
        newParams.set('pf_max_depth', pf.max_depth.toString());
        newParams.set('pf_startDate', pf.startDate);
        newParams.set('pf_endDate', pf.endDate);

        const pgf = queryValues.paginatedgraphfetch;
        newParams.set('pgf_src', JSON.stringify(pgf.src));
        newParams.set('pgf_startDate', pgf.startDate);
        newParams.set('pgf_endDate', pgf.endDate);
        newParams.set('pgf_pageSize', pgf.pageSize.toString());

        setSearchParams(newParams, { replace: true });
    }, [queryValues, setSearchParams]);

    const updateQueryValues = (section, newValues) => {
        setQueryValues((prev) => ({
            ...prev,
            [section]: {
                ...prev[section],
                ...(typeof newValues === 'function'
                    ? newValues(prev[section])
                    : newValues),
            },
        }));
    };

    return (
        <div className='w-full'>
            <Tabs
                tabClasses='tabs gap-1 !bg-opacity-0'
                perTabClass='tab-pill'
                queryParam='searchTab'
            >
                <Tab title='Fetch Graph' classes='space-y-4'>
                    <PaginatedGraphFetch
                        ref={graphRef}
                        queryValues={queryValues.paginatedgraphfetch}
                        setQueryValues={(vals) =>
                            updateQueryValues('paginatedgraphfetch', vals)
                        }
                        processNewNode={processNewNode}
                        addEdge={addEdge}
                    />
                </Tab>
                <Tab title='Find Paths' classes='space-y-4'>
                    <PathFindSearch
                        ref={graphRef}
                        queryValues={queryValues.pathfind}
                        setQueryValues={(vals) => updateQueryValues('pathfind', vals)}
                        processNewNode={processNewNode}
                        addEdge={addEdge}
                    />
                </Tab>
            </Tabs>
        </div>
    );
});

export default GraphSearch;
