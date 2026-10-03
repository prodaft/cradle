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

interface EntryTypeRow {
    id: string;
    subtype: string;
    count?: number;
}

export default function EntryTypesList() {
    useDockPanelTab({ title: 'Manage: Entry types', icon: 'manage-entry-types' });
    const router = useRouter();
    const location = useRouterState({
        select: (state) => state.location,
    });
    const search = useSearch({ strict: false }) as any;
    const page = Number(search?.entry_types_page ?? 1) || 1;
    const pageSize = Number(search?.entry_types_pagesize ?? 20) || 20;
    const applied = (search?.entry_types_search ?? '') as string;

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

    const listQuery = useMemo(() => {
        const trimmed = applied.trim();
        return {
            show_count: true,
            page,
            page_size: pageSize,
            ...(trimmed ? { search: trimmed } : {}),
        };
    }, [page, pageSize, applied]);
    const { data: entryClasses, isPending } = $api.useQuery(
        'get',
        '/entries/entry-classes/',
        {
            params: { query: listQuery },
        },
        {
            refetchOnWindowFocus: false,
            meta: {
                showErrorToast: false,
                suppressNotification: true,
            },
        },
    );

    const rows = useMemo<EntryTypeRow[]>(() => {
        const results = (entryClasses?.results ?? []) as EntryClassSerializerCount[];
        return results.map((c) => ({
            id: c.subtype,
            subtype: c.subtype,
            count: c.count,
        }));
    }, [entryClasses?.results]);

    const openEntryType = (item: EntryTypeRow) => {
        router.navigate({
            to: `/manage/entry-types/${encodeURIComponent(item.subtype)}` as any,
        });
    };

    const deleteEntryType = useMutation({
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

    const deleteEntryTypes = async (subtypes: string[]) => {
        try {
            await Promise.all(
                subtypes.map((subtype) => deleteEntryType.mutateAsync(subtype)),
            );
            clearSelection();
            setIsDeleteOpen(false);
            setPendingDeleteIds([]);
            setConfirmText('');
        } catch (_error) {
            // Error already handled by mutation
        }
    };

    const confirmDelete = useCallback(() => {
        if (checkedIds.length === 0) return;
        setPendingDeleteIds(checkedIds);
        setIsDeleteOpen(true);
    }, [checkedIds]);

    const editSelected = useCallback(() => {
        if (checkedIds.length !== 1) return;
        const subtype = checkedIds[0];
        if (subtype === undefined) return;
        router.navigate({
            to: `/manage/entry-types/${encodeURIComponent(subtype)}` as any,
        });
    }, [checkedIds, router]);

    const viewActivity = useCallback(() => {
        if (checkedIds.length !== 1) return;
        const subtype = checkedIds[0];
        if (subtype === undefined) return;
        router.navigate({
            to: `/manage/entry-types/${encodeURIComponent(subtype)}` as any,
            search: { tab: 'activity' } as any,
        });
    }, [checkedIds, router]);

    const totalPages = useMemo(
        () => Math.max(1, entryClasses?.total_pages ?? 1),
        [entryClasses?.total_pages],
    );

    const applySearch = useCallback(
        (value: string) => {
            router.navigate({
                to: location.pathname as any,
                search: {
                    ...search,
                    entry_types_page: 1,
                    entry_types_search: value.trim() || undefined,
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
                        entry_types_page: 1,
                        entry_types_pagesize: size,
                    } as any,
                    replace: true,
                });
            } else if (target !== page) {
                router.navigate({
                    to: location.pathname as any,
                    search: ((prev: any) => ({
                        ...prev,
                        entry_types_page: target,
                    })) as any,
                    replace: true,
                });
            }
        },
        [page, pageSize, search, router, location.pathname],
    );

    const countLabel = useCallback((count?: number) => {
        if (count === undefined || count < 0) return '0';
        if (count >= 100) return '99+';
        return String(count);
    }, []);

    const columns = useMemo<ColumnDef<EntryTypeRow>[]>(
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
                meta: { label: 'Entry Type' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Entry Type' />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    return <div className='font-medium'>{item.subtype}</div>;
                },
            },
            {
                accessorKey: 'count',
                id: 'count',
                meta: { label: 'Count' },
                size: 28,
                minSize: 28,
                maxSize: 28,
                header: 'Count',
                cell: ({ row }) => {
                    const item = row.original;
                    return <Badge variant='secondary'>{countLabel(item.count)}</Badge>;
                },
                enableSorting: false,
            },
        ],
        [countLabel],
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

    const handleEntryTypeAdded = (newEntryType: EntryClass) => {
        setIsAddOpen(false);
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
                                    <Button onClick={openAddDialog}>
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
                            onRowClick={openEntryType}
                            getRowHref={(item) =>
                                `/manage/entry-types/${encodeURIComponent(item.subtype)}`
                            }
                        >
                            <ActionBarSearch
                                placeholder='Search entry types...'
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
                    {checkedIds.length} entry type
                    {checkedIds.length !== 1 ? 's' : ''} selected
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
                        <DialogTitle>New Entry</DialogTitle>
                        <DialogDescription>Create new entry class</DialogDescription>
                    </DialogHeader>
                    <AddEntryTypeForm onAdd={handleEntryTypeAdded} />
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
                            entry type
                            {pendingDeleteIds.length > 1 ? 's' : ''}? This action is
                            irreversible.
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
                                    pendingDeleteIds.length === 1
                                        ? pendingDeleteIds[0]
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
                            onClick={() => {
                                deleteEntryTypes(pendingDeleteIds);
                            }}
                            disabled={
                                confirmText !==
                                (pendingDeleteIds.length === 1
                                    ? pendingDeleteIds[0]
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
