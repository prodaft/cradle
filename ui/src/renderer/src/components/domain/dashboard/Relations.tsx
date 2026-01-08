import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { handleAPIError, parseAPIError } from '@/utils/api';
import { createDashboardLink } from '@/utils/dashboard';
import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { WarningCircle } from 'iconoir-react';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import SearchFilterSection from '@components/domain/search/SearchFilterSection';
import { Check, Copy, Search } from 'iconoir-react';
import {
    ChangeEvent,
    KeyboardEvent,
    MouseEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@/components/ui/input-group';
import { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/components/ui/checkbox';

interface Alert {
    show: boolean;
    message: string;
    color: string;
    button?: {
        text: string;
        onClick: () => void;
    };
}

interface Result {
    id?: number;
    name: string;
    subtype: string;
    depth: number;
    color?: string;
}

interface RelationsProps {
    obj: {
        id?: number;
        type?: string;
        [key: string]: any;
    };
}

export default function Relations({ obj }: RelationsProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [depth, setDepth] = useState(2);
    const inputRef = useRef<HTMLInputElement>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [entrySubtypeFilters, setEntrySubtypeFilters] = useState<string[]>([]);
    const [results, setResults] = useState<Result[] | null>(null);
    const [alert, setAlert] = useState<Alert>({
        show: false,
        message: '',
        color: 'red',
    });
    const [entrySubtypes, setEntrySubtypes] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [inaccessibleEntities, setInaccessibleEntities] = useState<string[]>([]);
    const [isRequestingAccess, setIsRequestingAccess] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [pageSize, setPageSize] = useState(10); // Default page size

    const { profile } = useProfile();
    const { entriesApi, knowledgeGraphApi, accessApi } = useApi();
    const { execute } = useAPICall();

    const dialogRoot = document.getElementById('portal-root');
    const { navigate, navigateLink } = useCradleNavigate();
    const handleError = (err: any) => {
        const parsed = await parseAPIError(err);
        handleAPIError(parsed);
    };
    const [isLoading, setIsLoading] = useState(false);

    const populateEntrySubtypes = () => {
        entriesApi
            .entryClassesList({})
            .then((entities) => {
                if (entities) {
                    setEntrySubtypes(entities.map((c) => c.subtype));
                }
            })
            .catch(handleError);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            setPage(1);
            performSearch(depth, 1);
        }
    };

    const performSearch = (depth: number, page: number) => {
        setAlert({ ...alert, show: false });
        setIsLoading(true);
        setInaccessibleEntities([]);

        if (entrySubtypeFilters.length === 0) {
            // Use advanced query method for direct search
            knowledgeGraphApi
                .knowledgeGraphNeighborsRetrieve({
                    src: String(obj.id),
                    depth: depth,
                    page: page,
                    pageSize: pageSize,
                    query: searchQuery,
                    wildcard: true,
                })
                .then((response) => {
                    setHasNextPage(response.hasNext);
                    // Cast results to include depth field (missing from generated types but present in API response)
                    const resultsWithDepth = response.results as unknown as Result[];
                    resultsWithDepth.sort((a, b) => a.depth - b.depth);
                    setResults(resultsWithDepth);
                })
                .catch(handleError)
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            // Use standard query with filters - note: API doesn't support subtype filtering in this endpoint
            knowledgeGraphApi
                .knowledgeGraphNeighborsRetrieve({
                    src: String(obj.id),
                    depth: depth,
                    pageSize: page,
                    query: searchQuery,
                })
                .then((response) => {
                    setHasNextPage(response.hasNext);
                    // Cast results to include depth field (missing from generated types but present in API response)
                    const resultsWithDepth = response.results as unknown as Result[];
                    // Filter results client-side if needed
                    const filteredResults =
                        entrySubtypeFilters.length > 0
                            ? resultsWithDepth.filter((r) =>
                                  entrySubtypeFilters.includes(r.subtype),
                              )
                            : resultsWithDepth;
                    setResults(filteredResults);
                })
                .catch(handleError)
                .finally(() => {
                    setIsLoading(false);
                });
        }

        setPage(page);

        // Check for inaccessible entities
        knowledgeGraphApi
            .knowledgeGraphInaccessibleRetrieve({
                src: String(obj.id),
                depth: depth,
            })
            .then((response) => {
                if (response.inaccessible && response.inaccessible.length > 0) {
                    setInaccessibleEntities(response.inaccessible);

                    // Use Alert to show inaccessible entities warning
                    setAlert({
                        show: true,
                        message: `${response.inaccessible.length} related ${response.inaccessible.length === 1 ? 'entity is' : 'entities are'} not accessible`,
                        color: 'yellow',
                        button: {
                            text: 'Request Access',
                            onClick: handleRequestAccess(response.inaccessible),
                        },
                    });
                }
            })
            .catch((err) =>
                console.error('Error fetching inaccessible entities:', err),
            );
    };

    const handleDepthChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value, 10);
        const newDepth = isNaN(value) ? 0 : Math.max(0, Math.min(value, 5));
        setDepth(newDepth);

        if (page === 1) {
            performSearch(newDepth, 1);
        } else {
            setPage(1);
        }
    };

    const handleRequestAccess = (entities: string[]) => () => {
        setIsRequestingAccess(true);
        execute(
            () =>
                Promise.all(
                    entities.map((entity) =>
                        accessApi.accessRequestCreate({
                            entityId: entity,
                            requestAccessRequest: {
                                entityId: entity,
                            },
                        }),
                    ),
                ),
            { successMessage: 'Access request submitted successfully' },
        )
            .then(() => {
                setInaccessibleEntities([]); // Clear inaccessible entities after request
            })
            .catch(() => {})
            .finally(() => {
                setIsRequestingAccess(false);
            });
    };

    const copyToCSV = () => {
        if (!results || results.length === 0) return;

        let csvContent = '"type","name"\n';

        // Filter results based on selection if any are selected
        const itemsToCopy =
            selectedIds.length > 0
                ? results.filter(
                      (r) => r.id !== undefined && selectedIds.includes(r.id),
                  )
                : results;

        if (itemsToCopy.length > 0) {
            itemsToCopy.forEach((result) => {
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
                // Optional: clear selection after copy
                // setSelectedIds([]);
            })
            .catch((err) => {
                console.error('Error copying CSV: ', err);
            });
    };

    const handleResultClick = (link: string) => (e: MouseEvent) => {
        e.preventDefault();
        setAlert({ ...alert, show: false });
        navigate(link, { event: e });
    };

    useEffect(() => {
        performSearch(depth, page);
        populateEntrySubtypes();
    }, [page]);

    useEffect(() => {
        setPage(1);
        performSearch(depth, 1);
    }, [pageSize]);

    // Memoize columns to prevent recreation on every render
    const columns = useMemo<ColumnDef<Result>[]>(
        () => [
            {
                id: 'select',
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && 'indeterminate')
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label="Select all"
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label="Select row"
                        onClick={(e) => e.stopPropagation()}
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: 'subtype',
                id: 'subtype',
                header: 'Type',
                cell: ({ row }) => {
                    const dashboardLink = createDashboardLink(row.original);
                    return (
                        <div className='py-3 px-4 cursor-pointer' onClick={navigateLink(dashboardLink)}>
                            <span
                                className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white shadow-sm'
                                style={{
                                    backgroundColor: row.original.color || '#71717a',
                                }}
                            >
                                {row.original.subtype}
                            </span>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'name',
                id: 'name',
                header: 'Name',
                cell: ({ row }) => {
                    const dashboardLink = createDashboardLink(row.original);
                    return (
                        <div className='py-3 px-4 cursor-pointer' onClick={navigateLink(dashboardLink)}>
                            {row.original.name}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'depth',
                id: 'depth',
                header: 'Depth',
                cell: ({ row }) => {
                    const dashboardLink = createDashboardLink(row.original);
                    return (
                        <div className='py-3 px-4 cursor-pointer' onClick={navigateLink(dashboardLink)}>
                            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-cradle-bg-secondary text-cradle-text-secondary border border-cradle-border-accent'>
                                {row.original.depth}
                            </span>
                        </div>
                    );
                },
            },
        ],
        [createDashboardLink, navigateLink],
    );

    // Handle row selection - convert string[] to number[]
    const handleRowSelectionChange = useCallback((selectedIds: string[]) => {
        setSelectedIds(selectedIds.map(id => Number(id)));
    }, []);

    const calculatedTotalPages = hasNextPage ? page + 1 : page;

    return (
        <div className='flex flex-col h-full gap-4'>
            <Card className='cradle-card-compact'>
                <CardContent className='p-3'>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
                    <div className='flex items-center gap-2 flex-shrink-0'>
                        {/* Copy CSV Action */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={copyToCSV}
                                    disabled={selectedIds.length === 0}
                                    variant='outline'
                                    size='icon'
                                    className='rounded-full'
                                    title={selectedIds.length > 0 ? `Copy ${selectedIds.length} selected to CSV` : 'Select items to copy'}
                                >
                                    {isCopied ? (
                                        <Check className='w-4 h-4 text-green-500' />
                                    ) : (
                                        <Copy
                                            className={selectedIds.length > 0 ? 'text-[#FF8C00]' : 'text-cradle-text-secondary'}
                                            width={18}
                                            height={18}
                                        />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Copy to CSV
                            </TooltipContent>
                        </Tooltip>
                        <div className='h-8 w-px bg-cradle-border-accent' />

                        {/* Depth Control */}
                        <div className='flex items-center gap-2 px-3 h-10 border border-cradle-border-accent rounded-full bg-transparent'>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <input
                                        id='depth-input'
                                    type='number'
                                    min='0'
                                    max='5'
                                    className='bg-transparent text-cradle-text-primary h-full w-8 outline-none text-center font-mono text-sm'
                                    value={depth}
                                    onChange={handleDepthChange}
                                />
                                </TooltipTrigger>
                                <TooltipContent>
                                    Depth
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        <div className='h-8 w-px bg-cradle-border-accent' />

                        {/* Search */}
                        <InputGroup className='min-w-[280px]'>
                            <InputGroupInput
                                ref={inputRef}
                                placeholder='Search relations...'
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                            <InputGroupAddon>
                                <Search />
                            </InputGroupAddon>
                            {results && (
                                <InputGroupAddon align='inline-end'>
                                    {results.length} {results.length === 1 ? 'result' : 'results'}
                                </InputGroupAddon>
                            )}
                        </InputGroup>
                    </div>
                </div>
                </CardContent>
            </Card>

            <SearchFilterSection
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                entrySubtypes={entrySubtypes}
                entrySubtypeFilters={entrySubtypeFilters}
                setEntrySubtypeFilters={setEntrySubtypeFilters}
            />

            {alert.show && (
                <AlertComponent variant={alert.color === 'red' || alert.color === 'error' ? 'destructive' : 'default'}>
                    <WarningCircle />
                    <AlertDescription>{alert.message}</AlertDescription>
                </AlertComponent>
            )}

            <div className='flex-grow overflow-hidden flex flex-col'>
                <div className='flex-grow overflow-auto'>
                    <DataTable
                        columns={columns}
                        data={results || []}
                        loading={isLoading}
                        emptyMessage='No relations found'
                        enableRowSelection={true}
                        selectedRows={selectedIds.map(id => String(id))}
                        onRowSelectionChange={handleRowSelectionChange}
                        manualPagination={true}
                        manualSorting={true}
                    />
                </div>
            </div>

            <PaginationWrapper
                currentPage={page}
                totalPages={calculatedTotalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                disabled={!results || results.length === 0}
                selectedCount={selectedIds.length}
                totalRows={results?.length || 0}
            />
        </div>
    );
}
