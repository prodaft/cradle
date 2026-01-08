import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { MappingSubclass } from '@services/cradle/models';
import { EditPencil } from 'iconoir-react/regular';
import { DataTable } from '@/components/ui/data-table';
import TableActionsButton from '@/components/base/TableActionsButton';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { capitalizeString } from '@/utils/dashboard';
import TypeMappingsEditor from '../TypeMappingsEditor';
import AdminPageLayout from '../AdminPageLayout';

export default function TypeMappingsPage() {
    const [mappingTypes, setMappingTypes] = useState<MappingSubclass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rightPane, setRightPane] = useState<ReactNode | null>(null);
    const { intelioApi } = useApi();
    const { execute } = useAPICall();

    const displayMappingTypes = async () => {
        setIsLoading(true);
        execute(() => intelioApi.mappingsSubclassesList())
            .then((mappingTypes) => {
                setMappingTypes(mappingTypes || []);
            })
            .catch(() => {
                setMappingTypes([]);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    useEffect(() => {
        displayMappingTypes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleEditClick = (mapping: MappingSubclass) => {
        setRightPane(<TypeMappingsEditor id={mapping.className} name={mapping.name} onSave={() => {}} />);
    };

    const columns = useMemo<ColumnDef<MappingSubclass>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Name',
                cell: ({ row }) => (
                    <div className='font-medium cursor-pointer' onClick={() => handleEditClick(row.original)}>
                        {capitalizeString(row.original.name)}
                    </div>
                ),
            },
            {
                accessorKey: 'className',
                header: 'Class Name',
                cell: ({ row }) => (
                    <div className='text-muted-foreground font-mono text-sm'>{row.original.className}</div>
                ),
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => {
                    const mapping = row.original;
                    return (
                        <div className='flex justify-end' onClick={(e) => e.stopPropagation()}>
                            <TableActionsButton>
                                <DropdownMenuItem onClick={() => handleEditClick(mapping)}>
                                    <EditPencil width='18' height='18' />
                                    Edit
                                </DropdownMenuItem>
                            </TableActionsButton>
                        </div>
                    );
                },
                enableSorting: false,
            },
        ],
        [],
    );

    return (
        <AdminPageLayout rightPane={rightPane}>
            <div className='w-full h-full flex flex-col rounded-md px-3'>
                <div className='flex items-center justify-between py-4'>
                    <div>
                        <h2 className='text-2xl font-bold tracking-tight'>Type Mappings</h2>
                        <p className='text-muted-foreground'>Manage data type transformations</p>
                    </div>
                </div>
                <div className='flex-1 overflow-hidden'>
                    <DataTable
                        columns={columns}
                        data={mappingTypes}
                        loading={isLoading}
                        emptyMessage='No type mappings found.'
                        onRowClick={handleEditClick}
                    />
                </div>
            </div>
        </AdminPageLayout>
    );
}
