import { ActionBar, ActionBarSearch } from '@/components/base/ActionBar/ActionBar';
import PageHeader from '@/components/base/PageHeader';
import TableActionsButton from '@/components/base/TableActionsButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import { useProfile } from '@/hooks/user/useProfile';
import { EntryClass } from '@services/cradle/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from '@tanstack/react-router';
import { ColumnDef } from '@tanstack/react-table';
import { ClockRotateRight, EditPencil, Trash } from 'iconoir-react/regular';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import AddEntryTypeModal from '../../../modals/admin/AddEntryTypeModal';
import ConfirmDeletionModal from '../../../modals/base/ConfirmDeletionModal';
import AdminPageLayout from '../AdminPageLayout';
import EntryTypeForm from '../forms/EntryTypeForm';

interface EntryTypeData {
    id: string;
    subtype: string;
    count?: number;
}

export default function EntryTypesPage() {
    const params = useParams({ strict: false });
    const id = (params as any).id;
    const router = useRouter();
    const [selectedEntryTypes, setSelectedEntryTypes] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const { isAdmin } = useProfile();
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
                header: 'Actions',
                cell: ({ row }) => {
                    const entryType = row.original;
                    return (
                        <div
                            className='flex justify-end'
                            onClick={(e) => e.stopPropagation()}
                        >
                            <TableActionsButton>
                                {isAdmin() && (
                                    <DropdownMenuItem
                                        onClick={(e) =>
                                            handleActivityClick(entryType, e)
                                        }
                                    >
                                        <ClockRotateRight width='18' height='18' />
                                        View Activity
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                    onClick={() => handleEditClick(entryType)}
                                >
                                    <EditPencil width='18' height='18' />
                                    Edit
                                </DropdownMenuItem>
                                {isAdmin() && (
                                    <>
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
                    );
                },
                enableSorting: false,
            },
        ],
        [isAdmin, handleEditClick, handleActivityClick, handleDelete, formatCount],
    );

    if (id && id !== 'add') {
        return (
            <AdminPageLayout>
                <EntryTypeForm
                    id={id}
                    onAdd={(newEntryType: EntryClass) => {
                        queryClient.invalidateQueries({
                            queryKey: ['entryTypes', 'list'],
                        });
                        if (newEntryType.subtype) {
                            router.navigate({
                                to: `/manage/entry-types/${newEntryType.subtype}` as any,
                            });
                        }
                    }}
                />
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
                        isAdmin() ? (
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
                    <div className='flex-1'>
                        <DataTable
                            columns={columns}
                            data={filteredEntryTypes}
                            loading={isPending}
                            emptyMessage='No entry types found.'
                            enableRowSelection={true}
                            selectedRows={selectedEntryTypes}
                            onRowSelectionChange={handleRowSelectionChange}
                            onRowClick={handleEditClick}
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
