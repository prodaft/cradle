import React, { useCallback, useEffect, useState } from 'react';
import 'tailwindcss/tailwind.css';
import { getGraphData, queryGraph } from '../../services/graphService/graphService';
import { Menu, RefreshDouble, Search } from 'iconoir-react';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    setEntryColors,
    cache,
    setCache,
    setHighlightedLinks,
    setHighlightedNodes,
    setAlert,
    notesQuery,
}) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const parseEntry = (entry) => {
        let parts = entry.split(':');
        let subtype = parts[0];
        let name = parts.length > 1 ? parts[1] : '';
        return { subtype, name };
    };

    const [query, setQuery] = useState(() => ({
        operation: searchParams.get('operation') || 'pathfind',
        params: {
            src: searchParams.get('src') || '',
            dst: searchParams.get('dst') || '',
            min_depth: parseInt(searchParams.get('min_depth')) || 1,
            max_depth: parseInt(searchParams.get('max_depth')) || 2,
        },
    }));

    useEffect(() => {
        const params = new URLSearchParams();
        params.set('operation', query.operation);
        params.set('src', query.params.src);
        params.set('dst', query.params.dst);
        params.set('min_depth', query.params.min_depth);
        params.set('max_depth', query.params.max_depth);
        setSearchParams(params);
    }, [query, setSearchParams]);

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
            let allColors = response.data.colors;
            let changes = { links: [], nodes: [] };

            let links = [];
            let nodes = [];
            let colors = {};

            let entries = flattenGraphEntries(response.data.entries);
            let source = response.data.source;

            if (!cache.nodesSet.has(source.id)) {
                cache.nodesSet.add(source.id);
                source.color =
                    source.subtype in allColors ? allColors[source.subtype] : '#888888';
                source.label = truncateText(
                    `${source.subtype}: ${source.name ? source.name : source.id}`,
                    40,
                );
                changes.nodes.push(source);
                cache.nodes[source.id] = source;
                colors[source.subtype] = source.color;
            }

            for (let e of entries) {
                if (!cache.nodesSet.has(e.id)) {
                    cache.nodesSet.add(e.id);
                    e.color = e.subtype in allColors ? allColors[e.subtype] : '#888888';
                    e.label = truncateText(
                        `${e.subtype}: ${e.name ? e.name : e.id}`,
                        40,
                    );
                    changes.nodes.push(e);
                    cache.nodes[e.id] = e;
                    colors[e.subtype] = e.color;
                }
                nodes.push(e.id);
            }

            parsedQuery.result_type = 'paths';
            response = await queryGraph(parsedQuery);
            let paths = response.data.paths;

            for (let p of paths) {
                let e = p[0];
                for (let i = 1; i < p.length; i++) {
                    let link = { source: e, target: p[i] };
                    if (!cache.linksSet.has(e + p[i])) {
                        changes.links.push(link);
                        cache.linksSet.add(e + p[i]);
                        cache.links[e + p[i]] = link;
                    } else {
                        link = cache.links[e + p[i]];
                    }
                    if (!cache.nodesSet.has(e)) {
                        cache.nodesSet.add(e);
                        changes.nodes.push({
                            id: e,
                            color: '#888888',
                            label: truncateText(`unknown: ${e}`, 40),
                        });
                        cache.nodes[e] = changes.nodes[changes.nodes.length - 1];
                        nodes.push(e);
                    }
                    links.push(link);
                    e = p[i];
                }
                if (!cache.nodesSet.has(e)) {
                    cache.nodesSet.add(e);
                    changes.nodes.push({
                        id: e,
                        color: '#888888',
                        label: truncateText(`unknown: ${e}`, 40),
                    });
                    cache.nodes[e] = changes.nodes[changes.nodes.length - 1];
                }
            }
            // Replace source and destination from ids to objects in links
            for (let link of changes.links) {
                link.source = cache.nodes[link.source];
                link.target = cache.nodes[link.target];
            }

            setGraphData((prev) => ({
                nodes: [...prev.nodes, ...changes.nodes],
                links: [...prev.links, ...changes.links],
            }));
            setCache(cache);
            setEntryColors((prev) => ({ ...prev, ...colors }));
            if (query.operation === 'pathfind') {
                setHighlightedLinks(new Set(links));
                setHighlightedNodes(new Set(nodes));
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
                                <option value='pathfind'>Pathfind</option>
                                <option value='bfs'>Breadth-First Search (BFS)</option>
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
