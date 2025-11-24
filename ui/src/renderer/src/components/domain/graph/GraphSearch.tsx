import { Tab, Tabs } from '@components/layout/Tabs/Tabs';
import { TabClasses } from '@components/layout/Tabs/types';
import { addDays, format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PaginatedGraphFetch from './PaginatedGraphFetch';
import PathFindSearch from './PathFindSearch';

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

interface PathfindQuery {
    src: any;
    dst: any[];
    max_depth: number;
    startDate: string;
    endDate: string;
}

interface PaginatedGraphFetchQuery {
    src: any;
    startDate: string;
    endDate: string;
    pageSize: number;
}

interface QueryValues {
    pathfind: PathfindQuery;
    paginatedgraphfetch: PaginatedGraphFetchQuery;
}

interface GraphSearchProps {
    addNodes: (nodes: Node[]) => void;
    addEdges: (edges: Edge[]) => void;
}

export default function GraphSearch({ addNodes, addEdges }: GraphSearchProps) {
    const [searchParams, setSearchParams] = useSearchParams();

    const [queryValues, setQueryValues] = useState<QueryValues>({
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

    const updateQueryValues = (
        section: keyof QueryValues,
        newValues: any | ((prev: any) => any)
    ) => {
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
        <div className='w-full mt-2'>
            <Tabs
                tabClass={TabClasses.PILL}
                queryParam='searchTab'
            >
                <Tab title='Fetch Graph' classes='space-y-4'>
                    <PaginatedGraphFetch
                        queryValues={queryValues.paginatedgraphfetch}
                        setQueryValues={(vals) =>
                            updateQueryValues('paginatedgraphfetch', vals)
                        }
                        addNodes={addNodes}
                        addEdges={addEdges}
                    />
                </Tab>
                <Tab title='Find Paths' classes='space-y-4'>
                    <PathFindSearch
                        queryValues={queryValues.pathfind}
                        setQueryValues={(vals) => updateQueryValues('pathfind', vals)}
                        addNodes={addNodes}
                        addEdges={addEdges}
                    />
                </Tab>
            </Tabs>
        </div>
    );
}
