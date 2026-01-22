import { Alert as AlertComponent, AlertDescription } from '@/components/ui/alert';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/ui/action-bar';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import useApi from '@/hooks/api/useApi';
import { handleAPIError, parseAPIError } from '@/utils/api';
import { createDashboardLink } from '@/utils/dashboard';
import {
    ActionBar as BaseActionBar,
    ActionBarSearch,
} from '@components/base/ActionBar/ActionBar';
import SearchFilterSection from '@components/domain/search/SearchFilterSection';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { CopyIcon, WarningCircleIcon } from '@phosphor-icons/react';
import {
    MouseEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { toast } from 'sonner';

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
    const [inaccessibleEntities, setInaccessibleEntities] = useState<string[]>([]);
    const [isRequestingAccess, setIsRequestingAccess] = useState(false);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [pageSize, setPageSize] = useState(10); // Default page size

    const selectedIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]).map(Number),
        [rowSelection],
    );

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

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

    const handleDepthChange = (value: string) => {
        const newDepth = parseInt(value, 10);
        setDepth(newDepth);

        if (page === 1) {
            performSearch(newDepth, 1);
        } else {
            setPage(1);
        }
    };

    const copyToCSV = useCallback(() => {
        if (!results || results.length === 0 || selectedIds.length === 0) return;

        let csvContent = '"type","name"\n';

        // Filter results based on selection
        const itemsToCopy = results.filter(
            (r) => r.id !== undefined && selectedIds.includes(r.id),
        );

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
                toast.success(
                    `Copied ${itemsToCopy.length} relation${itemsToCopy.length > 1 ? 's' : ''} to clipboard`,
                );
            })
            .catch(() => {
                toast.error('Failed to copy to clipboard');
            });
    }, [results, selectedIds]);

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
                size: 28,
                minSize: 28,
                maxSize: 28,
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
                    <DataTableColumnHeader column={column} label='Type' />
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
                    <DataTableColumnHeader column={column} label='Name' />
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
                size: 28,
                minSize: 28,
                maxSize: 28,
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Depth' />
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
        [router],
    );

    const calculatedTotalPages = hasNextPage ? page + 1 : page;

    // Handle pagination changes
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

    const table = useReactTable({
        data: results || [],
        columns,
        state: {
            rowSelection,
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
        },
        getRowId: (row, index) => String(row.id ?? index),
        onRowSelectionChange: setRowSelection,
        onPaginationChange: (updater) => {
            const currentPagination = {
                pageIndex: page - 1,
                pageSize,
            };
            const nextPagination =
                typeof updater === 'function' ? updater(currentPagination) : updater;
            handlePaginationChange(nextPagination.pageIndex, nextPagination.pageSize);
        },
        getCoreRowModel: getCoreRowModel(),
        enableRowSelection: true,
        manualPagination: true,
        pageCount: calculatedTotalPages,
    });

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
                    <WarningCircleIcon size={18} weight="bold" />
                    <AlertDescription>{alert.message}</AlertDescription>
                </AlertComponent>
            )}

            <BaseActionBar
                left={
                    <div className='flex items-center gap-3'>
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
                        <div className='flex items-center gap-2'>
                            <span className='text-sm text-muted-foreground whitespace-nowrap'>
                                Depth:
                            </span>
                            <Select
                                value={String(depth)}
                                onValueChange={handleDepthChange}
                            >
                                <SelectTrigger className='w-16 h-8'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5].map((d) => (
                                        <SelectItem key={d} value={String(d)}>
                                            {d}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
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
                {isPending ? (
                    <div className='flex min-h-[200px] items-center justify-center'>
                        <Spinner />
                    </div>
                ) : (
                    <DataTable table={table} />
                )}
            </div>

            <ActionBar
                open={selectedIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {selectedIds.length} relation
                    {selectedIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={copyToCSV}
                        disabled={isPending || selectedIds.length === 0}
                    >
                        <CopyIcon size={18} weight="bold" />
                        Copy to CSV
                    </ActionBarItem>
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose className='px-2 text-sm' onClick={clearSelection}>
                    Clear
                </ActionBarClose>
            </ActionBar>
        </div>
    );
}
