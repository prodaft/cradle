import { useState } from 'react';
import { Link } from 'react-router-dom';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import { queryEntries } from '../../services/queryService/queryService';
import {
    createDashboardLink,
    SubtypeHierarchy,
    truncateText,
} from '../../utils/dashboardUtils/dashboardUtils';
import { displayError } from '../../utils/responseUtils/responseUtils';
import Collapsible from '../Collapsible/Collapsible';

/**
 * References Component
 *
 * Renders the hierarchy of references for a given note, supporting pagination ("Load more..." feature).
 *
 * @param {Object} props
 * @param {Note} props.note               - The note object containing entry_classes
 * @param {Object} props.references       - Map of references fetched from the backend
 * @param {Function} props.fetchReferences - Function to fetch references by subtype
 * @param {Object} props.nextPageStatus   - Tracks each subtype's "next page" or status (e.g., 'loading', 'end')
 * @returns {JSX.Element|null}
 */
export default function ReferenceTree({ note, setAlert }) {
    const [references, setReferences] = useState({});
    const [nextPageStatus, setNextPageStatus] = useState({});
    const { navigate, navigateLink } = useCradleNavigate();

    // If there's no entry_classes, there is nothing to display
    if (!note || !note.entry_classes) {
        return null;
    }

    /**
     * fetchReferences - Fetches the next page of references (or first page)
     * for a particular subtype path within the given note
     *
     * @param {string} path
     * @param {boolean} nextPage
     */
    const fetchReferences = async (path, nextPage) => {
        let page = 1;

        // If we already have references for this path, try to load next page
        if (references[path]) {
            // If we can't load more references or are already loading, stop
            if (
                !nextPage ||
                nextPageStatus[path] === 'loading' ||
                nextPageStatus[path] === 'end'
            ) {
                return;
            }
            page = nextPageStatus[path];
        }

        // Mark the path as loading
        setNextPageStatus((prev) => ({
            ...prev,
            [path]: 'loading',
        }));

        try {
            const response = await queryEntries(
                { subtype: path, referenced_in: note.id },
                page,
            );
            if (response.status === 200) {
                setReferences((prev) => ({
                    ...prev,
                    [path]: [...(references[path] || []), ...response.data.results],
                }));

                setNextPageStatus((prev) => ({
                    ...prev,
                    [path]:
                        response.data.page === response.data.total_pages
                            ? 'end'
                            : response.data.page + 1,
                }));
            }
        } catch (error) {
            displayError(setAlert, navigate)(error);
        }
    };

    return (
        <div className='dark:text-zinc-300 text-xs w-full pt-1 pl-3'>
            {note?.entry_classes && Object.keys(note.entry_classes).length > 0 && (
                <Collapsible label='References' open={false}>
                    {new SubtypeHierarchy(note.entry_classes).convert(
                        // --- Render for internal nodes (categories that have child categories) ---
                        (value, children) => (
                            <div
                                className='dark:text-zinc-300 text-xs w-full pt-1'
                                key={value}
                            >
                                <Collapsible label={value}>
                                    <div className='dark:text-zinc-300 text-xs w-full break-all flex flex-row flex-wrap justify-start items-center'>
                                        {children}
                                    </div>
                                </Collapsible>
                            </div>
                        ),
                        // --- Render for leaf nodes (concrete subtypes that reference actual entries) ---
                        (value, path) => (
                            <div
                                className='dark:text-zinc-300 text-xs w-full pt-1'
                                key={value}
                            >
                                <Collapsible
                                    label={value}
                                    onChangeCollapse={() =>
                                        fetchReferences(`${path}${value}`, false)
                                    }
                                >
                                    <div className='dark:text-zinc-300 text-xs w-full break-all flex flex-row flex-wrap justify-start items-center'>
                                        {/* Render the actual references */}
                                        {references[`${path}${value}`]?.map((entry) => (
                                            <Link
                                                subtype={entry.subtype}
                                                key={`${entry.name}:${entry.subtype}`}
                                                to={createDashboardLink(entry)}
                                                className='text-zinc-100 dark:text-zinc-300 hover:underline hover:text-cradle2 backdrop-filter bg-cradle3 bg-opacity-60 backdrop-blur-lg h-6 px-1 py-1 mx-1 my-1 rounded-md'
                                            >
                                                {truncateText(entry.name, 30)}
                                            </Link>
                                        ))}

                                        <span className='h-6 px-1 py-1 mx-1 my-1'>
                                            {/* Render pagination logic */}
                                            {nextPageStatus[`${path}${value}`] ===
                                            'loading' ? (
                                                <div className='spinner-dot-pulse spinner-sm'>
                                                    <div className='spinner-pulse-dot spinner-sm '></div>
                                                </div>
                                            ) : nextPageStatus[`${path}${value}`] !==
                                              'end' ? (
                                                <span
                                                    onClick={() =>
                                                        fetchReferences(
                                                            `${path}${value}`,
                                                            true,
                                                        )
                                                    }
                                                    className='dark:text-zinc-300 underline hover:text-cradle2 cursor-pointer'
                                                >
                                                    Load more...
                                                </span>
                                            ) : null}
                                        </span>
                                    </div>
                                </Collapsible>
                            </div>
                        ),
                    )}
                </Collapsible>
            )}
        </div>
    );
}
