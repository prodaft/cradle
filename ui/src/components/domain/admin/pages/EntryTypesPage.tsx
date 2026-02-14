import { ActionBarSearch } from '@/components/base/ActionBar/ActionBar';
import PageHeader from '@/components/base/PageHeader';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import AddEntryTypeDialog from '@/components/domain/admin/dialogs/AddEntryTypeDialog';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/ui/action-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/use-api';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import {
    ClockCounterClockwiseIcon,
    PencilIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import { EntryClass } from '@services/cradle/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmDeletionDialog from '../../../dialogs/base/ConfirmDeletionDialog';
import AdminPageLayout from '../AdminPageLayout';

interface EntryTypeData {
    id: string;
    subtype: string;
    count?: number;
}

export default function EntryTypesPage() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchQuery, setSearchQuery] = useState(
        () => (search as any)?.entry_types_search ?? '',
    );
    const [page, setPage] = useState((search as any)?.entry_types_page || 1);
    const [pageSize, setPageSize] = useState(
        (search as any)?.entry_types_pagesize || 20,
    );
    const { isAdmin } = useAuthState();
    const { entriesApi } = useApi();
    const queryClient = useQueryClient();
    const [addEntryTypeDialogOpen, setAddEntryTypeDialogOpen] = useState(false);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleteEntryTypeSubtypes, setBulkDeleteEntryTypeSubtypes] = useState<
        string[]
    >([]);

    const selectedEntryTypeIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

    const searchTerm = searchQuery.trim() || undefined;
    const entryTypesListFilters = {
        page,
        pageSize,
        ...(searchTerm ? { search: searchTerm } : {}),
    };
    const { data: entryTypesData, isPending } = useQuery({
        queryKey: queryKeys.entryTypes.list(entryTypesListFilters),
        queryFn: () =>
            entriesApi.entryClassesList({
                showCount: true,
                ...entryTypesListFilters,
            }),
        refetchOnWindowFocus: false,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const entryTypes = useMemo<EntryTypeData[]>(() => {
        const results = entryTypesData?.results ?? [];
        return results.map((c) => ({
            id: c.subtype,
            subtype: c.subtype,
            count: c.count,
        }));
    }, [entryTypesData?.results]);

    const handleEditClick = (entryType: EntryTypeData) => {
        router.navigate({
            to: `/manage/entry-types/${encodeURIComponent(entryType.subtype)}` as any,
        });
    };

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (subtype: string) =>
            entriesApi.entryClassesDestroy({ classSubtype: subtype }),
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.entryTypes.lists() }],
            successMessage: 'Entry type deleted successfully',
        },
    });

    const handleDeleteEntryTypes = async (entryTypeSubtypes: string[]) => {
        try {
            await Promise.all(
                entryTypeSubtypes.map((subtype) => deleteMutation.mutateAsync(subtype)),
            );
            clearSelection();
        } catch (_error) {
            // Error already handled by mutation
        }
    };

    const handleDeleteSelected = useCallback(() => {
        if (selectedEntryTypeIds.length === 0) return;
        setBulkDeleteEntryTypeSubtypes(selectedEntryTypeIds);
        setBulkDeleteDialogOpen(true);
    }, [selectedEntryTypeIds]);

    const handleEditSelected = useCallback(() => {
        if (selectedEntryTypeIds.length !== 1) return;
        const subtype = selectedEntryTypeIds[0];
        router.navigate({
            to: `/manage/entry-types/${encodeURIComponent(subtype)}` as any,
        });
    }, [selectedEntryTypeIds, router]);

    const handleViewActivitySelected = useCallback(() => {
        if (selectedEntryTypeIds.length !== 1) return;
        const subtype = selectedEntryTypeIds[0];
        router.navigate({
            to: `/manage/entry-types/${encodeURIComponent(subtype)}` as any,
            search: { tab: 'activity' } as any,
        });
    }, [selectedEntryTypeIds, router]);

    const totalPages = useMemo(
        () => Math.max(1, entryTypesData?.totalPages ?? 1),
        [entryTypesData?.totalPages],
    );

    const pageFromSearch = Number((search as any)?.entry_types_page) || 1;
    const pageSizeFromSearch = Number((search as any)?.entry_types_pagesize) || 20;
    const searchFromSearch = ((search as any)?.entry_types_search ?? '') as string;

    // Sync URL params to page state
    useEffect(() => {
        if (pageFromSearch !== page) setPage(pageFromSearch);
        if (pageSizeFromSearch !== pageSize) setPageSize(pageSizeFromSearch);
        if (searchFromSearch !== searchQuery) setSearchQuery(searchFromSearch);
    }, [
        pageFromSearch,
        pageSizeFromSearch,
        searchFromSearch,
        page,
        pageSize,
        searchQuery,
    ]);

    const handleSearchChange = useCallback(
        (value: string) => {
            setSearchQuery(value);
            setPage(1);
            const searchAny = search as any;
            const newSearch: any = {
                ...searchAny,
                entry_types_page: 1,
                entry_types_search: value.trim() || undefined,
            };
            router.navigate({
                to: location.pathname as any,
                search: newSearch as any,
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    // Handle pagination changes from DataTable
    const handlePaginationChange = useCallback(
        (pageIndex: number, newPageSize: number) => {
            const newPage = pageIndex + 1; // Convert 0-based to 1-based

            // Handle page size change
            if (newPageSize !== pageSize) {
                setPageSize(newPageSize);
                setPage(1);
                const searchAny = search as any;
                const newSearch: any = {
                    ...searchAny,
                    entry_types_page: 1,
                    entry_types_pagesize: newPageSize,
                };
                router.navigate({
                    to: location.pathname as any,
                    search: newSearch as any,
                    replace: true,
                });
            }
            // Handle page change
            else if (newPage !== page) {
                setPage(newPage);
                const searchAny = search as any;
                const newSearch: any = { ...searchAny, entry_types_page: newPage };
                router.navigate({
                    to: location.pathname as any,
                    search: newSearch as any,
                    replace: true,
                });
            }
        },
        [page, pageSize, search, router, location.pathname],
    );

    const formatCount = useCallback((count?: number) => {
        if (count === undefined || count < 0) return '0';
        if (count >= 100) return '99+';
        return String(count);
    }, []);

    const columns = useMemo<ColumnDef<EntryTypeData>[]>(
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
                    <DataTableColumnHeader column={column} label='Entry Type' />
                ),
                cell: ({ row }) => (
                    <div className='font-medium'>{row.original.subtype}</div>
                ),
            },
            {
                accessorKey: 'count',
                id: 'count',
                size: 28,
                minSize: 28,
                maxSize: 28,
                header: 'Count',
                cell: ({ row }) => (
                    <Badge variant='secondary'>{formatCount(row.original.count)}</Badge>
                ),
                enableSorting: false,
            },
        ],
        [formatCount],
    );

    const table = useReactTable({
        data: entryTypes,
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
        pageCount: totalPages,
    });

    const handleAddEntryType = () => {
        setAddEntryTypeDialogOpen(true);
    };

    const handleEntryTypeAdded = (newEntryType: EntryClass) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.entryTypes.lists() });
        if (newEntryType.subtype) {
            router.navigate({
                to: `/manage/entry-types/${encodeURIComponent(newEntryType.subtype)}` as any,
            });
        }
    };

    return (
        <AdminPageLayout>
            <div className='w-full h-full flex flex-col space-y-4'>
                <PageHeader
                    title='Entry Types'
                    description='Manage entry type classifications'
                    actions={
                        isAdmin ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={handleAddEntryType}>
                                        <Plus />
                                        Add Entry
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Create a new entry type</TooltipContent>
                            </Tooltip>
                        ) : undefined
                    }
                />
                <div className='px-4 flex-1 flex flex-col'>
                    <div className='flex-1 space-y-4'>
                        {isPending ? (
                            <div className='flex min-h-[200px] items-center justify-center'>
                                <Spinner className='size-10' />
                            </div>
                        ) : (
                            <DataTable
                                table={table}
                                showViewOptions
                                onRowClick={handleEditClick}
                                getRowHref={(entryType) =>
                                    `/manage/entry-types/${encodeURIComponent(entryType.subtype)}`
                                }
                            >
                                <ActionBarSearch
                                    placeholder='Search entry types...'
                                    value={searchQuery}
                                    onDebouncedChange={handleSearchChange}
                                    onSubmit={handleSearchChange}
                                />
                            </DataTable>
                        )}
                    </div>
                </div>
            </div>
            <ActionBar
                open={selectedEntryTypeIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {selectedEntryTypeIds.length} entry type
                    {selectedEntryTypeIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={handleEditSelected}
                        disabled={isPending || selectedEntryTypeIds.length !== 1}
                    >
                        <PencilIcon size={18} weight='bold' />
                        Edit
                    </ActionBarItem>
                    {isAdmin && (
                        <ActionBarItem
                            onClick={handleViewActivitySelected}
                            disabled={isPending || selectedEntryTypeIds.length !== 1}
                        >
                            <ClockCounterClockwiseIcon size={18} weight='bold' />
                            View Activity
                        </ActionBarItem>
                    )}
                    {isAdmin && (
                        <ActionBarItem
                            onClick={handleDeleteSelected}
                            disabled={isPending || selectedEntryTypeIds.length === 0}
                            className='text-destructive'
                        >
                            <TrashIcon size={18} weight='bold' />
                            Delete
                        </ActionBarItem>
                    )}
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose className='px-2 text-sm' onClick={clearSelection}>
                    Clear
                </ActionBarClose>
            </ActionBar>
            <AddEntryTypeDialog
                open={addEntryTypeDialogOpen}
                onOpenChange={setAddEntryTypeDialogOpen}
                onAdd={handleEntryTypeAdded}
            />
            <ConfirmDeletionDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={(open) => {
                    setBulkDeleteDialogOpen(open);
                    if (!open) {
                        setBulkDeleteEntryTypeSubtypes([]);
                    }
                }}
                onConfirm={() => {
                    handleDeleteEntryTypes(bulkDeleteEntryTypeSubtypes);
                    setBulkDeleteEntryTypeSubtypes([]);
                }}
                confirmText={
                    bulkDeleteEntryTypeSubtypes.length === 1
                        ? bulkDeleteEntryTypeSubtypes[0]
                        : `DELETE ${bulkDeleteEntryTypeSubtypes.length}`
                }
                text={`Are you sure you want to delete ${bulkDeleteEntryTypeSubtypes.length} entry type${bulkDeleteEntryTypeSubtypes.length > 1 ? 's' : ''}? This action is irreversible.`}
            />
        </AdminPageLayout>
    );
}
