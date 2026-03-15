import { ActionBarSearch } from '@/components/base/action-bar/action-bar';
import PageHeader from '@/components/base/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/ui/action-bar';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import {
    ClockCounterClockwiseIcon,
    PencilIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import AddEntityForm from './add-entity-form';

type Entity = components['schemas']['Entity'];

interface EntityData extends Entity {
    id: number;
}

export default function EntitiesPage() {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });
    const searchAny = search as any;
    const page = Number(searchAny?.entities_page ?? 1) || 1;
    const pageSize = Number(searchAny?.entities_pagesize ?? 20) || 20;
    const searchQuery = (searchAny?.entities_search ?? '') as string;

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const { isAdmin } = useAuthState();
    const queryClient = useQueryClient();
    const [addEntityDialogOpen, setAddEntityDialogOpen] = useState(false);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleteEntityIds, setBulkDeleteEntityIds] = useState<string[]>([]);
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

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
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET('/query/', {
                params: {
                    query: {
                        type: 'entity',
                        page,
                        page_size: pageSize,
                        ...(searchTerm && { search: searchTerm }),
                    } as any,
                },
            });
            if (error) throw { response, error };
            return data;
        },
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const entities = (entitiesData?.results ?? []) as EntityData[];

    const handleEditClick = (entity: EntityData) => {
        router.navigate({ to: `/manage/entities/${entity.id}` as any });
    };

    const deleteMutation = useMutation({
        mutationFn: async (entityId: number) => {
            const { error, response } = await fetchClient.DELETE(
                '/entries/entities/{entity_id}/',
                { params: { path: { entity_id: entityId } } },
            );
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [
                { queryKey: queryKeys.entities.lists() },
                { queryKey: queryKeys.notes.apiList() },
            ],
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
            setBulkDeleteDialogOpen(false);
            setBulkDeleteEntityIds([]);
            setDeleteConfirmInput('');
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
        () => Math.max(1, entitiesData?.total_pages ?? 1),
        [entitiesData],
    );
    const handleSearchChange = useCallback(
        (value: string) => {
            router.navigate({
                to: location.pathname as any,
                search: {
                    ...searchAny,
                    entities_page: 1,
                    entities_search: value.trim() || undefined,
                } as any,
                replace: true,
            });
        },
        [searchAny, router, location.pathname],
    );

    const handlePaginationChange = useCallback(
        (pageIndex: number, newPageSize: number) => {
            const newPage = pageIndex + 1;
            if (newPageSize !== pageSize) {
                router.navigate({
                    to: location.pathname as any,
                    search: {
                        ...searchAny,
                        entities_page: 1,
                        entities_pagesize: newPageSize,
                    } as any,
                    replace: true,
                });
            } else if (newPage !== page) {
                router.navigate({
                    to: location.pathname as any,
                    search: { ...searchAny, entities_page: newPage } as any,
                    replace: true,
                });
            }
        },
        [page, pageSize, searchAny, router, location.pathname],
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
                accessorKey: 'is_public',
                id: 'is_public',
                size: 28,
                minSize: 28,
                maxSize: 28,
                header: 'Visibility',
                cell: ({ row }) => (
                    <Badge variant={row.original.is_public ? 'default' : 'secondary'}>
                        {row.original.is_public ? 'Public' : 'Private'}
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
        setAddEntityDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: queryKeys.entities.lists() });
        if (newEntity.id) {
            router.navigate({ to: `/manage/entities/${newEntity.id}` as any });
        }
    };

    return (
        <div className='w-full h-full'>
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
                        <DataTable
                            table={table}
                            showViewOptions
                            isLoading={isPending}
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
            <Dialog open={addEntityDialogOpen} onOpenChange={setAddEntityDialogOpen}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>New Entity</DialogTitle>
                        <DialogDescription>Create new entity</DialogDescription>
                    </DialogHeader>
                    <AddEntityForm onAdd={handleEntityAdded} />
                </DialogContent>
            </Dialog>
            <AlertDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={(open) => {
                    setBulkDeleteDialogOpen(open);
                    if (!open) {
                        setBulkDeleteEntityIds([]);
                        setDeleteConfirmInput('');
                    }
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {bulkDeleteEntityIds.length}{' '}
                            entit
                            {bulkDeleteEntityIds.length > 1 ? 'ies' : 'y'}? This will
                            keep their related notes but remove the links to them.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <FieldGroup className='gap-4'>
                        <Field>
                            <FieldLabel htmlFor='confirm-delete-entities'>
                                Type below to confirm
                            </FieldLabel>
                            <Input
                                id='confirm-delete-entities'
                                type='text'
                                placeholder={`Type "${
                                    bulkDeleteEntityIds.length === 1
                                        ? (() => {
                                              const entity = entities.find(
                                                  (e) =>
                                                      String(e.id) ===
                                                      bulkDeleteEntityIds[0],
                                              );
                                              return entity
                                                  ? `${entity.subtype}:${entity.name}`
                                                  : 'DELETE';
                                          })()
                                        : `DELETE ${bulkDeleteEntityIds.length}`
                                }" to confirm`}
                                value={deleteConfirmInput}
                                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                            />
                        </Field>
                    </FieldGroup>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            size='sm'
                            onClick={() => handleDeleteEntities(bulkDeleteEntityIds)}
                            disabled={
                                deleteConfirmInput !==
                                (bulkDeleteEntityIds.length === 1
                                    ? (() => {
                                          const entity = entities.find(
                                              (e) =>
                                                  String(e.id) ===
                                                  bulkDeleteEntityIds[0],
                                          );
                                          return entity
                                              ? `${entity.subtype}:${entity.name}`
                                              : 'DELETE';
                                      })()
                                    : `DELETE ${bulkDeleteEntityIds.length}`)
                            }
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
