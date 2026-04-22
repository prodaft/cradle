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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import {
    ClockCounterClockwiseIcon,
    PencilIcon,
    TrashIcon,
} from '@phosphor-icons/react';
import { $api, fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import AddEntryTypeForm from './add-entry-type-form';

type EntryClass = components['schemas']['EntryClass'];
type EntryClassSerializerCount = components['schemas']['EntryClassSerializerCount'];

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
    const searchAny = search as any;
    const page = Number(searchAny?.entry_types_page ?? 1) || 1;
    const pageSize = Number(searchAny?.entry_types_pagesize ?? 20) || 20;
    const searchQuery = (searchAny?.entry_types_search ?? '') as string;

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const { isAdmin } = useAuthState();
    const queryClient = useQueryClient();
    const [addEntryTypeDialogOpen, setAddEntryTypeDialogOpen] = useState(false);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
    const [bulkDeleteEntryTypeSubtypes, setBulkDeleteEntryTypeSubtypes] = useState<
        string[]
    >([]);
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

    const selectedEntryTypeIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

    const searchTerm = searchQuery.trim() || undefined;
    const { data: entryTypesData, isPending } = $api.useQuery(
        'get',
        '/entries/entry-classes/',
        {
            params: {
                query: {
                    show_count: true,
                    page,
                    page_size: pageSize,
                    search: searchTerm,
                },
            },
        },
        {
            refetchOnWindowFocus: false,
            meta: {
                showErrorToast: false,
                suppressNotification: true,
            },
        },
    );

    const entryTypes = useMemo<EntryTypeData[]>(() => {
        const results = (entryTypesData?.results ?? []) as EntryClassSerializerCount[];
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

    const deleteMutation = useMutation({
        mutationFn: async (subtype: string) => {
            const { error, response } = await fetchClient.DELETE(
                '/entries/entry-classes/{class_subtype}/',
                { params: { path: { class_subtype: subtype } } },
            );
            if (error) throw { response, error };
        },
        meta: {
            invalidateQueries: [
                { queryKey: queryKeys.entryTypes.apiList() },
                { queryKey: ['entry_classes'] },
            ],
            successMessage: 'Entry type deleted successfully',
        },
    });

    const handleDeleteEntryTypes = async (entryTypeSubtypes: string[]) => {
        try {
            await Promise.all(
                entryTypeSubtypes.map((subtype) => deleteMutation.mutateAsync(subtype)),
            );
            clearSelection();
            setBulkDeleteDialogOpen(false);
            setBulkDeleteEntryTypeSubtypes([]);
            setDeleteConfirmInput('');
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
        () => Math.max(1, entryTypesData?.total_pages ?? 1),
        [entryTypesData?.total_pages],
    );

    const handleSearchChange = useCallback(
        (value: string) => {
            router.navigate({
                to: location.pathname as any,
                search: {
                    ...searchAny,
                    entry_types_page: 1,
                    entry_types_search: value.trim() || undefined,
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
                        entry_types_page: 1,
                        entry_types_pagesize: newPageSize,
                    } as any,
                    replace: true,
                });
            } else if (newPage !== page) {
                router.navigate({
                    to: location.pathname as any,
                    search: { ...searchAny, entry_types_page: newPage } as any,
                    replace: true,
                });
            }
        },
        [page, pageSize, searchAny, router, location.pathname],
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
        setAddEntryTypeDialogOpen(false);
        queryClient.invalidateQueries({
            queryKey: queryKeys.entryTypes.apiList(),
        });
        if (newEntryType.subtype) {
            router.navigate({
                to: `/manage/entry-types/${encodeURIComponent(newEntryType.subtype)}` as any,
            });
        }
    };

    return (
        <div className='w-full h-full'>
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
                        <DataTable
                            table={table}
                            showViewOptions
                            isLoading={isPending}
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
            <Dialog
                open={addEntryTypeDialogOpen}
                onOpenChange={setAddEntryTypeDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Entry</DialogTitle>
                        <DialogDescription>Create new entry class</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className='no-scrollbar -mx-4 max-h-[50vh] px-4'>
                        <AddEntryTypeForm onAdd={handleEntryTypeAdded} />
                    </ScrollArea>
                </DialogContent>
            </Dialog>
            <AlertDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={(open) => {
                    setBulkDeleteDialogOpen(open);
                    if (!open) {
                        setBulkDeleteEntryTypeSubtypes([]);
                        setDeleteConfirmInput('');
                    }
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete{' '}
                            {bulkDeleteEntryTypeSubtypes.length} entry type
                            {bulkDeleteEntryTypeSubtypes.length > 1 ? 's' : ''}? This
                            action is irreversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <FieldGroup className='gap-4'>
                        <Field>
                            <FieldLabel htmlFor='confirm-delete-entry-types'>
                                Type below to confirm
                            </FieldLabel>
                            <Input
                                id='confirm-delete-entry-types'
                                type='text'
                                placeholder={`Type "${
                                    bulkDeleteEntryTypeSubtypes.length === 1
                                        ? bulkDeleteEntryTypeSubtypes[0]
                                        : `DELETE ${bulkDeleteEntryTypeSubtypes.length}`
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
                            onClick={() => {
                                handleDeleteEntryTypes(bulkDeleteEntryTypeSubtypes);
                            }}
                            disabled={
                                deleteConfirmInput !==
                                (bulkDeleteEntryTypeSubtypes.length === 1
                                    ? bulkDeleteEntryTypeSubtypes[0]
                                    : `DELETE ${bulkDeleteEntryTypeSubtypes.length}`)
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
