import { ActionBarSearch } from '@/components/base/ActionBar/ActionBar';
import PageHeader from '@/components/base/PageHeader';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import AddEntityDialog from '@/components/domain/admin/dialogs/AddEntityDialog';
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
import { Entity } from '@services/cradle/models';
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

interface EntityData extends Entity {
    id: number;
}

export default function EntitiesPage() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [searchQuery, setSearchQuery] = useState(
        () => (search as any)?.entities_search ?? '',
    );
    const [page, setPage] = useState((search as any)?.entities_page || 1);
    const [pageSize, setPageSize] = useState((search as any)?.entities_pagesize || 20);
    const { isAdmin } = useAuthState();
    const { queryApi, entriesApi } = useApi();
    const queryClient = useQueryClient();
    const [addEntityDialogOpen, setAddEntityDialogOpen] = useState(false);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleteEntityIds, setBulkDeleteEntityIds] = useState<string[]>([]);

    const searchAny = search as any;
    const entitiesPageParam = Number(searchAny?.entities_page ?? 1) || 1;
    const entitiesPageSizeParam = Number(searchAny?.entities_pagesize ?? 20) || 20;
    const entitiesSearchParam = (searchAny?.entities_search ?? '') as string;

    const selectedEntityIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

    // Query for entities with server-side pagination and search
    const searchTerm = searchQuery.trim() || undefined;
    const listFilters = {
        page,
        pageSize,
        ...(searchTerm ? { search: searchTerm } : {}),
    };
    const { data: entitiesData, isPending } = useQuery({
        queryKey: queryKeys.entities.list(listFilters),
        queryFn: () =>
            queryApi.queryList({
                type: 'entity',
                page,
                pageSize,
                ...(searchTerm && { search: searchTerm }),
            }),
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const entities = (entitiesData?.results as EntityData[]) ?? [];

    const handleEditClick = (entity: EntityData) => {
        router.navigate({ to: `/manage/entities/${entity.id}` as any });
    };

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (entityId: number) => entriesApi.entitiesDestroy({ entityId }),
        meta: {
            invalidateQueries: [{ queryKey: queryKeys.entities.lists() }],
            successMessage: 'Entity deleted successfully',
        },
    });

    const handleDeleteEntities = async (entityIds: string[]) => {
        try {
            await Promise.all(
                entityIds.map((entityId) =>
                    deleteMutation.mutateAsync(Number(entityId)),
                ),
            );
            clearSelection();
        } catch {
            // Error already handled by mutation meta/toasts
        }
    };

    const handleDeleteSelected = useCallback(() => {
        if (selectedEntityIds.length === 0) return;
        setBulkDeleteEntityIds(selectedEntityIds);
        setBulkDeleteDialogOpen(true);
    }, [selectedEntityIds]);

    const handleEditSelected = useCallback(() => {
        if (selectedEntityIds.length !== 1) return;
        const entityId = selectedEntityIds[0];
        router.navigate({ to: `/manage/entities/${entityId}` as any });
    }, [selectedEntityIds, router]);

    const handleViewActivitySelected = useCallback(() => {
        if (selectedEntityIds.length !== 1) return;
        const entityId = selectedEntityIds[0];
        router.navigate({
            to: `/manage/entities/${entityId}` as any,
            search: { tab: 'activity' } as any,
        });
    }, [selectedEntityIds, router]);

    // Server-side search: entities are already filtered by API
    const totalPages = useMemo(
        () => Math.max(1, entitiesData?.totalPages ?? 1),
        [entitiesData?.totalPages],
    );
    // Sync URL params to page state
    useEffect(() => {
        if (entitiesPageParam !== page) setPage(entitiesPageParam);
        if (entitiesPageSizeParam !== pageSize) setPageSize(entitiesPageSizeParam);
        if (entitiesSearchParam !== searchQuery) setSearchQuery(entitiesSearchParam);
    }, [
        entitiesPageParam,
        entitiesPageSizeParam,
        entitiesSearchParam,
        page,
        pageSize,
        searchQuery,
    ]);

    // Update URL when search changes (server-side search), reset to page 1
    const handleSearchChange = useCallback(
        (value: string) => {
            setSearchQuery(value);
            setPage(1);
            const searchAny = search as any;
            const newSearch: any = {
                ...searchAny,
                entities_page: 1,
                entities_search: value.trim() || undefined,
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
                    entities_page: 1,
                    entities_pagesize: newPageSize,
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
                const newSearch: any = { ...searchAny, entities_page: newPage };
                router.navigate({
                    to: location.pathname as any,
                    search: newSearch as any,
                    replace: true,
                });
            }
        },
        [page, pageSize, search, router, location.pathname],
    );

    const columns = useMemo<ColumnDef<EntityData>[]>(
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
                cell: ({ row }) => (
                    <Badge variant='outline'>{row.original.subtype || 'unknown'}</Badge>
                ),
            },
            {
                accessorKey: 'name',
                id: 'name',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Name' />
                ),
                cell: ({ row }) => (
                    <div className='font-medium'>{row.original.name}</div>
                ),
            },
            {
                accessorKey: 'description',
                id: 'description',
                header: 'Description',
                cell: ({ row }) => (
                    <div className='text-muted-foreground max-w-md truncate'>
                        {row.original.description || '-'}
                    </div>
                ),
                enableSorting: false,
            },
            {
                accessorKey: 'isPublic',
                id: 'isPublic',
                size: 28,
                minSize: 28,
                maxSize: 28,
                header: 'Visibility',
                cell: ({ row }) => (
                    <Badge variant={row.original.isPublic ? 'default' : 'secondary'}>
                        {row.original.isPublic ? 'Public' : 'Private'}
                    </Badge>
                ),
                enableSorting: false,
            },
        ],
        [],
    );

    const table = useReactTable({
        data: entities,
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

    const handleAddEntity = () => {
        setAddEntityDialogOpen(true);
    };

    const handleEntityAdded = (newEntity: Entity) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.entities.lists() });
        if (newEntity.id) {
            router.navigate({ to: `/manage/entities/${newEntity.id}` as any });
        }
    };

    return (
        <AdminPageLayout>
            <div className='w-full h-full flex flex-col space-y-4'>
                <PageHeader
                    title='Entities'
                    description='Manage entities and their properties'
                    actions={
                        isAdmin ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={handleAddEntity}>
                                        <Plus />
                                        Add Entity
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Create a new entity</TooltipContent>
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
                                getRowHref={(entity) => `/manage/entities/${entity.id}`}
                            >
                                <ActionBarSearch
                                    placeholder='Search entities...'
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
                open={selectedEntityIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {selectedEntityIds.length} entit
                    {selectedEntityIds.length !== 1 ? 'ies' : 'y'} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={handleEditSelected}
                        disabled={isPending || selectedEntityIds.length !== 1}
                    >
                        <PencilIcon size={18} weight='bold' />
                        Edit
                    </ActionBarItem>
                    {isAdmin && (
                        <ActionBarItem
                            onClick={handleViewActivitySelected}
                            disabled={isPending || selectedEntityIds.length !== 1}
                        >
                            <ClockCounterClockwiseIcon size={18} weight='bold' />
                            View Activity
                        </ActionBarItem>
                    )}
                    {isAdmin && (
                        <ActionBarItem
                            onClick={handleDeleteSelected}
                            disabled={isPending || selectedEntityIds.length === 0}
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
            <AddEntityDialog
                open={addEntityDialogOpen}
                onOpenChange={setAddEntityDialogOpen}
                onAdd={handleEntityAdded}
            />
            <ConfirmDeletionDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={(open) => {
                    setBulkDeleteDialogOpen(open);
                    if (!open) {
                        setBulkDeleteEntityIds([]);
                    }
                }}
                onConfirm={() => {
                    handleDeleteEntities(bulkDeleteEntityIds);
                    setBulkDeleteEntityIds([]);
                }}
                confirmText={
                    bulkDeleteEntityIds.length === 1
                        ? (() => {
                              const entity = entities.find(
                                  (e) => String(e.id) === bulkDeleteEntityIds[0],
                              );
                              return entity
                                  ? `${entity.subtype}:${entity.name}`
                                  : 'DELETE';
                          })()
                        : `DELETE ${bulkDeleteEntityIds.length}`
                }
                text={`Are you sure you want to delete ${bulkDeleteEntityIds.length} entit${bulkDeleteEntityIds.length > 1 ? 'ies' : 'y'}? This will keep their related notes but remove the links to them.`}
            />
        </AdminPageLayout>
    );
}
