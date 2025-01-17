import React, { useCallback, useEffect, useState } from 'react';
import 'tailwindcss/tailwind.css';
import { getGraphData, queryGraph } from '../../services/graphService/graphService';
import { Menu, RefreshDouble, Search } from 'iconoir-react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useNavigate } from 'react-router-dom';
import { flattenGraphEntries, preprocessData } from '../../utils/graphUtils/graphUtils';
import Graph from '../Graph/Graph';
import {
    LinkTreeFlattener,
    truncateText,
} from '../../utils/dashboardUtils/dashboardUtils';
import Editor from '../Editor/Editor';
import { ForceGraph2D } from 'react-force-graph';
import NotesList from '../NotesList/NotesList';

export default function GraphQuery({
  graphData,
    setGraphData,
    entryColors,
    setEntryColors,
    cache,
    setCache,
    setHighlightedLinks,
    setAlert,
    notesQuery,
}) {
    const navigate = useNavigate();

    const parseEntry = (entry) => {
        let parts = entry.split(':');
        let subtype = parts[0];
        let name = parts.length > 1 ? parts[1] : '';
        return { subtype, name };
    };

    const [query, setQuery] = useState({
        operation: 'bfs',
        params: {
            src: '',
            dst: '',
            min_depth: 1,
            max_depth: 2,
        },
    });

    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Deep-copy query object
        try {
            let parsedQuery = JSON.parse(JSON.stringify(query));
            parsedQuery.params.src = parseEntry(parsedQuery.params.src);
            parsedQuery.params.dst = parseEntry(parsedQuery.params.dst);
            parsedQuery.result_type = 'vertices';

            let response = await queryGraph(parsedQuery);
            let colors = response.data.colors;
            if (!entryColors) {
                setEntryColors(colors);
            }
            let changes = { links: [], nodes: [] };

            let entries = flattenGraphEntries(response.data.entries);
            let source = response.data.source;

            if (!cache.nodes.has(source.id)) {
                cache.nodes.add(source.id);
                source.color =
                    source.subtype in colors ? colors[source.subtype] : '#888888';
                source.label = truncateText(
                    `${source.subtype}: ${source.name ? source.name : source.id}`,
                    40,
                );
                changes.nodes.push(source);
            }

            for (let e of entries) {
                if (!cache.nodes.has(e.id)) {
                    cache.nodes.add(e.id);
                    e.color = e.subtype in colors ? colors[e.subtype] : '#888888';
                    e.label = truncateText(
                        `${e.subtype}: ${e.name ? e.name : e.id}`,
                        40,
                    );
                    changes.nodes.push(e);
                }
            }

            parsedQuery.result_type = 'paths';
            response = await queryGraph(parsedQuery);
            let paths = response.data.paths;

            for (let p of paths) {
                let e = p[0];
                for (let i = 1; i < p.length; i++) {
                    if (!cache.links.has(e + p[i])) {
                        changes.links.push({ source: e, target: p[i] });
                        cache.links.add(e + p[i]);
                    }
                    if (!cache.nodes.has(e)) {
                        cache.nodes.add(e);
                        changes.nodes.push({
                            id: e,
                            color: '#888888',
                            label: truncateText(`unknown: ${e}`, 40),
                        });
                    }
                    e = p[i];
                }
                if (!cache.nodes.has(e)) {
                    cache.nodes.add(e);
                    changes.nodes.push({
                        id: e,
                        color: '#888888',
                        label: truncateText(`unknown: ${e}`, 40),
                    });
                }
            }

            setGraphData((prev) => ({
                nodes: [...prev.nodes, ...changes.nodes],
                links: [...prev.links, ...changes.links],
            }));
            setCache(cache);
            if (query.params.dst) {
              setHighlightedLinks(new Set(changes.links));
            }
        } catch (error) {
            displayError(setAlert, navigate)(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className='h-full bg-cradle3 p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col'>
                <h2 className='text-xl font-semibold mb-2'>Graph Explorer</h2>

                <div className='flex flex-col flex-1 overflow-hidden'>
                    <form
                        className='flex flex-col space-y-4 px-3 pb-2'
                        onSubmit={handleSearch}
                    >
                        <div className='flex space-x-4'>
                            <select
                                id='operation'
                                value={query.operation}
                                onChange={(e) =>
                                    setQuery({
                                        ...query,
                                        operation: e.target.value,
                                    })
                                }
                                className='input w-2/3'
                            >
                                <option value='' disabled>
                                    Select operation
                                </option>
                                <option value='bfs'>Breadth-First Search (BFS)</option>
                                <option value='pathfind'>Pathfind</option>
                            </select>

                            <input
                                type='number'
                                id='min_depth'
                                placeholder='Min Depth'
                                value={query.params.min_depth}
                                min={0}
                                onChange={(e) =>
                                    setQuery({
                                        ...query,
                                        params: {
                                            ...query.params,
                                            min_depth:
                                                parseInt(e.target.value, 10) || 0,
                                        },
                                    })
                                }
                                className='input w-1/6'
                            />

                            <input
                                type='number'
                                id='max_depth'
                                placeholder='Max Depth'
                                value={query.params.max_depth}
                                min={query.params.min_depth}
                                max={3}
                                onChange={(e) =>
                                    setQuery({
                                        ...query,
                                        params: {
                                            ...query.params,
                                            max_depth:
                                                parseInt(e.target.value, 10) ||
                                                query.params.min_depth,
                                        },
                                    })
                                }
                                className='input w-1/6'
                            />

                            <button
                                type='submit'
                                className='btn w-2/6'
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className='spinner-dot-pulse spinner-sm'>
                                        <div className='spinner-pulse-dot spinner-sm '></div>
                                    </div>
                                ) : (
                                    <>
                                        <Search /> Search
                                    </>
                                )}
                            </button>
                        </div>

                        <div className='flex space-x-4'>
                            <input
                                type='text'
                                placeholder='Source'
                                value={query.params.src}
                                onChange={(e) =>
                                    setQuery({
                                        ...query,
                                        params: {
                                            ...query.params,
                                            src: e.target.value,
                                        },
                                    })
                                }
                                className='input !max-w-full w-full'
                            />
                            <input
                                type='text'
                                disabled={query.operation in { bfs: true }}
                                placeholder='Destination'
                                value={query.params.dst}
                                onChange={(e) =>
                                    setQuery({
                                        ...query,
                                        params: {
                                            ...query.params,
                                            dst: e.target.value,
                                        },
                                    })
                                }
                                className='input !max-w-full w-full'
                            />
                        </div>
                    </form>
                    <div className='flex-1 overflow-y-auto'>
                        {notesQuery && <NotesList query={notesQuery} />}
                    </div>
                </div>
            </div>
        </>
    );
}
