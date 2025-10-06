import { format, parseISO } from 'date-fns';
import { ArrowLeft, ArrowRight, PlaySolid } from 'iconoir-react';
import { useEffect, useState } from 'react';
import Datepicker from 'react-tailwindcss-datepicker';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { fetchGraph } from '../../services/graphService/graphService';
import { advancedQuery } from '../../services/queryService/queryService';
import {
    LinkTreeFlattener,
    truncateText,
} from '../../utils/dashboardUtils/dashboardUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertBox from '../AlertBox/AlertBox';
import Selector from '../Selector/Selector';

export default function PaginatedGraphFetch({
    queryValues,
    setQueryValues,
    addEdges,
    addNodes,
}) {
    const [isGraphFetching, setIsGraphFetching] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentDepth, setCurrentDepth] = useState(1);
    const [pageSize, setPageSize] = useState(500);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const { navigate, navigateLink } = useCradleNavigate();
    const MAX_DEPTH = 3; // Set maximum depth to 3

    // Track if we've hit both max depth and end of pagination
    const [reachedMaxDepthAndEnd, setReachedMaxDepthAndEnd] = useState(false);

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
            // Ensure depth never exceeds MAX_DEPTH
            setCurrentDepth(Math.min(queryValues.depth || 1, MAX_DEPTH));

            // Reset reachedMaxDepthAndEnd when queryValues change
            setReachedMaxDepthAndEnd(false);
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
            const hasEntries = entries && entries.length > 0;
            const hasRelations = relations && relations.length > 0;

            setHasNextPage(has_next);

            // Check if we've reached max depth and end of pagination
            if (!has_next && currentDepth >= MAX_DEPTH) {
                setReachedMaxDepthAndEnd(true);
            } else {
                setReachedMaxDepthAndEnd(false);
            }

            // Only increment depth if we have results and currentDepth < MAX_DEPTH
            if (
                !has_next &&
                currentDepth > 0 &&
                currentDepth < MAX_DEPTH &&
                (hasEntries || hasRelations)
            ) {
                setCurrentDepth((prevDepth) => prevDepth + 1);
            }

            // If no data was returned, don't increment depth
            if (!hasEntries && !hasRelations) {
                setAlert({
                    show: true,
                    message: 'No data returned for the current parameters.',
                    color: 'yellow',
                });
                setHasNextPage(false);
                setLoading(false);
                setIsGraphFetching(false);
                return;
            }

            const flattenedEntries = LinkTreeFlattener.flatten(entries);
            let nodes = flattenedEntries.map((e) => ({
                id: String(e.id),
                degree: e.degree,
                type: e.subtype,
                label:
                    e.subtype == 'virtual'
                        ? 'virtual'
                        : truncateText(`${e.subtype}: ${e.name || e.id}`, 25),
                color: colors[e.subtype] || '#4A90E2',
            }));
            relations.forEach((r) => {
                r.source = String(r.src);
                r.target = String(r.dst);
            });
            addNodes(nodes);
            addEdges(relations);
            setAlert({ show: false });

            // Check if we need to move to the next depth
            if (!has_next && currentPage > 1 && currentDepth < MAX_DEPTH) {
                setCurrentPage(1);
                setCurrentDepth((prevDepth) => {
                    const newDepth = Math.min(prevDepth + 1, MAX_DEPTH);
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
            displayError(setAlert, navigate)(error);
            throw error;
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
            displayError(setAlert, navigate)(error);
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
        setReachedMaxDepthAndEnd(false); // Reset when search params change
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
            setCurrentDepth(1);
            setHasNextPage(true);
            setReachedMaxDepthAndEnd(false); // Reset when search params change
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
        setCurrentDepth(1);
        setHasNextPage(true);
        setReachedMaxDepthAndEnd(false); // Reset when search params change
    };

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
        // If page changes, we're definitely not at max depth + end
        setReachedMaxDepthAndEnd(false);
    };

    const handleDepthChange = (e) => {
        const newDepth = Math.min(parseInt(e.target.value, 10), MAX_DEPTH);
        setCurrentDepth(newDepth);
        setQueryValues((prev) => ({
            ...prev,
            depth: newDepth,
        }));
        setCurrentPage(1);
        setHasNextPage(true);
        setReachedMaxDepthAndEnd(false); // Reset when search params change
    };

    return (
        <div className='w-full px-2'>
            <div className='flex flex-col w-full gap-2 mb-2'>
                {/* First row - Date picker and Source node selector */}
                <div className='flex items-start w-full gap-4'>
                    <div className='flex flex-col flex-grow'>
                        <label className='text-xs text-gray-400 mb-1'>Date Range</label>
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
                                Depth (Max: {MAX_DEPTH})
                            </label>
                            <div className='flex items-center'>
                                <input
                                    type='number'
                                    min='0'
                                    max={MAX_DEPTH}
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
                                        handlePageChange(Math.max(1, currentPage - 1))
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
                                    onClick={() => handlePageChange(currentPage + 1)}
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
                        className='btn btn flex items-center'
                        disabled={
                            isGraphFetching || reachedMaxDepthAndEnd || !sourceNode
                        }
                    >
                        {isGraphFetching ? (
                            <div className='flex justify-center py-1'>
                                <div className='spinner-dot-pulse'>
                                    <div className='spinner-pulse-dot'></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <PlaySolid className='text-primary mr-1 w-4' /> Fetch
                                Page
                            </>
                        )}
                    </button>
                </div>
            </div>

            <AlertBox alert={alert} />
        </div>
    );
}
