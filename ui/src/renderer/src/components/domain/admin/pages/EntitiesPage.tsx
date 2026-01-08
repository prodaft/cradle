import { useProfile } from '@/contexts/user/ProfileContext';
import useApi from '@/hooks/api/useApi';
import { useAPICall } from '@/hooks/api/useAPICall';
import { Entity } from '@services/cradle/models';
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
import EntityForm from '../forms/EntityForm';
import AdminPageLayout from '../AdminPageLayout';

interface EntityData extends Entity {
    id: number;
}

export default function EntitiesPage() {
    const [entities, setEntities] = useState<EntityData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { isAdmin } = useProfile();
    const [rightPane, setRightPane] = useState<ReactNode | null>(null);
    const { queryApi, entriesApi } = useApi();
    const { execute, executor } = useAPICall();
    const { setModal } = useModal();

    const displayEntities = async () => {
        setIsLoading(true);
        execute(() => queryApi.queryList({ type: 'entity' }))
            .then((response) => {
                setEntities((response.results || []) as EntityData[]);
            })
            .catch(() => {
                setEntities([]);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    useEffect(() => {
        displayEntities();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleEditClick = (entity: EntityData) => {
        setRightPane(<EntityForm id={entity.id} isEdit={true} />);
    };

    const handleActivityClick = (entity: EntityData, e: React.MouseEvent) => {
        e.stopPropagation();
        setRightPane(
            <ActivityList
                content_type='entry'
                objectId={String(entity.id)}
                name={entity.name}
                key={String(entity.id)}
            />,
        );
    };

    const handleDelete = (entity: EntityData) => {
        const deleteEntity = executor(
            async () => {
                await entriesApi.entitiesDestroy({ entityId: entity.id });
                displayEntities();
            },
            { successMessage: 'Entity deleted successfully' },
        );

        setModal(ConfirmDeletionModal, {
            onConfirm: deleteEntity,
            confirmText: `${entity.subtype}:${entity.name}`,
            text: 'Are you sure you want to delete this entity? This will keep its related notes but remove the links to it.',
        });
    };

    const columns = useMemo<ColumnDef<EntityData>[]>(
        () => [
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
                    <div className='font-medium cursor-pointer' onClick={() => handleEditClick(row.original)}>
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
                header: 'Actions',
                cell: ({ row }) => {
                    const entity = row.original;
                    return (
                        <div className='flex justify-end' onClick={(e) => e.stopPropagation()}>
                            <TableActionsButton>
                                {isAdmin() && (
                                    <DropdownMenuItem onClick={(e) => handleActivityClick(entity, e)}>
                                        <ClockRotateRight width='18' height='18' />
                                        View Activity
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleEditClick(entity)}>
                                    <EditPencil width='18' height='18' />
                                    Edit
                                </DropdownMenuItem>
                                {isAdmin() && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleDelete(entity)} variant="destructive">
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

    const handleAddEntity = () => {
        setRightPane(
            <EntityForm
                isEdit={false}
                key={uniqueId('entity-form-')}
                onAdd={(newEntity: Entity) => {
                    displayEntities();
                    if (newEntity.id) {
                        setRightPane(<EntityForm id={newEntity.id} isEdit={true} />);
                    }
                }}
            />,
        );
    };

    return (
        <AdminPageLayout rightPane={rightPane}>
            <div className='w-full h-full flex flex-col rounded-md px-3'>
                <div className='flex items-center justify-between py-4'>
                    <div>
                        <h2 className='text-2xl font-bold tracking-tight'>Entities</h2>
                        <p className='text-muted-foreground'>Manage entities and their properties</p>
                    </div>
                    {isAdmin() && <Button onClick={handleAddEntity}>Add Entity</Button>}
                </div>
                <div className='flex-1 overflow-hidden'>
                    <DataTable
                        columns={columns}
                        data={entities}
                        loading={isLoading}
                        emptyMessage='No entities found.'
                        onRowClick={handleEditClick}
                    />
                </div>
            </div>
        </AdminPageLayout>
    );
}
