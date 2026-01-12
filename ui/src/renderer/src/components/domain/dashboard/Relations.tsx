import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { useProfile } from '@/hooks/user/useProfile';
import { handleAPIError, parseAPIError } from '@/utils/api';
import { createDashboardLink } from '@/utils/dashboard';
import PaginationWrapper from '@components/base/Pagination/PaginationWrapper';
import SearchFilterSection from '@components/domain/search/SearchFilterSection';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { Check, Copy, Search, WarningCircle } from 'iconoir-react';
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
    const [page, setPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [inaccessibleEntities, setInaccessibleEntities] = useState<string[]>([]);
    const [isRequestingAccess, setIsRequestingAccess] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [pageSize, setPageSize] = useState(10); // Default page size

    const { profile } = useProfile();
    const { entriesApi, knowledgeGraphApi, accessApi } = useApi();

    const requestAccessMutation = useMutation({
        mutationFn: async (entities: string[]) => {
            await Promise.all(
                entities.map((entity) =>
                    accessApi.accessRequestCreate({
                        entityId: entity,
                        requestAccessRequest: {
                            entityId: entity,
                        },
                    }),
                ),
            );
        },
        meta: {
            successMessage: 'Access request submitted successfully',
        },
        onSuccess: () => {
            setInaccessibleEntities([]); // Clear inaccessible entities after request
        },
    });

    const dialogRoot = document.getElementById('portal-root');
    const router = useRouter();
    const handleError = async (err: any) => {
        const parsed = await parseAPIError(err);
        handleAPIError(parsed);
    };

    // Query for entry subtypes
    const { data: entrySubtypesData } = useQuery({
        queryKey: ['entrySubtypes'],
        queryFn: () => entriesApi.entryClassesList({}),
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to load entry subtypes',
        },
    });

    const entrySubtypes = useMemo(() => {
        return (entrySubtypesData || []).map((c: any) => c.subtype);
    }, [entrySubtypesData]);

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            setPage(1);
            performSearch(depth, 1);
        }
    };

    // Query parameters for relations search
    const relationsQueryParams = useMemo(() => {
        if (!obj.id) return null;
        return {
            src: String(obj.id),
            depth: depth,
            page: page,
            pageSize: pageSize,
            query: searchQuery || undefined,
            wildcard: true,
        };
    }, [obj.id, depth, page, pageSize, searchQuery]);

    // Query for relations
    const { data: relationsData, isPending } = useQuery({
        queryKey: [
            'graph',
            'neighbors',
            {
                src: String(obj.id),
                depth,
                page,
                pageSize,
                query: searchQuery,
                filters: entrySubtypeFilters,
            },
        ],
        queryFn: () => {
            if (entrySubtypeFilters.length === 0) {
                return knowledgeGraphApi.knowledgeGraphNeighborsRetrieve({
                    src: String(obj.id),
                    depth: depth,
                    page: page,
                    pageSize: pageSize,
                    query: searchQuery,
                    wildcard: true,
                });
            } else {
                return knowledgeGraphApi.knowledgeGraphNeighborsRetrieve({
                    src: String(obj.id),
                    depth: depth,
                    page: page,
                    pageSize: pageSize,
                    query: searchQuery,
                });
            }
        },
        enabled: !!obj.id && !!relationsQueryParams,
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch relations',
        },
    });

    // Process relations data
    useEffect(() => {
        if (relationsData) {
            setHasNextPage(relationsData.hasNext);
            // Cast results to include depth field (missing from generated types but present in API response)
            const resultsWithDepth = relationsData.results as unknown as Result[];
            if (entrySubtypeFilters.length === 0) {
                resultsWithDepth.sort((a, b) => a.depth - b.depth);
                setResults(resultsWithDepth);
            } else {
                // Filter results client-side if needed
                const filteredResults =
                    entrySubtypeFilters.length > 0
                        ? resultsWithDepth.filter((r) =>
                              entrySubtypeFilters.includes(r.subtype),
                          )
                        : resultsWithDepth;
                setResults(filteredResults);
            }
        } else {
            setResults([]);
        }
    }, [relationsData, entrySubtypeFilters]);

    // Query for inaccessible entities
    const { data: inaccessibleData } = useQuery({
        queryKey: [
            'graph',
            'inaccessible',
            {
                src: String(obj.id),
                depth,
            },
        ],
        queryFn: () =>
            knowledgeGraphApi.knowledgeGraphInaccessibleRetrieve({
                src: String(obj.id),
                depth: depth,
            }),
        enabled: !!obj.id && depth > 0,
        meta: {
            suppressNotification: true, // Don't show error for this optional check
            errorMessage: 'Failed to check inaccessible entities',
        },
    });

    const handleRequestAccess = useCallback(
        (entities: string[]) => () => {
            setIsRequestingAccess(true);
            requestAccessMutation.mutate(entities, {
                onSettled: () => {
                    setIsRequestingAccess(false);
                },
            });
        },
        [requestAccessMutation],
    );

    // Process inaccessible entities data
    useEffect(() => {
        if (
            inaccessibleData?.inaccessible &&
            inaccessibleData.inaccessible.length > 0
        ) {
            setInaccessibleEntities(inaccessibleData.inaccessible);

            // Use Alert to show inaccessible entities warning
            setAlert({
                show: true,
                message: `${inaccessibleData.inaccessible.length} related ${inaccessibleData.inaccessible.length === 1 ? 'entity is' : 'entities are'} not accessible`,
                color: 'yellow',
                button: {
                    text: 'Request Access',
                    onClick: handleRequestAccess(inaccessibleData.inaccessible),
                },
            });
        }
    }, [inaccessibleData, handleRequestAccess]);

    const performSearch = useCallback(
        (depth: number, page: number) => {
            setAlert({ ...alert, show: false });
            setInaccessibleEntities([]);
            setPage(page);
        },
        [alert],
    );

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
            .catch(() => {
                // Silently fail - user can try again
            });
    };

    const handleResultClick = (link: string) => (e: MouseEvent) => {
        e.preventDefault();
        setAlert({ ...alert, show: false });
        router.navigate({ to: link as any });
    };

    // Trigger search when page changes
    useEffect(() => {
        performSearch(depth, page);
    }, [page, depth, pageSize, performSearch]);

    // Reset to page 1 when pageSize changes
    useEffect(() => {
        setPage(1);
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
                        onCheckedChange={(value) =>
                            table.toggleAllPageRowsSelected(!!value)
                        }
                        aria-label='Select all'
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label='Select row'
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
                        <div
                            className='py-3 px-4 cursor-pointer'
                            onClick={() =>
                                router.navigate({ to: dashboardLink as any })
                            }
                        >
                            <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-primary-foreground shadow-sm ${!row.original.color ? 'bg-muted' : ''}`}
                                style={
                                    row.original.color
                                        ? {
                                              backgroundColor: row.original.color,
                                          }
                                        : undefined
                                }
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
                        <div
                            className='py-3 px-4 cursor-pointer'
                            onClick={() =>
                                router.navigate({ to: dashboardLink as any })
                            }
                        >
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
                        <div
                            className='py-3 px-4 cursor-pointer'
                            onClick={() =>
                                router.navigate({ to: dashboardLink as any })
                            }
                        >
                            <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-foreground border border-border'>
                                {row.original.depth}
                            </span>
                        </div>
                    );
                },
            },
        ],
        [createDashboardLink, router],
    );

    // Handle row selection - convert string[] to number[]
    const handleRowSelectionChange = useCallback((selectedIds: string[]) => {
        setSelectedIds(selectedIds.map((id) => Number(id)));
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
                                        title={
                                            selectedIds.length > 0
                                                ? `Copy ${selectedIds.length} selected to CSV`
                                                : 'Select items to copy'
                                        }
                                    >
                                        {isCopied ? (
                                            <Check className='w-4 h-4 text-primary' />
                                        ) : (
                                            <Copy
                                                className={
                                                    selectedIds.length > 0
                                                        ? 'text-primary'
                                                        : 'text-muted-foreground'
                                                }
                                                width={18}
                                                height={18}
                                            />
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy to CSV</TooltipContent>
                            </Tooltip>
                            <div className='h-8 w-px bg-border-border' />

                            {/* Depth Control */}
                            <div className='flex items-center gap-2 px-3 h-10 border border-border rounded-full bg-transparent'>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Input
                                            id='depth-input'
                                            type='number'
                                            min='0'
                                            max='5'
                                            className='bg-transparent text-foreground h-full w-8 outline-none text-center font-mono text-sm border-0 shadow-none p-0'
                                            value={depth}
                                            onChange={handleDepthChange}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>Copy to CSV</TooltipContent>
                                </Tooltip>
                                <div className='h-8 w-px bg-cradle-border-accent' />

                                {/* Depth Control */}
                                <div className='flex items-center gap-2 px-3 h-10 border border-cradle-border-accent rounded-full bg-transparent'>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Input
                                                id='depth-input'
                                                type='number'
                                                min='0'
                                                max='5'
                                                className='bg-transparent text-foreground h-full w-8 outline-none text-center font-mono text-sm border-0 shadow-none p-0'
                                                value={depth}
                                                onChange={handleDepthChange}
                                            />
                                        </TooltipTrigger>
                                        <TooltipContent>Depth</TooltipContent>
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
                                            {results.length}{' '}
                                            {results.length === 1
                                                ? 'result'
                                                : 'results'}
                                        </InputGroupAddon>
                                    )}
                                </InputGroup>
                            </div>
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
                <AlertComponent
                    variant={
                        alert.color === 'red' || alert.color === 'error'
                            ? 'destructive'
                            : 'default'
                    }
                >
                    <WarningCircle />
                    <AlertDescription>{alert.message}</AlertDescription>
                </AlertComponent>
            )}

            <div className='flex-grow overflow-hidden flex flex-col'>
                <div className='flex-grow overflow-auto'>
                    <DataTable
                        columns={columns}
                        data={results || []}
                        loading={isPending}
                        emptyMessage='No relations found'
                        enableRowSelection={true}
                        selectedRows={selectedIds.map((id) => String(id))}
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
