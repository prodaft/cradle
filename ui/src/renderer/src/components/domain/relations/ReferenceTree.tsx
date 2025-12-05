import { useAPICall } from '@/hooks';
import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { Entry, NoteRetrieve } from '@/types';
import { createDashboardLink, SubtypeHierarchy, truncateText } from '@/utils/dashboard';
import Collapsible from '@components/base/Collapsible/Collapsible';
import { useState } from 'react';
import { Link } from 'react-router-dom';

interface ReferenceTreeProps {
    note: NoteRetrieve;
    className?: string;
}

type NextPageStatus = number | 'loading' | 'end';

/**
 * References Component
 *
 * Renders the hierarchy of references for a given note, supporting pagination ("Load more..." feature).
 *
 * @param {ReferenceTreeProps} props
 * @param {Note} props.note               - The note object containing entry_classes
 * @returns {JSX.Element|null}
 */
export default function ReferenceTree({ note, className }: ReferenceTreeProps) {
    const [references, setReferences] = useState<Record<string, Entry[]>>({});
    const [nextPageStatus, setNextPageStatus] = useState<
        Record<string, NextPageStatus>
    >({});
    const { queryApi } = useApi();
    const { execute } = useAPICall();
    const { navigate, navigateLink } = useCradleNavigate();

    // If there's no entry_classes, there is nothing to display
    if (!note || !note.entries) {
        return null;
    }

    /**
     * fetchReferences - Fetches the next page of references (or first page)
     * for a particular subtype path within the given note
     *
     * @param {string} path
     * @param {boolean} nextPage
     */
    const fetchReferences = async (path: string, nextPage: boolean) => {
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
            page = nextPageStatus[path] as number;
        }

        // Mark the path as loading
        setNextPageStatus((prev) => ({
            ...prev,
            [path]: 'loading',
        }));

        const response = await execute(
            () =>
                queryApi.queryList({
                    subtype: [path],
                    referencedIn: note.id,
                    page,
                }),
            {
                errorMessage: 'Failed to fetch references',
            },
        );

        setReferences((prev) => ({
            ...prev,
            [path]: [...(references[path] || []), ...response.results],
        }));

        setNextPageStatus((prev) => ({
            ...prev,
            [path]: response.page === response.totalPages ? 'end' : response.page + 1,
        }));
    };

    return (
        <>
            {note?.entries && note.entries.length > 0 && (
                <div className={`dark:text-zinc-300 text-xs w-full pt-1 pl-3 ${className}`}>
                    <Collapsible label='References' open={false}>
                        {new SubtypeHierarchy(note.entries).convert(
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
                                                    key={`${entry.name}:${entry.subtype}`}
                                                    to={createDashboardLink(entry)}
                                                    className='text-zinc-100 dark:text-zinc-300 hover:underline hover:text-cradle2 bg-cradle3 bg-opacity-60 h-6 px-1 py-1 mx-1 my-1 rounded-md'
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
                </div>
            )}
        </>
    );
}
