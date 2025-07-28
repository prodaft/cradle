import { Search } from 'iconoir-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { getEntryClasses } from '../../services/adminService/adminService';
import { advancedQuery, queryEntries } from '../../services/queryService/queryService';
import { createDashboardLink } from '../../utils/dashboardUtils/dashboardUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertBox from '../AlertBox/AlertBox';
import Pagination from '../Pagination/Pagination';
import SearchFilterSection from '../SearchFilterSection/SearchFilterSection';
import SearchResult from '../SearchResult/SearchResult';

/**
 * Dialog to search for entries
 * Opens a dialog to search for entries
 * Overlays the entire screen
 * Gives filters for entry type and artifact type
 * Shows search results
 * Search can be done on enter or when pressing the search buttons
 * Includes an advanced search toggle that bypasses filters and uses the advanced query method
 *
 * @function SearchDialog
 * @param {Object} props - The props of the component.
 * @param {boolean} props.isOpen - to show or hide the dialog
 * @param {Function} props.onClose - function to close the dialog
 * @returns {SearchDialog}
 * @constructor
 */
export default function SearchDialog({ isOpen, onClose }) {
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef(null);
    const [showFilters, setShowFilters] = useState(false);
    const [entrySubtypeFilters, setEntrySubtypeFilters] = useState([]);
    const [results, setResults] = useState(null);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const [entrySubtypes, setEntrySubtypes] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const dialogRoot = document.getElementById('portal-root');
    const { navigate, navigateLink } = useCradleNavigate();
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
            performSearch();
            setPage(1);
        }
    };

    const handleResultClick = (link) => (e) => {
        e.preventDefault();
        setAlert({ ...alert, show: false });
        onClose();
        navigate(link, { event: e });
    };

    const performSearch = () => {
        setAlert({ ...alert, show: false });
        setIsLoading(true);

        if (entrySubtypeFilters.length == 0) {
            // Use advanced query method for direct search
            advancedQuery(searchQuery, true, page)
                .then((response) => {
                    setTotalPages(response.data.total_pages);
                    setResults(response.data.results);
                })
                .catch(displayError(setAlert, navigate))
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            // Use standard query with filters
            queryEntries(
                {
                    name: searchQuery,
                    subtype:
                        entrySubtypeFilters.length == 0
                            ? entrySubtypes
                            : entrySubtypeFilters,
                },
                page,
            )
                .then((response) => {
                    setTotalPages(response.data.total_pages);
                    setResults(response.data.results);
                })
                .catch(displayError(setAlert, navigate))
                .finally(() => {
                    setIsLoading(false);
                });
        }
    };

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            performSearch();
        }
        populateEntrySubtypes();
    }, [isOpen, page]);

    useEffect(() => {
        if (isOpen) {
            setPage(1);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className='fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50'
            onClick={() => {
                setAlert({ ...alert, show: false });
                onClose();
            }}
        >
            <div
                className='w-11/12 md:w-3/4 lg:w-1/2 h-4/5 bg-cradle3 p-8 bg-opacity-50 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col relative'
                onClick={(e) => e.stopPropagation()}
            >
                <div className='mb-4 flex items-center gap-2'>
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
                            onClick={() => performSearch()}
                            className='absolute right-2 top-1/2 transform -translate-y-1/2 bg-transparent border-none cursor-pointer'
                        >
                            <Search />
                        </button>
                    </div>

                    {/*<div className='flex items-center'>
                        <label className='flex flex-col items-center cursor-pointer'>
                            <span className='text-xs'>Advanced</span>
                            <input
                                type='checkbox'
                                checked={isAdvancedSearch}
                                onChange={toggleAdvancedSearch}
                                className='switch switch-ghost-primary'
                            />
                        </label>
                    </div>*/}
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

                                <Pagination
                                    currentPage={page}
                                    totalPages={totalPages}
                                    onPageChange={setPage}
                                />
                            </div>
                        ) : (
                            <div className='w-full text-center text-zinc-700 dark:text-zinc-500'>
                                No results found!
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>,
        dialogRoot,
    );
}
