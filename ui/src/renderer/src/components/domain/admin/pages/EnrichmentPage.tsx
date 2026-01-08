import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { EnrichmentSubclass } from '@services/cradle/models';
import { EditPencil } from 'iconoir-react/regular';
import { DataTable } from '@/components/ui/data-table';
import TableActionsButton from '@/components/base/TableActionsButton';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import EnrichmentSettingsForm from '../forms/EnrichmentSettingsForm';
import AdminPageLayout from '../AdminPageLayout';

export default function EnrichmentPage() {
    const [enrichmentTypes, setEnrichmentTypes] = useState<EnrichmentSubclass[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rightPane, setRightPane] = useState<ReactNode | null>(null);
    const { intelioApi } = useApi();
    const { execute } = useAPICall();

    const displayEnrichmentTypes = async () => {
        setIsLoading(true);
        execute(() => intelioApi.enrichmentSubclassesList())
            .then((enrichmentTypes) => {
                setEnrichmentTypes(enrichmentTypes || []);
            })
            .catch(() => {
                setEnrichmentTypes([]);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    useEffect(() => {
        displayEnrichmentTypes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleEditClick = (enrichment: EnrichmentSubclass) => {
        setRightPane(<EnrichmentSettingsForm enrichment_class={enrichment.className} />);
    };

    const columns = useMemo<ColumnDef<EnrichmentSubclass>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Name',
                cell: ({ row }) => (
                    <div className='font-medium cursor-pointer' onClick={() => handleEditClick(row.original)}>
                        {row.original.name}
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
                    const enrichment = row.original;
                    return (
                        <div className='flex justify-end' onClick={(e) => e.stopPropagation()}>
                            <TableActionsButton>
                                <DropdownMenuItem onClick={() => handleEditClick(enrichment)}>
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
                        <h2 className='text-2xl font-bold tracking-tight'>Enrichment</h2>
                        <p className='text-muted-foreground'>Manage enrichment configurations</p>
                    </div>
                </div>
                <div className='flex-1 overflow-hidden'>
                    <DataTable
                        columns={columns}
                        data={enrichmentTypes}
                        loading={isLoading}
                        emptyMessage='No enrichment types found.'
                        onRowClick={handleEditClick}
                    />
                </div>
            </div>
        </AdminPageLayout>
    );
}
