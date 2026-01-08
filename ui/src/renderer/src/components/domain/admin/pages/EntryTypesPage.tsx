import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { EntryClass } from '@services/cradle/models';
import { uniqueId } from 'lodash';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ClockRotateRight, EditPencil, Trash } from 'iconoir-react/regular';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import TableActionsButton from '@/components/base/TableActionsButton';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useModal } from '@/contexts/ui/ModalContext';
import ConfirmDeletionModal from '../../../modals/base/ConfirmDeletionModal';
import ActivityList from '../../activity/ActivityList';
import EntryTypeForm from '../forms/EntryTypeForm';
import AdminPageLayout from '../AdminPageLayout';

interface EntryTypeData {
    subtype: string;
    count?: number;
}

export default function EntryTypesPage() {
    const [entryTypes, setEntryTypes] = useState<EntryTypeData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { isAdmin } = useProfile();
    const [rightPane, setRightPane] = useState<ReactNode | null>(null);
    const { entriesApi } = useApi();
    const { execute, executor } = useAPICall();
    const { setModal } = useModal();

    const displayEntryTypes = async () => {
        setIsLoading(true);
        execute(() => entriesApi.entryClassesList({ showCount: true }))
            .then((fetchedEntryTypes) => {
                const entryTypesList = (fetchedEntryTypes as any[]) || [];
                setEntryTypes(entryTypesList.map((c) => ({
                    subtype: c.subtype,
                    count: c.count,
                })));
            })
            .catch(() => {
                setEntryTypes([]);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    useEffect(() => {
        displayEntryTypes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleEditClick = (entryType: EntryTypeData) => {
        setRightPane(<EntryTypeForm id={entryType.subtype} isEdit={true} />);
    };

    const handleActivityClick = (entryType: EntryTypeData, e: React.MouseEvent) => {
        e.stopPropagation();
        setRightPane(
            <ActivityList
                content_type='entryclass'
                objectId={entryType.subtype}
                name={entryType.subtype}
                key={entryType.subtype}
            />,
        );
    };

    const handleDelete = (entryType: EntryTypeData) => {
        const deleteEntryType = executor(
            async () => {
                await entriesApi.entryClassesDestroy({ classSubtype: entryType.subtype });
                displayEntryTypes();
            },
            { successMessage: 'Entry type deleted successfully' },
        );

        setModal(ConfirmDeletionModal, {
            onConfirm: deleteEntryType,
            confirmText: entryType.subtype,
            text: 'Are you sure you want to delete this entry type? This action is irreversible.',
        });
    };

    const formatCount = (count?: number) => {
        if (count === undefined || count < 0) return '0';
        if (count >= 100) return '99+';
        return String(count);
    };

    const columns = useMemo<ColumnDef<EntryTypeData>[]>(
        () => [
            {
                accessorKey: 'subtype',
                header: 'Entry Type',
                cell: ({ row }) => (
                    <div className='font-medium cursor-pointer' onClick={() => handleEditClick(row.original)}>
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
                        <div className='flex justify-end' onClick={(e) => e.stopPropagation()}>
                            <TableActionsButton>
                                {isAdmin() && (
                                    <DropdownMenuItem onClick={(e) => handleActivityClick(entryType, e)}>
                                        <ClockRotateRight width='18' height='18' />
                                        View Activity
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleEditClick(entryType)}>
                                    <EditPencil width='18' height='18' />
                                    Edit
                                </DropdownMenuItem>
                                {isAdmin() && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleDelete(entryType)} variant="destructive">
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
        [isAdmin, executor, entriesApi, setModal],
    );

    const handleAddEntryType = () => {
        setRightPane(
            <EntryTypeForm
                isEdit={false}
                key={uniqueId('entry-type-form-')}
                onAdd={(newEntryType: EntryClass) => {
                    displayEntryTypes();
                    setRightPane(<EntryTypeForm id={newEntryType.subtype} isEdit={true} />);
                }}
            />,
        );
    };

    return (
        <AdminPageLayout rightPane={rightPane}>
            <div className='w-full h-full flex flex-col rounded-md px-3'>
                <div className='flex items-center justify-between py-4'>
                    <div>
                        <h2 className='text-2xl font-bold tracking-tight'>Entry Types</h2>
                        <p className='text-muted-foreground'>Manage entry type classifications</p>
                    </div>
                    {isAdmin() && <Button onClick={handleAddEntryType}>Add Entry Type</Button>}
                </div>
                <div className='flex-1 overflow-hidden'>
                    <DataTable
                        columns={columns}
                        data={entryTypes}
                        loading={isLoading}
                        emptyMessage='No entry types found.'
                        onRowClick={handleEditClick}
                    />
                </div>
            </div>
        </AdminPageLayout>
    );
}
