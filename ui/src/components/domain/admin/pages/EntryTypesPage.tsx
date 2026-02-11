import { ActionBarSearch } from '@/components/base/ActionBar/ActionBar';
import PageHeader from '@/components/base/PageHeader';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { useAuthState } from '@/hooks/auth/useAuth';
import { queryKeys } from '@/hooks/query';
import {
    ClockCounterClockwiseIcon,
    GearIcon,
    PencilIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import { EntryClass } from '@services/cradle/models';
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
import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import AddEntryTypeDialog from '@/components/domain/admin/dialogs/AddEntryTypeDialog';
import ConfirmDeletionDialog from '../../../dialogs/base/ConfirmDeletionDialog';
import ActivityList from '../../activity/ActivityList';
import AdminPageLayout from '../AdminPageLayout';
import EntryTypeForm from '../forms/EntryTypeForm';

interface EntryTypeData {
    id: string;
    subtype: string;
    count?: number;
}

const ENTRY_TYPE_SETTINGS_ITEMS = [
    { id: 'settings', label: 'Settings', icon: GearIcon },
    { id: 'activity', label: 'Activity', icon: ClockCounterClockwiseIcon },
];

function EntryTypeSettingsPage({ subtype }: { subtype: string }) {
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false });
    const tab = (search as any)?.tab;
    const { entriesApi } = useApi();
    const queryClient = useQueryClient();

    // Query for entry type details
    const { data: entryTypeData } = useQuery({
        queryKey: queryKeys.entryTypes.detail(subtype),
        queryFn: () => entriesApi.entryClassesRetrieve({ classSubtype: subtype }),
        enabled: !!subtype,
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
        if (!tab && ENTRY_TYPE_SETTINGS_ITEMS.length > 0) {
            const newSearch: any = { ...search, tab: ENTRY_TYPE_SETTINGS_ITEMS[0].id };
            router.navigate({
                to: location.pathname as any,
                search: newSearch,
                replace: true,
            });
        }
    }, [tab, router, location.pathname, search]);

    const selectedItem = ENTRY_TYPE_SETTINGS_ITEMS.find((item) => item.id === tab);
    const currentTab = selectedItem || ENTRY_TYPE_SETTINGS_ITEMS[0];

    const tabDescriptions: Record<string, string> = {
        settings: 'Manage entry type configuration',
        activity: 'View entry type activity and logs',
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
                    <h2 className='text-2xl font-bold tracking-tight'>
                        {entryTypeData?.subtype || subtype || 'Entry Type'}
                    </h2>
                    <p className='text-muted-foreground'>
                        {currentDescription || 'Manage entry type'}
                    </p>
                </div>
            </div>
            <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 mt-4'>
                <Tabs
                    value={tab || ENTRY_TYPE_SETTINGS_ITEMS[0].id}
                    onValueChange={handleTabClick}
                >
                    <TabsList className='flex-wrap h-auto'>
                        {ENTRY_TYPE_SETTINGS_ITEMS.map((item) => {
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
                            <div className='faded-bottom h-full w-full overflow-y-auto overflow-x-hidden scroll-smooth'>
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
                                    <ActivityList
                                        content_type='entryclass'
                                        objectId={subtype}
                                        name={entryTypeData?.subtype}
                                    />
                                </CardContent>
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
                                    <EntryTypeForm
                                        id={subtype}
                                        onAdd={(newEntryType: EntryClass) => {
                                            queryClient.invalidateQueries({
                                                queryKey: ['entryTypes', 'list'],
                                            });
                                            if (
                                                newEntryType.subtype &&
                                                newEntryType.subtype !== subtype
                                            ) {
                                                router.navigate({
                                                    to: `/manage/entry-types/${encodeURIComponent(newEntryType.subtype)}` as any,
                                                });
                                            }
                                        }}
                                    />
                                </CardContent>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

export default function EntryTypesPage() {
    const params = useParams({ strict: false });
    const id = (params as any).id;
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
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteEntryTypeSubtype, setDeleteEntryTypeSubtype] = useState<string | null>(
        null,
    );
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
        } catch (error) {
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
    const paginatedEntryTypes = entryTypes;

    // Sync URL params to page state
    useEffect(() => {
        const pageFromParams = (search as any)?.entry_types_page || 1;
        const pageSizeFromParams = (search as any)?.entry_types_pagesize || 20;
        const searchFromParams = (search as any)?.entry_types_search ?? '';
        if (pageFromParams !== page) setPage(pageFromParams);
        if (pageSizeFromParams !== pageSize) setPageSize(pageSizeFromParams);
        if (searchFromParams !== searchQuery) setSearchQuery(searchFromParams);
    }, [
        (search as any)?.entry_types_page,
        (search as any)?.entry_types_pagesize,
        (search as any)?.entry_types_search,
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

    const formatCount = (count?: number) => {
        if (count === undefined || count < 0) return '0';
        if (count >= 100) return '99+';
        return String(count);
    };

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
        [handleEditClick, formatCount],
    );

    const table = useReactTable({
        data: paginatedEntryTypes,
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
                <EntryTypeSettingsPage subtype={id} />
            </AdminPageLayout>
        );
    }

    const handleAddEntryType = () => {
        setAddEntryTypeDialogOpen(true);
    };

    const handleEntryTypeAdded = (newEntryType: EntryClass) => {
        queryClient.invalidateQueries({ queryKey: ['entryTypes', 'list'] });
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
            {deleteEntryTypeSubtype !== null && (
                <ConfirmDeletionDialog
                    open={deleteDialogOpen}
                    onOpenChange={(open) => {
                        setDeleteDialogOpen(open);
                        if (!open) setDeleteEntryTypeSubtype(null);
                    }}
                    onConfirm={() => {
                        if (deleteEntryTypeSubtype !== null) {
                            deleteMutation.mutate(deleteEntryTypeSubtype);
                        }
                    }}
                    confirmText={deleteEntryTypeSubtype}
                    text='Are you sure you want to delete this entry type? This action is irreversible.'
                />
            )}
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
