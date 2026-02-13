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
import { CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/use-api';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import {
    ClockCounterClockwiseIcon,
    GearIcon,
    PencilIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import { Entity } from '@services/cradle/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    useParams,
    useRouter,
    useRouterState,
    useSearch,
} from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Plus, Shield } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import ConfirmDeletionDialog from '../../../dialogs/base/ConfirmDeletionDialog';
import ActivityList from '../../activity/ActivityList';
import AdminPageLayout from '../AdminPageLayout';
import EntityForm from '../forms/EntityForm';
import EntityPermissionsForm from '../forms/EntityPermissionsForm';

interface EntityData extends Entity {
    id: number;
}

const ENTITY_SETTINGS_ITEMS = [
    { id: 'settings', label: 'Settings', icon: GearIcon },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'activity', label: 'Activity', icon: ClockCounterClockwiseIcon },
];

function EntitySettingsPage({ entityId }: { entityId: string }) {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });
    const tab = (search as any)?.tab;
    const { entriesApi } = useApi();
    const queryClient = useQueryClient();

    // Query for entity data
    const { data: entityData } = useQuery({
        queryKey: queryKeys.entities.detail(entityId),
        queryFn: () => entriesApi.entitiesRetrieve({ entityId: Number(entityId) }),
        enabled: !!entityId,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const handleTabClick = (tabId: string) => {
        const newSearch: any = { ...search, tab: tabId };
        router.navigate({
            to: location.pathname as any,
            search: newSearch,
            replace: true,
        });
    };

    // Auto-select first tab if no tab
    useEffect(() => {
        if (!tab && ENTITY_SETTINGS_ITEMS.length > 0) {
            const newSearch: any = { ...search, tab: ENTITY_SETTINGS_ITEMS[0].id };
            router.navigate({
                to: location.pathname as any,
                search: newSearch,
                replace: true,
            });
        }
    }, [tab, router, location.pathname, search]);

    const selectedItem = ENTITY_SETTINGS_ITEMS.find((item) => item.id === tab);
    const currentTab = selectedItem || ENTITY_SETTINGS_ITEMS[0];

    const tabDescriptions: Record<string, string> = {
        settings: 'Manage entity properties and settings',
        permissions: 'Manage user access permissions',
        activity: 'View entity activity and audit logs',
    };
    const currentDescription =
        tab && tab in tabDescriptions ? tabDescriptions[tab] : '';

    return (
        <main
            data-layout='fixed'
            className='px-4 pt-4 pb-6 flex grow flex-col overflow-hidden @7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl'
        >
            <div className='flex flex-wrap items-end justify-between gap-2'>
                <div className='space-y-1'>
                    <h2 className='text-2xl font-bold tracking-tight flex items-center gap-2'>
                        {entityData?.name || (
                            <>
                                <Spinner className='size-5' /> Loading...
                            </>
                        )}
                    </h2>
                    <p className='text-muted-foreground'>
                        {currentDescription || 'Manage entity'}
                    </p>
                </div>
            </div>
            <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 mt-4'>
                <Tabs
                    value={tab || ENTITY_SETTINGS_ITEMS[0].id}
                    onValueChange={handleTabClick}
                >
                    <TabsList className='flex-wrap h-auto'>
                        {ENTITY_SETTINGS_ITEMS.map((item) => {
                            const Icon = item.icon;
                            return (
                                <TabsTrigger key={item.id} value={item.id}>
                                    <Icon className='w-4 h-4' />
                                    {item.label}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </Tabs>
                <div className='flex w-full overflow-y-hidden p-1'>
                    <div className='flex flex-1 flex-col'>
                        {tab === 'activity' ? (
                            <div className='h-full w-full overflow-y-auto overflow-x-hidden'>
                                <ActivityList
                                    content_type='entry'
                                    objectId={entityId}
                                    name={entityData?.name}
                                />
                            </div>
                        ) : (
                            <div className='faded-bottom h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth pb-12'>
                                <CardContent className='px-0'>
                                    <div className='flex-none mb-4'>
                                        <h3 className='text-lg font-medium'>
                                            {currentTab?.label || 'Settings'}
                                        </h3>
                                        <p className='text-sm text-muted-foreground'>
                                            {currentDescription}
                                        </p>
                                    </div>
                                    <Separator
                                        data-orientation='horizontal'
                                        role='none'
                                        className='bg-border mb-4 flex-none'
                                    />
                                    {tab === 'permissions' ? (
                                        <EntityPermissionsForm
                                            entityId={Number(entityId)}
                                        />
                                    ) : (
                                        <EntityForm
                                            id={Number(entityId)}
                                            onAdd={(newEntity: Entity) => {
                                                queryClient.invalidateQueries({
                                                    queryKey:
                                                        queryKeys.entities.lists(),
                                                });
                                                queryClient.invalidateQueries({
                                                    queryKey: queryKeys.entities.detail(
                                                        String(entityId),
                                                    ),
                                                });
                                                if (newEntity.id) {
                                                    // Normally stay on the page
                                                }
                                            }}
                                        />
                                    )}
                                </CardContent>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function EntitiesPage() {
    const { id } = useParams({ strict: false });
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
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteEntityId, setDeleteEntityId] = useState<number | null>(null);
    const [addEntityDialogOpen, setAddEntityDialogOpen] = useState(false);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleteEntityIds, setBulkDeleteEntityIds] = useState<string[]>([]);

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

    const entities = ((entitiesData?.results || []) as EntityData[]) || [];

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

    const handleDelete = (entity: EntityData) => {
        setDeleteEntityId(entity.id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteEntities = async (entityIds: string[]) => {
        try {
            await Promise.all(
                entityIds.map((entityId) =>
                    deleteMutation.mutateAsync(Number(entityId)),
                ),
            );
            clearSelection();
        } catch (error) {
            // Error already handled by mutation
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
    const paginatedEntities = entities;

    // Sync URL params to page state
    useEffect(() => {
        const pageFromParams = (search as any)?.entities_page || 1;
        const pageSizeFromParams = (search as any)?.entities_pagesize || 20;
        const searchFromParams = (search as any)?.entities_search ?? '';
        if (pageFromParams !== page) setPage(pageFromParams);
        if (pageSizeFromParams !== pageSize) setPageSize(pageSizeFromParams);
        if (searchFromParams !== searchQuery) setSearchQuery(searchFromParams);
    }, [
        (search as any)?.entities_page,
        (search as any)?.entities_pagesize,
        (search as any)?.entities_search,
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
        [handleEditClick],
    );

    const table = useReactTable({
        data: paginatedEntities,
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

    if (id && id !== 'add') {
        return (
            <AdminPageLayout>
                <EntitySettingsPage entityId={id} />
            </AdminPageLayout>
        );
    }

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
            {deleteEntityId !== null &&
                (() => {
                    const entity = entities.find((e) => e.id === deleteEntityId);
                    return (
                        <ConfirmDeletionDialog
                            open={deleteDialogOpen}
                            onOpenChange={(open) => {
                                setDeleteDialogOpen(open);
                                if (!open) setDeleteEntityId(null);
                            }}
                            onConfirm={() => {
                                if (deleteEntityId !== null) {
                                    deleteMutation.mutate(deleteEntityId);
                                }
                            }}
                            confirmText={
                                entity ? `${entity.subtype}:${entity.name}` : ''
                            }
                            text='Are you sure you want to delete this entity? This will keep its related notes but remove the links to it.'
                        />
                    );
                })()}
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
