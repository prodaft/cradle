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
import { EntryClass } from '@services/cradle/models';
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
import AddEntryTypeModal from '../../../dialogs/admin/AddEntryTypeModal';
import ConfirmDeletionModal from '../../../dialogs/base/ConfirmDeletionModal';
import ActivityList from '../../activity/ActivityList';
import AdminPageLayout from '../AdminPageLayout';
import EntryTypeForm from '../forms/EntryTypeForm';

interface EntryTypeData {
    id: string;
    subtype: string;
    count?: number;
}

const ENTRY_TYPE_SETTINGS_ITEMS = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'activity', label: 'Activity', icon: ClockRotateRight },
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
        <div className='w-full h-full flex flex-col'>
            <PageHeader
                title={entryTypeData?.subtype || subtype || 'Entry Type'}
                description={currentDescription || 'Manage entry type'}
            />
            <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:space-x-12 px-4'>
                <aside className='top-0 lg:sticky lg:w-1/5'>
                    {/* Mobile dropdown */}
                    <div className='p-1 md:hidden'>
                        <Select
                            value={tab || ENTRY_TYPE_SETTINGS_ITEMS[0].id}
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
                                {ENTRY_TYPE_SETTINGS_ITEMS.map((item) => {
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
                            {ENTRY_TYPE_SETTINGS_ITEMS.map((item) => {
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
                                        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:text-accent-foreground dark:hover:bg-accent/50 h-9 px-4 py-2 has-[>svg]:px-3 hover:bg-accent justify-start ${
                                            isActive
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
                                        content_type='entryclass'
                                        objectId={subtype}
                                        name={entryTypeData?.subtype}
                                    />
                                ) : (
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
                                                    to: `/manage/entry-types/${newEntryType.subtype}` as any,
                                                });
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

export default function EntryTypesPage() {
    const params = useParams({ strict: false });
    const id = (params as any).id;
    const router = useRouter();
    const location = useLocation();
    const search = useSearch({ strict: false });
    const [selectedEntryTypes, setSelectedEntryTypes] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState((search as any)?.entry_types_page || 1);
    const [pageSize, setPageSize] = useState(
        (search as any)?.entry_types_pagesize || 10,
    );
    const { isAdmin } = useAuthState();
    const { entriesApi } = useApi();
    const queryClient = useQueryClient();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteEntryTypeSubtype, setDeleteEntryTypeSubtype] = useState<string | null>(
        null,
    );
    const [addEntryTypeModalOpen, setAddEntryTypeModalOpen] = useState(false);
    const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

    // Query for entry types
    const { data: entryTypesData, isPending } = useQuery({
        queryKey: queryKeys.entryTypes.lists(),
        queryFn: () => entriesApi.entryClassesList({ showCount: true }),
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const entryTypes = useMemo(() => {
        const entryTypesList = (entryTypesData as any[]) || [];
        return entryTypesList.map((c) => ({
            id: c.subtype,
            subtype: c.subtype,
            count: c.count,
        }));
    }, [entryTypesData]);

    const handleEditClick = (entryType: EntryTypeData) => {
        router.navigate({ to: `/manage/entry-types/${entryType.subtype}` as any });
    };

    const handleActivityClick = (entryType: EntryTypeData, e: React.MouseEvent) => {
        e.stopPropagation();
        router.navigate({
            to: `/manage/entry-types/${entryType.subtype}` as any,
            search: { tab: 'activity' } as any,
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

    const handleDelete = (entryType: EntryTypeData) => {
        setDeleteEntryTypeSubtype(entryType.subtype);
        setDeleteModalOpen(true);
    };

    const handleRowSelectionChange = useCallback((selectedIds: string[]) => {
        setSelectedEntryTypes(selectedIds);
    }, []);

    const handleDeleteEntryTypes = async (entryTypeSubtypes: string[]) => {
        try {
            await Promise.all(
                entryTypeSubtypes.map((subtype) => deleteMutation.mutateAsync(subtype)),
            );
            setSelectedEntryTypes([]);
        } catch (error) {
            // Error already handled by mutation
        }
    };

    const filteredEntryTypes = useMemo(() => {
        if (!searchQuery.trim()) {
            return entryTypes;
        }
        const query = searchQuery.toLowerCase();
        return entryTypes.filter((entryType) =>
            entryType.subtype?.toLowerCase().includes(query),
        );
    }, [entryTypes, searchQuery]);

    // Calculate total pages and paginate data
    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(filteredEntryTypes.length / pageSize));
    }, [filteredEntryTypes.length, pageSize]);

    const paginatedEntryTypes = useMemo(() => {
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        return filteredEntryTypes.slice(start, end);
    }, [filteredEntryTypes, page, pageSize]);

    // Sync URL params to page state
    useEffect(() => {
        const pageFromParams = (search as any)?.entry_types_page || 1;
        const pageSizeFromParams = (search as any)?.entry_types_pagesize || 10;
        if (pageFromParams !== page) setPage(pageFromParams);
        if (pageSizeFromParams !== pageSize) setPageSize(pageSizeFromParams);
    }, [(search as any)?.entry_types_page, (search as any)?.entry_types_pagesize]);

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
                header: 'Entry Type',
                cell: ({ row }) => (
                    <div
                        className='font-medium cursor-pointer'
                        onClick={() => handleEditClick(row.original)}
                    >
                        {row.original.subtype}
                    </div>
                ),
            },
            {
                accessorKey: 'count',
                header: 'Count',
                cell: ({ row }) => (
                    <Badge variant='secondary'>{formatCount(row.original.count)}</Badge>
                ),
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const entryType = row.original;
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
                                                    handleActivityClick(entryType, e)
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
                                                onClick={() => handleDelete(entryType)}
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
        [isAdmin, handleActivityClick, handleDelete, formatCount],
    );

    if (id && id !== 'add') {
        return (
            <AdminPageLayout>
                <EntryTypeSettingsPage subtype={id} />
            </AdminPageLayout>
        );
    }

    const handleAddEntryType = () => {
        setAddEntryTypeModalOpen(true);
    };

    const handleEntryTypeAdded = (newEntryType: EntryClass) => {
        queryClient.invalidateQueries({ queryKey: ['entryTypes', 'list'] });
        if (newEntryType.subtype) {
            router.navigate({
                to: `/manage/entry-types/${newEntryType.subtype}` as any,
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
                    <div className='pb-4'>
                        <ActionBar
                            left={
                                <ActionBarSearch
                                    placeholder='Search entry types...'
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
                            data={paginatedEntryTypes}
                            loading={isPending}
                            emptyMessage='No entry types found.'
                            enableRowSelection={true}
                            selectedRows={selectedEntryTypes}
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
                                        if (selectedEntryTypes.length === 0) return;
                                        setBulkDeleteModalOpen(true);
                                    },
                                    disabled:
                                        isPending ||
                                        selectedEntryTypes.length === 0 ||
                                        filteredEntryTypes.length === 0,
                                    variant: 'destructive',
                                },
                            ]}
                            itemLabel='entry type'
                        />
                    </div>
                </div>
            </div>
            <AddEntryTypeModal
                open={addEntryTypeModalOpen}
                onOpenChange={setAddEntryTypeModalOpen}
                onAdd={handleEntryTypeAdded}
            />
            {deleteEntryTypeSubtype !== null && (
                <ConfirmDeletionModal
                    open={deleteModalOpen}
                    onOpenChange={(open) => {
                        setDeleteModalOpen(open);
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
            <ConfirmDeletionModal
                open={bulkDeleteModalOpen}
                onOpenChange={setBulkDeleteModalOpen}
                onConfirm={() => handleDeleteEntryTypes(selectedEntryTypes)}
                confirmText='DELETE'
                text={`Are you sure you want to delete ${selectedEntryTypes.length} entry type${selectedEntryTypes.length > 1 ? 's' : ''}? This action is irreversible.`}
            />
        </AdminPageLayout>
    );
}