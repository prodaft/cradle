import { ActionBarSearch } from '@/components/base/action-bar-controls/action-bar-controls';
import PageHeader from '@/components/base/page-header';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/custom/action-bar';
import { DataTable } from '@/components/custom/data-table/data-table';
import { DataTableColumnHeader } from '@/components/custom/data-table/data-table-column-header';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
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
type EntityRow = Entity & { id: number };

export default function EntitiesList() {
    useDockPanelTab({ title: 'Manage: Entities', icon: 'manage-entities' });
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false }) as any;
    const page = Number(search?.entities_page ?? 1) || 1;
    const pageSize = Number(search?.entities_pagesize ?? 20) || 20;
    const applied = (search?.entities_search ?? '') as string;

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const { isAdmin } = useAuthState();
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [confirmText, setConfirmText] = useState('');

    const checkedIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

    const trimmed = applied.trim();
    const listFilters = {
        page,
        pageSize,
        ...(trimmed ? { search: trimmed } : {}),
    };
    const listQuery = useMemo(
        () => ({
            type: 'entity' as const,
            page,
            page_size: pageSize,
            ...(trimmed ? { search: trimmed } : {}),
        }),
        [page, pageSize, trimmed],
    );
    const { data: entitiesPage, isPending } = useQuery({
        queryKey: queryKeys.entities.list(listFilters),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET('/query/', {
                params: { query: listQuery },
            });
            if (error) throw { response, error };
            return data;
        },
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const rows = (entitiesPage?.results ?? []) as EntityRow[];

    const openEntity = (item: EntityRow) => {
        router.navigate({ to: `/manage/entities/${item.id}` as any });
    };

    const deleteEntity = useMutation({
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

    const deleteEntities = async (entityIds: string[]) => {
        try {
            await Promise.all(
                entityIds.map((entityId) => deleteEntity.mutateAsync(Number(entityId))),
            );
            clearSelection();
            setIsDeleteOpen(false);
            setPendingDeleteIds([]);
            setConfirmText('');
        } catch {
            // Error already handled by mutation meta/toasts
        }
    };

    const confirmDelete = useCallback(() => {
        if (checkedIds.length === 0) return;
        setPendingDeleteIds(checkedIds);
        setIsDeleteOpen(true);
    }, [checkedIds]);

    const editSelected = useCallback(() => {
        if (checkedIds.length !== 1) return;
        const entityId = checkedIds[0];
        router.navigate({ to: `/manage/entities/${entityId}` as any });
    }, [checkedIds, router]);

    const viewActivity = useCallback(() => {
        if (checkedIds.length !== 1) return;
        const entityId = checkedIds[0];
        router.navigate({
            to: `/manage/entities/${entityId}` as any,
            search: { tab: 'activity' } as any,
        });
    }, [checkedIds, router]);

    const totalPages = useMemo(
        () => Math.max(1, entitiesPage?.total_pages ?? 1),
        [entitiesPage],
    );
    const applySearch = useCallback(
        (value: string) => {
            router.navigate({
                to: location.pathname as any,
                search: {
                    ...search,
                    entities_page: 1,
                    entities_search: value.trim() || undefined,
                } as any,
                replace: true,
            });
        },
        [search, router, location.pathname],
    );

    const paginate = useCallback(
        (pageIndex: number, size: number) => {
            const target = pageIndex + 1;
            if (size !== pageSize) {
                router.navigate({
                    to: location.pathname as any,
                    search: {
                        ...search,
                        entities_page: 1,
                        entities_pagesize: size,
                    } as any,
                    replace: true,
                });
            } else if (target !== page) {
                router.navigate({
                    to: location.pathname as any,
                    search: ((prev: any) => ({
                        ...prev,
                        entities_page: target,
                    })) as any,
                    replace: true,
                });
            }
        },
        [page, pageSize, search, router, location.pathname],
    );

    const columns = useMemo<ColumnDef<EntityRow>[]>(
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
                meta: { label: 'Type' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Type' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return <Badge variant='outline'>{item.subtype || 'unknown'}</Badge>;
                },
            },
            {
                accessorKey: 'name',
                id: 'name',
                meta: { label: 'Name' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Name' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return <div className='font-medium'>{item.name}</div>;
                },
            },
            {
                accessorKey: 'description',
                id: 'description',
                meta: { label: 'Description' },
                header: 'Description',
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <div className='text-muted-foreground max-w-md truncate'>
                            {item.description || '-'}
                        </div>
                    );
                },
                enableSorting: false,
            },
            {
                accessorKey: 'is_public',
                id: 'is_public',
                meta: { label: 'Visibility' },
                size: 28,
                minSize: 28,
                maxSize: 28,
                header: 'Visibility',
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <Badge variant={item.is_public ? 'default' : 'secondary'}>
                            {item.is_public ? 'Public' : 'Private'}
                        </Badge>
                    );
                },
                enableSorting: false,
            },
        ],
        [],
    );

    const table = useReactTable({
        data: rows,
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
            const current = {
                pageIndex: page - 1,
                pageSize,
            };
            const next = typeof updater === 'function' ? updater(current) : updater;
            paginate(next.pageIndex, next.pageSize);
        },
        getCoreRowModel: getCoreRowModel(),
        enableRowSelection: true,
        manualPagination: true,
        pageCount: totalPages,
    });

    const openAddDialog = () => {
        setIsAddOpen(true);
    };

    const handleCreated = (entity: Entity) => {
        setIsAddOpen(false);
        queryClient.invalidateQueries({ queryKey: queryKeys.entities.lists() });
        if (entity.id) {
            router.navigate({ to: `/manage/entities/${entity.id}` as any });
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
                                    <Button onClick={openAddDialog}>
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
                            onRowClick={openEntity}
                            getRowHref={(item) => `/manage/entities/${item.id}`}
                        >
                            <ActionBarSearch
                                placeholder='Search entities...'
                                value={applied}
                                debounceMs={300}
                                onDebouncedChange={applySearch}
                                onSubmit={applySearch}
                                onClear={() => applySearch('')}
                            />
                        </DataTable>
                    </div>
                </div>
            </div>
            <ActionBar
                open={checkedIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {checkedIds.length} entit
                    {checkedIds.length !== 1 ? 'ies' : 'y'} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={editSelected}
                        disabled={isPending || checkedIds.length !== 1}
                    >
                        <PencilIcon size={18} weight='bold' />
                        Edit
                    </ActionBarItem>
                    {isAdmin && (
                        <ActionBarItem
                            onClick={viewActivity}
                            disabled={isPending || checkedIds.length !== 1}
                        >
                            <ClockCounterClockwiseIcon size={18} weight='bold' />
                            View Activity
                        </ActionBarItem>
                    )}
                    {isAdmin && (
                        <ActionBarItem
                            onClick={confirmDelete}
                            disabled={isPending || checkedIds.length === 0}
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
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>New Entity</DialogTitle>
                        <DialogDescription>Create new entity</DialogDescription>
                    </DialogHeader>
                    <AddEntityForm onAdd={handleCreated} />
                </DialogContent>
            </Dialog>
            <AlertDialog
                open={isDeleteOpen}
                onOpenChange={(open) => {
                    setIsDeleteOpen(open);
                    if (!open) {
                        setPendingDeleteIds([]);
                        setConfirmText('');
                    }
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {pendingDeleteIds.length}{' '}
                            entit
                            {pendingDeleteIds.length > 1 ? 'ies' : 'y'}? This will keep
                            their related notes but remove the links to them.
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
                                    pendingDeleteIds.length === 1
                                        ? (() => {
                                              const row = rows.find(
                                                  (e) =>
                                                      String(e.id) ===
                                                      pendingDeleteIds[0],
                                              );
                                              return row
                                                  ? `${row.subtype}:${row.name}`
                                                  : 'DELETE';
                                          })()
                                        : `DELETE ${pendingDeleteIds.length}`
                                }" to confirm`}
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
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
                            onClick={() => deleteEntities(pendingDeleteIds)}
                            disabled={
                                confirmText !==
                                (pendingDeleteIds.length === 1
                                    ? (() => {
                                          const row = rows.find(
                                              (e) =>
                                                  String(e.id) === pendingDeleteIds[0],
                                          );
                                          return row
                                              ? `${row.subtype}:${row.name}`
                                              : 'DELETE';
                                      })()
                                    : `DELETE ${pendingDeleteIds.length}`)
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
