import { ActionBar, ActionBarSearch } from '@/components/base/ActionBar/ActionBar';
import PageHeader from '@/components/base/PageHeader';
import TableActionsButton from '@/components/base/TableActionsButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table/data-table';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { useAuthState } from '@/hooks/auth/useAuth';
import { queryKeys } from '@/hooks/query';
import { Entity } from '@services/cradle/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useParams, useRouter, useSearch } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { ClockRotateRight, Trash } from 'iconoir-react/regular';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AddEntityModal from '../../../dialogs/admin/AddEntityModal';
import ConfirmDeletionModal from '../../../dialogs/base/ConfirmDeletionModal';
import AdminPageLayout from '../AdminPageLayout';
import EntityForm from '../forms/EntityForm';

interface EntityData extends Entity {
    id: number;
}

export default function EntitiesPage() {
    const { id } = useParams({ strict: false });
    const router = useRouter();
    const location = useLocation();
    const search = useSearch({ strict: false });
    const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState((search as any)?.entities_page || 1);
    const [pageSize, setPageSize] = useState((search as any)?.entities_pagesize || 10);
    const { isAdmin } = useAuthState();
    const { queryApi, entriesApi } = useApi();
    const queryClient = useQueryClient();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteEntityId, setDeleteEntityId] = useState<number | null>(null);
    const [addEntityModalOpen, setAddEntityModalOpen] = useState(false);
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

    // Query for entities
    const { data: entitiesData, isPending } = useQuery({
        queryKey: queryKeys.entities.lists(),
        queryFn: () => queryApi.queryList({ type: 'entity' }),
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const entities = ((entitiesData?.results || []) as EntityData[]) || [];

    // Query for entity detail when editing
    const entityId = id && id !== 'add' ? Number(id) : null;
    const { data: entityData } = useQuery({
        queryKey: queryKeys.entities.detail(String(entityId || '')),
        queryFn: () => entriesApi.entitiesRetrieve({ entityId: entityId! }),
        enabled: !!entityId,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const handleEditClick = (entity: EntityData) => {
        router.navigate({ to: `/manage/entities/${entity.id}` as any });
    };

    const handleActivityClick = (entity: EntityData, e: React.MouseEvent) => {
        e.stopPropagation();
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
        setDeleteModalOpen(true);
    };

    const handleRowSelectionChange = useCallback((selectedIds: string[]) => {
        setSelectedEntities(selectedIds);
    }, []);

    const handleDeleteEntities = async (entityIds: string[]) => {
        try {
            await Promise.all(
                entityIds.map((entityId) =>
                    deleteMutation.mutateAsync(Number(entityId)),
                ),
            );
            setSelectedEntities([]);
        } catch (error) {
            // Error already handled by mutation
        }
    };

    const filteredEntities = useMemo(() => {
        if (!searchQuery.trim()) {
            return entities;
        }
        const query = searchQuery.toLowerCase();
        return entities.filter(
            (entity) =>
                entity.name?.toLowerCase().includes(query) ||
                entity.subtype?.toLowerCase().includes(query) ||
                entity.description?.toLowerCase().includes(query),
        );
    }, [entities, searchQuery]);

    // Calculate total pages and paginate data
    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(filteredEntities.length / pageSize));
    }, [filteredEntities.length, pageSize]);

    const paginatedEntities = useMemo(() => {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return filteredEntities.slice(start, end);
    }, [filteredEntities, page, pageSize]);

    // Sync URL params to page state
    useEffect(() => {
        const pageFromParams = (search as any)?.entities_page || 1;
        const pageSizeFromParams = (search as any)?.entities_pagesize || 10;
        if (pageFromParams !== page) setPage(pageFromParams);
        if (pageSizeFromParams !== pageSize) setPageSize(pageSizeFromParams);
    }, [(search as any)?.entities_page, (search as any)?.entities_pagesize]);

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
                header: 'Type',
                cell: ({ row }) => (
                    <Badge variant='outline'>{row.original.subtype || 'unknown'}</Badge>
                ),
            },
            {
                accessorKey: 'name',
                header: 'Name',
                cell: ({ row }) => (
                    <div
                        className='font-medium cursor-pointer'
                        onClick={() => handleEditClick(row.original)}
                    >
                        {row.original.name}
                    </div>
                ),
            },
            {
                accessorKey: 'description',
                header: 'Description',
                cell: ({ row }) => (
                    <div className='text-muted-foreground max-w-md truncate'>
                        {row.original.description || '-'}
                    </div>
                ),
            },
            {
                accessorKey: 'isPublic',
                header: 'Visibility',
                cell: ({ row }) => (
                    <Badge variant={row.original.isPublic ? 'default' : 'secondary'}>
                        {row.original.isPublic ? 'Public' : 'Private'}
                    </Badge>
                ),
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const entity = row.original;
                    return (
                        <div
                            className='w-12 text-right'
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className='flex justify-end'>
                                <TableActionsButton>
                                    {isAdmin && (
                                        <>
                                            <DropdownMenuItem
                                                onClick={(e) =>
                                                    handleActivityClick(entity, e)
                                                }
                                            >
                                                <ClockRotateRight
                                                    width='18'
                                                    height='18'
                                                />
                                                View Activity
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDelete(entity)}
                                                variant='destructive'
                                            >
                                                <Trash width='18' height='18' />
                                                Delete
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </TableActionsButton>
                            </div>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [isAdmin, handleActivityClick, handleDelete],
    );

    if (id && id !== 'add') {
        return (
            <AdminPageLayout>
                <div className='w-full h-full flex flex-col'>
                    <PageHeader
                        title={`Entity: ${entityData?.name || 'Loading...'}`}
                        description='Manage entity properties and settings'
                    />
                    <div className='p-5 flex-1'>
                        <EntityForm
                            id={entityId!}
                            onAdd={(newEntity: Entity) => {
                                queryClient.invalidateQueries({
                                    queryKey: ['entities', 'list'],
                                });
                                queryClient.invalidateQueries({
                                    queryKey: queryKeys.entities.detail(
                                        String(entityId),
                                    ),
                                });
                                if (newEntity.id) {
                                    router.navigate({
                                        to: `/manage/entities/${newEntity.id}` as any,
                                    });
                                }
                            }}
                        />
                    </div>
                </div>
            </AdminPageLayout>
        );
    }

    const handleAddEntity = () => {
        setAddEntityModalOpen(true);
    };

    const handleEntityAdded = (newEntity: Entity) => {
        queryClient.invalidateQueries({ queryKey: ['entities', 'list'] });
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
                    <div className='pb-4'>
                        <ActionBar
                            left={
                                <ActionBarSearch
                                    placeholder='Search entities...'
                                    value={searchQuery}
                                    onDebouncedChange={setSearchQuery}
                                    onSubmit={setSearchQuery}
                                />
                            }
                        />
                    </div>
                    <div className='flex-1'>
                        <DataTable
                            columns={columns}
                            data={paginatedEntities}
                            loading={isPending}
                            emptyMessage='No entities found.'
                            enableRowSelection={true}
                            selectedRows={selectedEntities}
                            onRowSelectionChange={handleRowSelectionChange}
                            onRowClick={handleEditClick}
                            manualPagination={true}
                            pageCount={totalPages}
                            initialPageIndex={page - 1}
                            initialPageSize={pageSize}
                            onPaginationChange={handlePaginationChange}
                            showPagination={true}
                            bulkActions={[
                                {
                                    id: 'delete',
                                    label: 'Delete',
                                    icon: <Trash width={18} height={18} />,
                                    onClick: () => {
                                        if (selectedEntities.length === 0) return;
                                        setBulkDeleteModalOpen(true);
                                    },
                                    disabled:
                                        isPending ||
                                        selectedEntities.length === 0 ||
                                        filteredEntities.length === 0,
                                    variant: 'destructive',
                                },
                            ]}
                            itemLabel='entity'
                        />
                    </div>
                </div>
            </div>
            <AddEntityModal
                open={addEntityModalOpen}
                onOpenChange={setAddEntityModalOpen}
                onAdd={handleEntityAdded}
            />
            {deleteEntityId !== null && (
                <ConfirmDeletionModal
                    open={deleteModalOpen}
                    onOpenChange={(open) => {
                        setDeleteModalOpen(open);
                        if (!open) setDeleteEntityId(null);
                    }}
                    onConfirm={() => {
                        if (deleteEntityId !== null) {
                            deleteMutation.mutate(deleteEntityId);
                        }
                    }}
                    confirmText={
                        entities.find((e) => e.id === deleteEntityId)
                            ? `${entities.find((e) => e.id === deleteEntityId)!.subtype}:${entities.find((e) => e.id === deleteEntityId)!.name}`
                            : ''
                    }
                    text='Are you sure you want to delete this entity? This will keep its related notes but remove the links to it.'
                />
            )}
            <ConfirmDeletionModal
                open={bulkDeleteModalOpen}
                onOpenChange={setBulkDeleteModalOpen}
                onConfirm={() => handleDeleteEntities(selectedEntities)}
                confirmText='DELETE'
                text={`Are you sure you want to delete ${selectedEntities.length} entit${selectedEntities.length > 1 ? 'ies' : 'y'}? This will keep their related notes but remove the links to them.`}
            />
        </AdminPageLayout>
    );
}
