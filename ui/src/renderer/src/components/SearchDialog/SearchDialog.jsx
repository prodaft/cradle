import { Search } from 'iconoir-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useApi from '../../hooks/useApi/useApi';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { getEntryClasses } from '../../services/adminService/adminService';
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
    const { queryApi } = useApi();
    const handleError = displayError(setAlert, navigate);
    const [isLoading, setIsLoading] = useState(false);

    const autoResize = (el) => {
        if (!el) return;
        el.style.height = 'auto';
        const maxH = parseInt(getComputedStyle(el).maxHeight || '0', 10);
        const newHeight = el.scrollHeight;
        if (maxH && newHeight > maxH) {
            el.style.height = `${maxH}px`;
        } else {
            el.style.height = `${newHeight}px`;
        }
    };

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
        // Enter to search; Shift+Enter to insert a newline
        if (event.key === 'Enter') {
            if (event.shiftKey) {
                return; // allow newline
            }
            event.preventDefault();
            setPage(1);
            performSearch();
        }
    };

    const handleResultClick = (link) => (e) => {
        e.preventDefault();
        setAlert({ ...alert, show: false });
        onClose();
        navigate(link, { event: e });
    };

    const performSearch = async () => {
        setAlert({ ...alert, show: false });
        setIsLoading(true);
        let searchQueries = searchQuery
            .split('\n')
            .map((q) => q.trim())
            .filter((q) => q !== '');
        if (entrySubtypeFilters.length == 0) {
            try {
                let response = await queryApi.queryAdvancedRetrieve({
                    page: page,
                    pageSize: 20,
                    query: searchQueries,
                    wildcard: true,
                });
                setTotalPages(response.totalPages);
                setResults(response.results);
            } catch (error) {
                displayError(setAlert, navigate)(error);
            } finally {
                setIsLoading(false);
            }
        } else {
            try {
                let response = await queryApi.queryList({
                    page: page,
                    pageSize: 20,
                    name: searchQueries,
                    subtype: entrySubtypeFilters,
                });

                setTotalPages(response.totalPages);
                setResults(response.results);
            } catch (error) {
                displayError(setAlert, navigate)(error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            autoResize(inputRef.current);
            performSearch();
        }
        populateEntrySubtypes();
    }, [isOpen, page]);

    useEffect(() => {
        // Keep textarea sized correctly if value changes programmatically
        if (inputRef.current) {
            autoResize(inputRef.current);
        }
    }, [searchQuery]);

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
                        <textarea
                            ref={inputRef}
                            className='form-input input input-block input-ghost-primary focus:ring-0 pr-10 text-white resize-none max-h-[20vh] overflow-auto'
                            placeholder='Search...'
                            value={searchQuery}
                            rows={1}
                            onChange={(event) => {
                                setSearchQuery(event.target.value);
                                autoResize(event.target);
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
                            <div className='w-full text-center text-zinc-400 dark:text-zinc-300'>
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
