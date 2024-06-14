import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'iconoir-react';
import SearchFilterSection from '../SearchFilterSection/SearchFilterSection';
import { queryEntities } from '../../services/queryService/queryService';
import { useAuth } from '../../hooks/useAuth/useAuth';
import AlertBox from '../AlertBox/AlertBox';
import SearchResult from '../SearchResult/SearchResult';
import { useNavigate } from 'react-router-dom';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { createDashboardLink } from '../../utils/dashboardUtils/dashboardUtils';

/**
 * Dialog to search for entities
 * Opens a dialog to search for entities
 * Overlays the entire screen
 * Gives filters for entity type and entry type
 * Shows search results
 * Search can be done on enter or when pressing the search buttons
 * @param {boolean} isOpen - to show or hide the dialog
 * @param {(any) => any} onClose - function to close the dialog
 * @returns {SearchDialog}
 * @constructor
 */
export default function SearchDialog({ isOpen, onClose }) {
    const auth = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef(null);
    const [showFilters, setShowFilters] = useState(false);
    const [entityTypeFilters, setEntityTypeFilters] = useState([]);
    const [entitySubtypeFilters, setEntitySubtypeFilters] = useState([]);
    const [results, setResults] = useState(null);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const dialogRoot = document.getElementById('portal-root');
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            performSearch();
        }
    }, [isOpen]);

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            performSearch();
        }
    };

    const handleResultClick = (link) => () => {
        setAlert({ ...alert, show: false });
        onClose();
        navigate(link);
    };

    const performSearch = () => {
        setAlert({ ...alert, show: false });
        queryEntities(auth.access, searchQuery, entityTypeFilters, entitySubtypeFilters)
            .then((response) => {
                setResults(
                    response.data.map((result) => {
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
                    }),
                );
            })
            .catch(displayError(setAlert));
    };

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
                <div className='mb-4 relative'>
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
                <SearchFilterSection
                    showFilters={showFilters}
                    setShowFilters={setShowFilters}
                    entityTypeFilters={entityTypeFilters}
                    setEntityTypeFilters={setEntityTypeFilters}
                    entryTypeFilters={entitySubtypeFilters}
                    setEntryTypeFilters={setEntitySubtypeFilters}
                />
                <AlertBox alert={alert} />
                <div className='flex-grow overflow-y-auto no-scrollbar space-y-2'>
                    {results && results.length > 0 ? (
                        results
                    ) : (
                        <div className='w-full text-center text-zinc-500'>
                            No results found
                        </div>
                    )}
                </div>
            </div>
        </div>,
        dialogRoot,
    );
}
