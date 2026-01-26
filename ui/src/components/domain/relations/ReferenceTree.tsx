import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Spinner } from '@/components/ui/spinner';
import useApi from '@/hooks/api/useApi';
import { Entry, NoteRetrieve } from '@/types';
import { createDashboardLink, SubtypeHierarchy, truncateText } from '@/utils/dashboard';
import { CaretDownIcon, CaretRightIcon } from '@phosphor-icons/react';
import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';

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
    const router = useRouter();

    const fetchReferencesMutation = useMutation({
        mutationFn: async ({
            path,
            page,
            noteId,
        }: {
            path: string;
            page: number;
            noteId: string;
        }) => {
            return await queryApi.queryList({
                subtype: [path],
                referencedIn: noteId,
                page,
            });
        },
        meta: {
            errorMessage: 'Failed to fetch references',
        },
    });

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

        if (!note.id) {
            return;
        }

        const noteId = note.id;

        try {
            const response = await fetchReferencesMutation.mutateAsync({
                path,
                page,
                noteId,
            });

            setReferences((prev) => ({
                ...prev,
                [path]: [...(references[path] || []), ...response.results],
            }));

            setNextPageStatus((prev) => ({
                ...prev,
                [path]:
                    response.page === response.totalPages ? 'end' : response.page + 1,
            }));
        } catch (error) {
            // Error handled by mutation
            setNextPageStatus((prev) => ({
                ...prev,
                [path]: 'end',
            }));
        }
    };

    return (
        <>
            {note?.entries && note.entries.length > 0 && (
                <div
                    className={`text-muted-foreground text-xs w-full pt-1 pl-3 ${className}`}
                >
                    <Collapsible defaultOpen={false}>
                        <CollapsibleTrigger asChild>
                            <Button
                                variant='ghost'
                                size='sm'
                                className='group hover:text-border-primary'
                            >
                                <CaretRightIcon
                                    className='w-4 h-4 group-data-[state=open]:hidden'
                                    weight='bold'
                                />
                                <CaretDownIcon
                                    className='w-4 h-4 hidden group-data-[state=open]:block'
                                    weight='bold'
                                />
                                <span>References</span>
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className='mt-4'>
                                {new SubtypeHierarchy(note.entries).convert(
                                    // --- Render for internal nodes (categories that have child categories) ---
                                    (value, children) => (
                                        <div
                                            className='text-muted-foreground text-xs w-full pt-1'
                                            key={value}
                                        >
                                            <Collapsible>
                                                <CollapsibleTrigger asChild>
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        className='group hover:text-border-primary'
                                                    >
                                                        <CaretRightIcon
                                                            className='w-4 h-4 group-data-[state=open]:hidden'
                                                            weight='bold'
                                                        />
                                                        <CaretDownIcon
                                                            className='w-4 h-4 hidden group-data-[state=open]:block'
                                                            weight='bold'
                                                        />
                                                        <span>{value}</span>
                                                    </Button>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                    <div className='text-muted-foreground text-xs w-full break-all flex flex-row flex-wrap justify-start items-center mt-4'>
                                                        {children}
                                                    </div>
                                                </CollapsibleContent>
                                            </Collapsible>
                                        </div>
                                    ),
                                    // --- Render for leaf nodes (concrete subtypes that reference actual entries) ---
                                    (value, path) => {
                                        const fullPath = `${path}${value}`;
                                        return (
                                            <div
                                                className='text-muted-foreground text-xs w-full pt-1'
                                                key={fullPath}
                                            >
                                                <Collapsible
                                                    onOpenChange={(open) => {
                                                        if (open) {
                                                            fetchReferences(
                                                                fullPath,
                                                                false,
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <CollapsibleTrigger asChild>
                                                        <Button
                                                            variant='ghost'
                                                            size='sm'
                                                            className='group hover:text-border-primary'
                                                        >
                                                            <CaretRightIcon
                                                                className='w-4 h-4 group-data-[state=open]:hidden'
                                                                weight='bold'
                                                            />
                                                            <CaretDownIcon
                                                                className='w-4 h-4 hidden group-data-[state=open]:block'
                                                                weight='bold'
                                                            />
                                                            <span>{value}</span>
                                                        </Button>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent>
                                                        <div className='text-muted-foreground text-xs w-full break-all flex flex-row flex-wrap justify-start items-center mt-4'>
                                                            {/* Render the actual references */}
                                                            {references[fullPath]?.map(
                                                                (entry) => (
                                                                    <Link
                                                                        key={`${entry.name}:${entry.subtype}`}
                                                                        to={createDashboardLink(
                                                                            entry,
                                                                        )}
                                                                        className='text-foreground hover:underline hover:text-primary bg-muted h-6 px-1 py-1 mx-1 my-1 rounded-md'
                                                                    >
                                                                        {truncateText(
                                                                            entry.name,
                                                                            30,
                                                                        )}
                                                                    </Link>
                                                                ),
                                                            )}

                                                            <span className='h-6 px-1 py-1 mx-1 my-1'>
                                                                {/* Render pagination logic */}
                                                                {nextPageStatus[
                                                                    fullPath
                                                                ] === 'loading' ? (
                                                                    <Spinner className='size-10' />
                                                                ) : nextPageStatus[
                                                                      fullPath
                                                                  ] !== 'end' ? (
                                                                    <span
                                                                        onClick={() =>
                                                                            fetchReferences(
                                                                                fullPath,
                                                                                true,
                                                                            )
                                                                        }
                                                                        className='text-muted-foreground underline hover:text-primary cursor-pointer'
                                                                    >
                                                                        Load more...
                                                                    </span>
                                                                ) : null}
                                                            </span>
                                                        </div>
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            </div>
                                        );
                                    },
                                )}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </div>
            )}
        </>
    );
}
