import { ActionBar, ActionBarSearch } from '@/components/base/ActionBar/ActionBar';
import PageHeader from '@/components/base/PageHeader';
import TableActionsButton from '@/components/base/TableActionsButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table/data-table';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { useAuthState } from '@/hooks/auth/useAuth';
import { queryKeys } from '@/hooks/query';
import { Entity } from '@services/cradle/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    useLocation,
    useParams,
    useRouter,
    useRouterState,
    useSearch,
} from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { ClockRotateRight, Settings, Trash } from 'iconoir-react/regular';
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AddEntityModal from '../../../dialogs/admin/AddEntityModal';
import ConfirmDeletionModal from '../../../dialogs/base/ConfirmDeletionModal';
import ActivityList from '../../activity/ActivityList';
import AdminPageLayout from '../AdminPageLayout';
import EntityForm from '../forms/EntityForm';

interface EntityData extends Entity {
    id: number;
}

const ENTITY_SETTINGS_ITEMS = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'activity', label: 'Activity', icon: ClockRotateRight },
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
        activity: 'View entity activity and audit logs',
    };
    const currentDescription =
        tab && tab in tabDescriptions ? tabDescriptions[tab] : '';

    return (
        <div className='w-full h-full flex flex-col'>
            <PageHeader
                title={`Entity: ${entityData?.name || 'Loading...'}`}
                description={currentDescription || 'Manage entity'}
            />
            <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12 px-4'>
                <aside className='top-0 lg:sticky lg:w-1/5'>
                    {/* Mobile dropdown */}
                    <div className='p-1 md:hidden'>
                        <Select
                            value={tab || ENTITY_SETTINGS_ITEMS[0].id}
                            onValueChange={handleTabClick}
                        >
                            <SelectTrigger className='h-12 sm:w-48'>
                                <SelectValue>
                                    <div className='flex gap-x-4 px-2 py-1 items-center'>
                                        <span className='scale-125 flex items-center'>
                                            {currentTab && (
                                                <currentTab.icon className='w-[18px] h-[18px]' />
                                            )}
                                        </span>
                                        <span className='text-md'>
                                            {currentTab?.label}
                                        </span>
                                    </div>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {ENTITY_SETTINGS_ITEMS.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <SelectItem key={item.id} value={item.id}>
                                            <div className='flex gap-x-2 items-center'>
                                                <Icon className='w-[18px] h-[18px]' />
                                                <span>{item.label}</span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Desktop navigation */}
                    <div className='relative hidden w-full min-w-40 bg-background px-1 py-2 md:block'>
                        <nav className='flex space-x-2 py-1 lg:flex-col lg:space-y-1 lg:space-x-0'>
                            {ENTITY_SETTINGS_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const isActive = tab === item.id;
                                return (
                                    <a
                                        key={item.id}
                                        href='#'
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleTabClick(item.id);
                                        }}
                                        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:text-accent-foreground dark:hover:bg-accent/50 h-9 px-4 py-2 has-[>svg]:px-3 hover:bg-accent justify-start ${isActive
                                                ? 'bg-muted hover:bg-accent active'
                                                : ''
                                            }`}
                                        data-status={isActive ? 'active' : undefined}
                                        aria-current={isActive ? 'page' : undefined}
                                    >
                                        <span className='me-2'>
                                            <Icon className='w-[18px] h-[18px]' />
                                        </span>
                                        {item.label}
                                    </a>
                                );
                            })}
                        </nav>
                    </div>
                </aside>
                <div className='flex w-full overflow-y-hidden p-1'>
                    <div className='flex flex-1 flex-col'>
                        <div className='flex-none'>
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
                            className='bg-border my-4 flex-none'
                        />
                        <div className='faded-bottom h-full w-full overflow-y-auto scroll-smooth pe-4 pb-12'>
                            <div className='-mx-1 px-1.5'>
                                {tab === 'activity' ? (
                                    <ActivityList
                                        content_type='entry'
                                        objectId={entityId}
                                        name={entityData?.name}
                                    />
                                ) : (
                                    <EntityForm
                                        id={Number(entityId)}
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
                                                // Normally stay on the page
                                            }
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
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

    const handleEditClick = (entity: EntityData) => {
        router.navigate({ to: `/manage/entities/${entity.id}` as any });
    };

    const handleActivityClick = (entity: EntityData, e: React.MouseEvent) => {
        e.stopPropagation();
        router.navigate({
            to: `/manage/entities/${entity.id}` as any,
            search: { tab: 'activity' } as any,
        });
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
                        <div className='w-12' onClick={(e) => e.stopPropagation()}>
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
                <EntitySettingsPage entityId={id} />
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
                    <div className='flex-1 space-y-4'>
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
            {deleteEntityId !== null &&
                (() => {
                    const entity = entities.find((e) => e.id === deleteEntityId);
                    return (
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
                                entity ? `${entity.subtype}:${entity.name}` : ''
                            }
                            text='Are you sure you want to delete this entity? This will keep its related notes but remove the links to it.'
                        />
                    );
                })()}
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