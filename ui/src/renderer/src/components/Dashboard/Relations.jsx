import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Check } from 'iconoir-react';
import SearchFilterSection from '../SearchFilterSection/SearchFilterSection';
import { queryEntries, advancedQuery } from '../../services/queryService/queryService';
import AlertBox from '../AlertBox/AlertBox';
import SearchResult from '../SearchResult/SearchResult';
import { useNavigate } from 'react-router-dom';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { createDashboardLink } from '../../utils/dashboardUtils/dashboardUtils';
import { getEntryClasses } from '../../services/adminService/adminService';
import Pagination from '../Pagination/Pagination';
import {
    getInaccessibleEntities,
    searchRelatedEntries,
} from '../../services/graphService/graphService';
import { requestEntityAccess } from '../../services/dashboardService/dashboardService';
import LazyPagination from '../Pagination/LazyPagination';

export default function Relations({ obj }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [depth, setDepth] = useState(0);
    const inputRef = useRef(null);
    const [showFilters, setShowFilters] = useState(false);
    const [entrySubtypeFilters, setEntrySubtypeFilters] = useState([]);
    const [results, setResults] = useState(null);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [entrySubtypes, setEntrySubtypes] = useState([]);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [inaccessibleEntities, setInaccessibleEntities] = useState([]);
    const [isRequestingAccess, setIsRequestingAccess] = useState(false);

    const dialogRoot = document.getElementById('portal-root');
    const navigate = useNavigate();
    const handleError = displayError(setAlert, navigate);
    const [isLoading, setIsLoading] = useState(false);

    const populateEntrySubtypes = () => {
        getEntryClasses()
            .then((response) => {
                if (response.status === 200) {
                    let entities = response.data;
                    setEntrySubtypes(entities.map((c) => c.subtype));
                }
            })
            .catch(handleError);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            setPage(1);
            performSearch(depth, 1);
        }
    };

    const handleResultClick = (link) => () => {
        setAlert({ ...alert, show: false });
        navigate(link);
    };

    const performSearch = (depth, page) => {
        setAlert({ ...alert, show: false });
        setIsLoading(true);
        setInaccessibleEntities([]);

        if (entrySubtypeFilters.length === 0) {
            // Use advanced query method for direct search
            searchRelatedEntries(obj.id, depth, page, {
                query: searchQuery,
                wildcard: true,
            })
                .then((response) => {
                    setHasNextPage(response.data.has_next);
                    setResults(response.data.results);
                })
                .catch(displayError(setAlert, navigate))
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            // Use standard query with filters
            searchRelatedEntries(obj.id, depth, page, {
                name: searchQuery,
                subtype:
                    entrySubtypeFilters.length === 0
                        ? entrySubtypes
                        : entrySubtypeFilters,
            })
                .then((response) => {
                    setHasNextPage(response.data.has_next);
                    setResults(response.data.results);
                })
                .catch(displayError(setAlert, navigate))
                .finally(() => {
                    setIsLoading(false);
                });
        }

        setPage(page);

        // Check for inaccessible entities
        getInaccessibleEntities(obj.id, depth)
            .then((response) => {
                if (
                    response.data.inaccessible &&
                    response.data.inaccessible.length > 0
                ) {
                    setInaccessibleEntities(response.data.inaccessible);

                    // Use AlertBox to show inaccessible entities warning
                    setAlert({
                        show: true,
                        message: `${response.data.inaccessible.length} related ${response.data.inaccessible.length === 1 ? 'entity is' : 'entities are'} not accessible`,
                        color: 'yellow',
                        button: {
                            text: 'Request Access',
                            onClick: handleRequestAccess(response.data.inaccessible),
                        },
                    });
                }
            })
            .catch((err) =>
                console.error('Error fetching inaccessible entities:', err),
            );
    };

    const handleDepthChange = (event) => {
        const value = parseInt(event.target.value, 10);
        const newDepth = isNaN(value) ? 0 : Math.max(0, Math.min(value, 5));
        setDepth(newDepth);

        if (page === 1) {
            performSearch(newDepth, 1);
        } else {
            setPage(1);
        }
    };

    const handleRequestAccess = (entities) => () => {
        setIsRequestingAccess(true);
        Promise.all(entities.map((entity) => requestEntityAccess(entity)))
            .then(() => {
                setAlert({
                    show: true,
                    message: 'Access request submitted successfully',
                    color: 'green',
                });
                setInaccessibleEntities([]); // Clear inaccessible entities after request
            })
            .catch((error) => {
                setAlert({
                    show: true,
                    message: 'Failed to request access',
                    color: 'red',
                });
            })
            .finally(() => {
                setIsRequestingAccess(false);
            });
    };

    const copyToCSV = () => {
        let csvContent = '"type","name"\n';
        if (results && results.length > 0) {
            results.forEach((result) => {
                // Escape double quotes if necessary
                const type = String(result.subtype).replace(/"/g, '""');
                const name = String(result.name).replace(/"/g, '""');
                csvContent += `"${type}","${name}"\n`;
            });
        }
        navigator.clipboard
            .writeText(csvContent)
            .then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            })
            .catch((err) => {
                console.error('Error copying CSV: ', err);
            });
    };

    useEffect(() => {
        performSearch(depth, page);
        populateEntrySubtypes();
    }, [page]);

    return (
        <div className='bg-cradle3 p-4 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col flex-1'>
            <div className='mb-4 flex items-center gap-2'>
                {/* Depth Input with Label */}
                <div className='flex flex-col'>
                    <input
                        id='depth-input'
                        type='number'
                        min='0'
                        max='5'
                        className='form-input input input-block input-ghost-primary focus:ring-0 text-white w-20'
                        placeholder='Depth'
                        value={depth}
                        onChange={handleDepthChange}
                    />
                </div>

                {/* Search Input */}
                <div className='flex-grow relative'>
                    <input
                        ref={inputRef}
                        type='text'
                        className='form-input input input-block input-ghost-primary focus:ring-0 pr-10 text-white'
                        placeholder='Search...'
                        value={searchQuery}
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        onClick={() => {
                            setPage(1);
                            performSearch(depth, page);
                        }}
                        className='absolute right-2 top-1/2 transform -translate-y-1/2 bg-transparent border-none cursor-pointer'
                    >
                        <Search />
                    </button>
                </div>
                <button
                    onClick={copyToCSV}
                    className={`btn flex items-center gap-2 transition-all duration-300 ${isCopied ? 'bg-green-800 text-white' : ''}`}
                >
                    {isCopied ? (
                        <>
                            <Check className='w-5 h-5' />
                            Copied!
                        </>
                    ) : (
                        'Copy CSV'
                    )}
                </button>
            </div>

            <SearchFilterSection
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                entrySubtypes={entrySubtypes}
                entrySubtypeFilters={entrySubtypeFilters}
                setEntrySubtypeFilters={setEntrySubtypeFilters}
            />

            <AlertBox alert={alert} />
            {isLoading ? (
                <div className='flex items-center justify-center h-full'>
                    <div className='spinner-dot-pulse spinner-xl'>
                        <div className='spinner-pulse-dot'></div>
                    </div>
                </div>
            ) : (
                <div className='flex-grow overflow-y-auto no-scrollbar space-y-2'>
                    {results && results.length > 0 ? (
                        <div>
                            <LazyPagination
                                currentPage={page}
                                hasNextPage={hasNextPage}
                                onPageChange={setPage}
                            />

                            {results.map((result) => {
                                const dashboardLink = createDashboardLink(result);
                                return (
                                    <SearchResult
                                        key={result.id}
                                        name={result.name}
                                        type={result.type}
                                        subtype={result.subtype}
                                        onClick={handleResultClick(dashboardLink)}
                                    />
                                );
                            })}

                            <LazyPagination
                                currentPage={page}
                                hasNextPage={hasNextPage}
                                onPageChange={setPage}
                            />
                        </div>
                    ) : (
                        <div className='w-full text-center text-zinc-500'>
                            No results found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
