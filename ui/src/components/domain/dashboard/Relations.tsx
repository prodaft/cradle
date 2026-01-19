import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';
import { Input } from '@/components/ui/input';
import useApi from '@/hooks/api/useApi';
import { handleAPIError, parseAPIError } from '@/utils/api';
import { createDashboardLink } from '@/utils/dashboard';
import {
    ActionBar,
    ActionBarButton,
    ActionBarSearch,
} from '@components/base/ActionBar/ActionBar';
import SearchFilterSection from '@components/domain/search/SearchFilterSection';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { Check, Copy, WarningCircle } from 'iconoir-react';
import {
    ChangeEvent,
    MouseEvent,
    useCallback,
    useEffect,
    useMemo,
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

    const entryClassColors = useMemo(() => {
        const colors = new Map<string, string>();
        (entrySubtypesData || []).forEach((c: any) => {
            if (c.color) colors.set(c.subtype, c.color);
        });
        return colors;
    }, [entrySubtypesData]);

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

    const performSearch = useCallback((_depth: number, page: number) => {
        setAlert((prev) => ({ ...prev, show: false }));
        setInaccessibleEntities([]);
        setPage(page);
    }, []);

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
        setAlert((prev) => ({ ...prev, show: false }));
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
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title='Type' />
                ),
                cell: ({ row }) => {
                    const dashboardLink = createDashboardLink(row.original);
                    return (
                        <div
                            className='truncate w-32 cursor-pointer'
                            onClick={() =>
                                router.navigate({ to: dashboardLink as any })
                            }
                        >
                            <Badge
                                className={`rounded-full ${!row.original.color ? 'bg-muted' : ''}`}
                                style={
                                    row.original.color
                                        ? {
                                              backgroundColor: row.original.color,
                                          }
                                        : undefined
                                }
                            >
                                {row.original.subtype}
                            </Badge>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'name',
                id: 'name',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title='Name' />
                ),
                cell: ({ row }) => {
                    const dashboardLink = createDashboardLink(row.original);
                    return (
                        <div
                            className='truncate w-48 cursor-pointer'
                            onClick={() =>
                                router.navigate({ to: dashboardLink as any })
                            }
                        >
                            <span className='truncate'>
                                {row.original.name}
                            </span>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'depth',
                id: 'depth',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} title='Depth' />
                ),
                cell: ({ row }) => {
                    const dashboardLink = createDashboardLink(row.original);
                    return (
                        <div
                            className='w-20 cursor-pointer'
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

    // Handle pagination changes from DataTable
    const handlePaginationChange = useCallback(
        (pageIndex: number, newPageSize: number) => {
            const newPage = pageIndex + 1; // Convert 0-based to 1-based

            // Handle page size change
            if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
                setPage(1);
            }
            // Handle page change
            else if (newPage !== page) {
                setPage(newPage);
            }
        },
        [page, pageSize],
    );

    return (
        <div className='flex flex-col space-y-4'>
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

            <ActionBar
                left={
                    <ActionBarSearch
                        placeholder='Search relations...'
                        value={searchQuery}
                        defaultExpanded={Boolean(searchQuery)}
                        debounceMs={300}
                        onDebouncedChange={(value) => {
                            setSearchQuery(value);
                            performSearch(depth, 1);
                        }}
                        onSubmit={(value) => {
                            setSearchQuery(value ?? '');
                            performSearch(depth, 1);
                        }}
                        onClear={() => performSearch(depth, 1)}
                    />
                }
                right={
                    <>
                        <div className='flex items-center gap-2 px-3 h-10 border border-border rounded-full bg-transparent'>
                            <span className='text-xs text-muted-foreground uppercase tracking-wide'>
                                Depth
                            </span>
                            <Input
                                id='depth-input'
                                type='number'
                                min='0'
                                max='5'
                                className='bg-transparent text-foreground h-full w-10 outline-none text-center font-mono text-sm border-0 shadow-none p-0'
                                value={depth}
                                onChange={handleDepthChange}
                            />
                        </div>
                        <ActionBarButton
                            tooltip='Copy to CSV'
                            variant='circle'
                            icon={
                                isCopied ? (
                                    <Check className='w-4 h-4 text-primary' />
                                ) : (
                                    <Copy width={18} height={18} />
                                )
                            }
                            iconActive={selectedIds.length > 0 || isCopied}
                            onClick={copyToCSV}
                            disabled={selectedIds.length === 0}
                            title={
                                selectedIds.length > 0
                                    ? `Copy ${selectedIds.length} selected to CSV`
                                    : 'Select items to copy'
                            }
                        />
                    </>
                }
            />

            <SearchFilterSection
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                entrySubtypes={entrySubtypes}
                entrySubtypeFilters={entrySubtypeFilters}
                setEntrySubtypeFilters={setEntrySubtypeFilters}
                entryClassColors={entryClassColors}
            />

            <div className='grid grid-cols-1 gap-2'>
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
                    pageCount={calculatedTotalPages}
                    initialPageIndex={page - 1}
                    initialPageSize={pageSize}
                    onPaginationChange={handlePaginationChange}
                    showPagination={true}
                />
            </div>
        </div>
    );
}
