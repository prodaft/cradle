import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {NavArrowDown, Search} from 'iconoir-react';
import SearchFilterSection from "../SearchFilterSection/SearchFilterSection";
import {queryEntities} from "../../services/queryService/queryService";
import {useAuth} from "../../hooks/useAuth/useAuth";
import AlertBox from "../AlertBox/AlertBox";
import SearchResult from "../SearchResult/SearchResult";
import {useNavigate} from "react-router-dom";
import { displayError } from '../../utils/responseUtils/responseUtils';
import pluralize from 'pluralize';

/**
 * Dialog to search for entities
 * Opens a dialog to search for entities
 * Overlays the entire screen
 * Gives filters for entity type and entry type
 * Shows search results
 * Search can be done on enter or when pressing the search buttons
 * @param isOpen - boolean to show or hide the dialog
 * @param onClose - function to close the dialog
 * @returns {SearchDialog: React.ReactPortal|null}
 * @constructor
 */
export default function SearchDialog({ isOpen, onClose }) {
    const auth = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const inputRef = useRef(null);
    const [showFilters, setShowFilters] = useState(false);
    const [entityTypeFilters, setEntityTypeFilters] = useState([]);
    const [entitySubtypeFilters, setEntitySubtypeFilters] = useState([]);
    const [results, setResults] = useState([]);
    const [error, setError] = useState("");
    const [errorColor, setErrorColor] = useState("red");
    const dialogRoot = document.getElementById('portal-root');
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            performSearch();
        }
    };

    const handleResultClick = (link) => () => {
        setError("");
        onClose();
        navigate(link);
    }


    const performSearch = () => {
        setError("");
        queryEntities(auth.access, searchQuery, entityTypeFilters, entitySubtypeFilters)
            .then((response) => {
                console.log('Search results:', response.data);
                setResults(response.data.map((result) => (
                    <SearchResult name={result.name} type={result.type} subtype={result.subtype} onClick={handleResultClick(`/dashboards/${pluralize(result.type)}/${encodeURIComponent(result.name)}${result.subtype ? `?subtype=${result.subtype}` : ``}`)}/>
                )));
            })
            .catch(displayError(setError, setErrorColor));
    }

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={()=>{setError(""); onClose();}}>
            <div
                className="w-11/12 md:w-3/4 lg:w-1/2 h-4/5 bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl flex flex-col relative"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 relative">
                    <input
                        ref={inputRef}
                        type="text"
                        className="input input-block input-ghost-primary focus:ring-0 pr-10"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                        }}
                        onKeyDown={handleKeyDown}
                    />
                    <button
                        onClick={()=>performSearch()}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-transparent border-none cursor-pointer"
                    >
                        <Search/>
                    </button>
                </div>
                <SearchFilterSection
                    showFilters={showFilters} setShowFilters={setShowFilters}
                    entityTypeFilters={entityTypeFilters} setEntityTypeFilters={setEntityTypeFilters}
                    entryTypeFilters={entitySubtypeFilters} setEntryTypeFilters={setEntitySubtypeFilters} />
                {error && (<AlertBox title={error} color={errorColor} />)}
                <div className="flex-grow overflow-y-auto no-scrollbar space-y-2">
                    {results}
                </div>
            </div>
        </div>,
        dialogRoot
    );
}
