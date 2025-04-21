import React, { useState, useRef, forwardRef, useEffect } from 'react';
import { PlaySolid, PauseSolid, ArrowLeft, ArrowRight } from 'iconoir-react';
import Datepicker from 'react-tailwindcss-datepicker';
import { format, parseISO } from 'date-fns';
import { fetchGraph } from '../../services/graphService/graphService';
import {
    LinkTreeFlattener,
    truncateText,
} from '../../utils/dashboardUtils/dashboardUtils';
import AlertBox from '../AlertBox/AlertBox';
import Selector from '../Selector/Selector';
import { advancedQuery } from '../../services/queryService/queryService';

const PaginatedGraphFetch = forwardRef(
    ({ queryValues, setQueryValues, processNewNode, addEdge }, graphRef) => {
        const [isGraphFetching, setIsGraphFetching] = useState(false);
        const [currentPage, setCurrentPage] = useState(1);
        const [currentDepth, setCurrentDepth] = useState(0);
        const [pageSize, setPageSize] = useState(250);
        const [hasNextPage, setHasNextPage] = useState(true);
        const [loading, setLoading] = useState(false);
        const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

        // Define local states for source node and date range.
        const [sourceNode, setSourceNode] = useState(null);
        const [dateRange, setDateRange] = useState({
            startDate: format(
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                'yyyy-MM-dd',
            ),
            endDate: format(new Date(), 'yyyy-MM-dd'),
        });

        // Initialize local states from queryValues, if provided.
        useEffect(() => {
            if (queryValues) {
                setSourceNode(queryValues.src || null);
                setDateRange({
                    startDate:
                        queryValues.startDate ||
                        format(
                            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                            'yyyy-MM-dd',
                        ),
                    endDate: queryValues.endDate || format(new Date(), 'yyyy-MM-dd'),
                });
                setPageSize(queryValues.pageSize || 250);
                setCurrentDepth(queryValues.depth || 0);
            }
        }, [queryValues]);

        const fetchGraphPage = async () => {
            if (!sourceNode) {
                setAlert({
                    show: true,
                    message: 'Please select a source node before fetching.',
                    color: 'red',
                });
                return;
            }
            setLoading(true);
            setIsGraphFetching(true);
            let has_next = false;

            try {
                // Include depth parameter in the request
                const response = await fetchGraph(
                    currentPage,
                    pageSize,
                    dateRange.startDate,
                    dateRange.endDate,
                    sourceNode?.value, // Source node ID
                    currentDepth, // Adding depth parameter
                );

                has_next = response.data.has_next;
                const { entries, relations, colors } = response.data.results;

                setHasNextPage(has_next);
                if (!has_next && currentDepth < 5)
                    setCurrentDepth((prevDepth) => prevDepth + 1);
                const flattenedEntries = LinkTreeFlattener.flatten(entries);
                let changes = [];

                // Process nodes: add new nodes and update their styles
                for (let e of flattenedEntries) {
                    if (!graphRef.current.hasElementWithId(e.id)) {
                        e.label = truncateText(`${e.subtype}: ${e.name || e.id}`, 25);
                        e.color = colors[e.subtype];
                        e.location = e.location || [
                            Math.floor(Math.random() * 50),
                            Math.floor(Math.random() * 50),
                        ];
                        const node = {
                            group: 'nodes',
                            data: {
                                ...e,
                                originalX: e.location[0],
                                originalY: e.location[1],
                            },
                            position: { x: e.location[0], y: e.location[1] },
                        };
                        changes.push(node);
                        processNewNode(e);
                    }
                }

                graphRef.current.add(changes);

                changes = [];
                let edgeCount = 0;
                for (let relation of relations) {
                    // Only add edges if both source and destination nodes are in the graph.
                    if (
                        !graphRef.current.hasElementWithId(relation.src) ||
                        !graphRef.current.hasElementWithId(relation.dst)
                    ) {
                        continue;
                    }
                    if (!graphRef.current.hasElementWithId(relation.id)) {
                        const link = {
                            group: 'edges',
                            data: {
                                source: relation.src,
                                target: relation.dst,
                                created_at: relation.created_at,
                                last_seen: relation.last_seen,
                                id: relation.id,
                            },
                        };
                        changes.push(link);
                        edgeCount += 1;
                    }
                }
                graphRef.current.add(changes);
                graphRef.current.layout({ name: 'preset', animate: true });
                addEdge(edgeCount);
                graphRef.current.fit(graphRef.current.elements(), 100);
                setAlert({ show: false });

                // Check if we need to move to the next depth
                if (!has_next && currentPage > 1) {
                    setCurrentPage(1);
                    setCurrentDepth((prevDepth) => {
                        const newDepth = prevDepth + 1;
                        // Update queryValues with the new depth
                        setQueryValues((prev) => ({
                            ...prev,
                            depth: newDepth,
                        }));
                        return newDepth;
                    });
                    setHasNextPage(true); // Reset hasNextPage for the new depth
                } else if (has_next) {
                    setCurrentPage(currentPage + 1);
                }
            } catch (error) {
                setAlert({
                    show: true,
                    message: error.message,
                    color: 'red',
                });
            } finally {
                setLoading(false);
                setIsGraphFetching(false);
            }
        };

        const fetchEntries = async (q) => {
            try {
                const results = await advancedQuery(q, true);
                if (results.status === 200) {
                    return results.data.results.map((alias) => ({
                        value: alias.id,
                        label: `${alias.subtype}:${alias.name}`,
                    }));
                } else {
                    setAlert({
                        show: true,
                        message: results.error || 'An error occurred',
                        color: 'red',
                    });
                    return [];
                }
            } catch (error) {
                setAlert({
                    show: true,
                    message: error.message,
                    color: 'red',
                });
                return [];
            }
        };

        const handlePageSizeChange = (e) => {
            const newSize = parseInt(e.target.value, 10);
            setPageSize(newSize);
            setQueryValues((prev) => ({
                ...prev,
                pageSize: newSize,
            }));
            setCurrentPage(1);
            setHasNextPage(true);
        };

        const handleDateRangeChange = (value) => {
            if (value.startDate && value.endDate) {
                const newRange = {
                    startDate: format(value.startDate, "yyyy-MM-dd'T'HH:mm"),
                    endDate: format(value.endDate, "yyyy-MM-dd'T'HH:mm"),
                };
                setDateRange(newRange);
                // Update queryValues with the new date range.
                setQueryValues((prev) => ({
                    ...prev,
                    startDate: newRange.startDate,
                    endDate: newRange.endDate,
                }));
                // Reset pagination when date range changes.
                setCurrentPage(1);
                setCurrentDepth(0);
                setHasNextPage(true);
            }
        };

        const handleSourceChange = (selected) => {
            setSourceNode(selected);
            // Update queryValues with the new source node.
            setQueryValues((prev) => ({
                ...prev,
                src: selected,
            }));
            // Reset pagination and depth when source changes
            setCurrentPage(1);
            setCurrentDepth(0);
            setHasNextPage(true);
        };

        const handlePageChange = (newPage) => {
            setCurrentPage(newPage);
        };

        const handleDepthChange = (e) => {
            const newDepth = parseInt(e.target.value, 10);
            setCurrentDepth(newDepth);
            setQueryValues((prev) => ({
                ...prev,
                depth: newDepth,
            }));
            setCurrentPage(1);
            setHasNextPage(true);
        };

        return (
            <div className='p-2 mt-2 w-full'>
                <div className='flex flex-col w-full gap-2 mb-2'>
                    {/* First row - Date picker and Source node selector */}
                    <div className='flex items-start w-full gap-4'>
                        <div className='flex flex-col flex-grow'>
                            <label className='text-xs text-gray-400 mb-1'>
                                Date Range
                            </label>
                            <Datepicker
                                value={{
                                    startDate: parseISO(dateRange.startDate),
                                    endDate: parseISO(dateRange.endDate),
                                }}
                                onChange={handleDateRangeChange}
                                inputClassName='input input-block py-1 px-2 text-sm flex-grow !max-w-full w-full'
                                toggleClassName='hidden'
                                disabled={isGraphFetching}
                            />
                        </div>

                        <div className='flex flex-col w-72'>
                            <label className='text-xs text-gray-400 mb-1'>
                                Source Node
                            </label>
                            <Selector
                                value={sourceNode}
                                onChange={handleSourceChange}
                                fetchOptions={fetchEntries}
                                isMulti={false}
                                placeholder='Select source (optional)'
                                className='text-sm'
                                disabled={isGraphFetching}
                            />
                        </div>
                    </div>

                    {/* Second row - Page size, depth control, current page indicator and fetch button */}
                    <div className='flex items-end w-full justify-between'>
                        <div className='flex items-center gap-4'>
                            <div className='flex flex-col'>
                                <label className='text-xs text-gray-400 mb-1'>
                                    Page Size
                                </label>
                                <select
                                    value={pageSize}
                                    onChange={handlePageSizeChange}
                                    className='input py-1 px-2 text-sm w-24'
                                    disabled={isGraphFetching}
                                >
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={250}>250</option>
                                    <option value={500}>500</option>
                                </select>
                            </div>

                            <div className='flex flex-col'>
                                <label className='text-xs text-gray-400 mb-1'>
                                    Depth
                                </label>
                                <div className='flex items-center'>
                                    <input
                                        type='number'
                                        min='0'
                                        value={currentDepth}
                                        onChange={handleDepthChange}
                                        className='input py-1 px-2 text-sm w-16'
                                        disabled={isGraphFetching}
                                    />
                                </div>
                            </div>

                            <div className='flex flex-col h-full'>
                                <label className='text-xs text-gray-400 mb-1'>
                                    Page Navigation
                                </label>
                                <div className='flex items-center'>
                                    <button
                                        onClick={() =>
                                            handlePageChange(
                                                Math.max(1, currentPage - 1),
                                            )
                                        }
                                        disabled={currentPage === 1 || isGraphFetching}
                                        className='btn btn-xs text-primary mr-1'
                                    >
                                        <ArrowLeft className='w-3 h-3' />
                                    </button>
                                    <span className='text-sm font-medium mx-2'>
                                        {currentPage}
                                    </span>
                                    <button
                                        onClick={() =>
                                            handlePageChange(currentPage + 1)
                                        }
                                        disabled={!hasNextPage || isGraphFetching}
                                        className='btn btn-xs text-primary'
                                    >
                                        <ArrowRight className='w-3 h-3' />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type='button'
                            onClick={fetchGraphPage}
                            className='btn btn flex items-center tooltip tooltip-top'
                            data-tooltip='Fetch graph data'
                            disabled={loading && !isGraphFetching && hasNextPage}
                        >
                            {isGraphFetching ? (
                                <div className='flex justify-center py-1'>
                                    <div className='spinner-dot-pulse'>
                                        <div className='spinner-pulse-dot'></div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <PlaySolid className='text-primary mr-1 w-4' />{' '}
                                    Fetch Page
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <AlertBox alert={alert} />
            </div>
        );
    },
);

export default PaginatedGraphFetch;
