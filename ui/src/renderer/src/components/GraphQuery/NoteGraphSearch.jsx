import { useState } from 'react';
import 'tailwindcss/tailwind.css';

import { ArrowLeft, ArrowRight, PlaySolid } from 'iconoir-react';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { displayError } from '../../utils/responseUtils/responseUtils';

import useApi from '../../hooks/useApi/useApi';
import {
    LinkTreeFlattener,
    truncateText,
} from '../../utils/dashboardUtils/dashboardUtils';
import AlertBox from '../AlertBox/AlertBox';

export default function NoteGraphSearch(noteId) {
    return function ({
        queryValues,
        setQueryValues,
        addEdges,
        addNodes,
    }) {
        const [isGraphFetching, setIsGraphFetching] = useState(false);
        const [currentPage, setCurrentPage] = useState(1);
        const [pageSize, setPageSize] = useState(100);
        const [totalPages, setTotalPages] = useState(null);
        const [loading, setLoading] = useState(false);
        const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
        const { notesApi } = useApi();
        const { navigate, navigateLink } = useCradleNavigate();

        const fetchGraphPage = async () => {
            setLoading(true);
            setIsGraphFetching(true);

            try {
                const response = await notesApi.notesGraphRetrieve({
                    noteId,
                    page: currentPage,
                    pageSize,
                });

                if (totalPages != response.totalPages) {
                    setTotalPages(response.totalPages);
                }
                const { entries, relations, colors } = response.results;
                const hasEntries = entries && entries.length > 0;
                const hasRelations = relations && relations.length > 0;

                // If no data was returned
                if (!hasEntries && !hasRelations) {
                    setAlert({
                        show: true,
                        message: 'No data returned for the current page.',
                        color: 'yellow',
                    });
                    setLoading(false);
                    setIsGraphFetching(false);
                    return;
                }

                const flattenedEntries = LinkTreeFlattener.flatten(entries);
                let nodes = flattenedEntries.map((e) => ({
                    id: String(e.id),
                    degree: e.degree,
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
                setAlert({ show: false });
                handlePageChange(currentPage + 1);
            } catch (error) {
                console.error(error);
                displayError(setAlert, navigate)(error);
            } finally {
                setLoading(false);
                setIsGraphFetching(false);
            }
        };

        const handlePageSizeChange = (e) => {
            const newSize = parseInt(e.target.value, 10);
            setPageSize(newSize);
        };

        const handlePageChange = (newPage) => {
            if (totalPages != null && newPage >= 1 && newPage <= totalPages) {
                setCurrentPage(newPage);
            }
        };

        const handlePageInputChange = (e) => {
            const value = parseInt(e.target.value, 10);
            if (
                totalPages != null &&
                !isNaN(value) &&
                value >= 1 &&
                value <= totalPages
            ) {
                setCurrentPage(value);
            }
        };

        return (
            <div className='px-2 mt-2 w-full'>
                <div className='flex items-end w-full justify-between gap-4'>
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
                                {[...Array(10).keys()].map((size) => (
                                    <option key={size} value={size * 100 + 100}>
                                        {size * 100 + 100}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className='flex flex-col'>
                            <label className='text-xs text-gray-400 mb-1'>
                                Current Page
                            </label>
                            <div className='flex items-center gap-2'>
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || isGraphFetching}
                                    className='btn btn-xs text-primary'
                                >
                                    <ArrowLeft className='w-3 h-3' />
                                </button>
                                <input
                                    type='number'
                                    min='1'
                                    max={totalPages == null ? 1 : totalPages}
                                    value={currentPage}
                                    onChange={handlePageInputChange}
                                    className='input py-1 px-2 text-sm w-16 text-center'
                                    disabled={isGraphFetching}
                                />
                                <span className='text-sm text-gray-500'>
                                    / {totalPages == null ? '?' : totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={
                                        currentPage === totalPages || isGraphFetching
                                    }
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
                        disabled={isGraphFetching}
                    >
                        {isGraphFetching ? (
                            <div className='flex justify-center py-1'>
                                <div className='spinner-dot-pulse'>
                                    <div className='spinner-pulse-dot'></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <PlaySolid className='text-primary mr-1 w-4' />
                                Fetch Page
                            </>
                        )}
                    </button>
                </div>

                <AlertBox alert={alert} />
            </div>
        );
    }
}