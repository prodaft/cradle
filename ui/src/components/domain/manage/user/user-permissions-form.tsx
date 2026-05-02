import { ActionBarSearch } from '@/components/base/action-bar/action-bar';
import { SettingsHeaderActionsPortal } from '@/components/domain/settings-header-actions';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useNdjsonQuery } from '@/hooks/query';
import {
    ArrowCounterClockwiseIcon,
    ClockCounterClockwiseIcon,
    FloppyDiskIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

interface UserPermissionsFormProps {
    id: string;
    readOnly?: boolean;
}

type AccessType = 'none' | 'read' | 'read-write';

interface PermissionEntity {
    id: number;
    name: string;
    description?: string;
}

const ACCESS_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'read', label: 'Read' },
    { value: 'read-write', label: 'Read-Write' },
];

function PermissionRow({
    entity,
    currentAccess,
    onAccessChange,
    isSaving,
}: {
    entity: PermissionEntity;
    currentAccess: AccessType;
    onAccessChange: (entityId: number, accessType: AccessType) => void;
    isSaving: boolean;
}) {
    const handleChange = (newAccess: string) => {
        onAccessChange(entity.id, newAccess as AccessType);
    };

    return (
        <TableRow>
            <TableCell className='text-muted-foreground'>{entity.id}</TableCell>
            <TableCell className='font-medium'>{entity.name}</TableCell>
            <TableCell className='text-muted-foreground text-sm'>
                {entity.description || '-'}
            </TableCell>
            <TableCell>
                <Select
                    value={currentAccess}
                    onValueChange={handleChange}
                    disabled={isSaving}
                >
                    <SelectTrigger className='w-[140px]'>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {ACCESS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </TableCell>
        </TableRow>
    );
}

export default function UserPermissionsForm({
    id,
    readOnly,
}: UserPermissionsFormProps) {
    const [originalAccess, setOriginalAccess] = useState<Record<number, AccessType>>(
        {},
    );
    const [currentAccess, setCurrentAccess] = useState<Record<number, AccessType>>({});
    const [searchVal, setSearchVal] = useState('');
    const queryClient = useQueryClient();

    const permissionsQuery = useNdjsonQuery({
        path: '/access/user/{user_id}/stream/',
        params: { path: { user_id: id } },
        queryKey: ['get', '/access/user/{user_id}/', id],
        enabled: !!id,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    const entities: PermissionEntity[] = useMemo(() => {
        const permissions = permissionsQuery.data ?? [];
        return permissions.map((c: any) => ({
            id: c.id,
            name: c.name,
            description: c.description,
        }));
    }, [permissionsQuery.data]);

    useEffect(() => {
        setOriginalAccess({});
        setCurrentAccess({});
    }, [id]);

    useEffect(() => {
        const permissions = permissionsQuery.data;
        if (!permissions) return;

        const original: Record<number, AccessType> = {};
        const current: Record<number, AccessType> = {};

        permissions.forEach((c: any) => {
            const accessType = (c.access_type ?? 'none') as AccessType;
            original[c.id] = accessType;
            current[c.id] = accessType;
        });

        setOriginalAccess(original);
        setCurrentAccess(current);
    }, [permissionsQuery.data]);

    const handleAccessChange = (entityId: number, accessType: AccessType) => {
        setCurrentAccess((prev) => ({
            ...prev,
            [entityId]: accessType,
        }));
    };

    const hasUnsavedChanges = useMemo(
        () =>
            entities.some((entity) => {
                const original = originalAccess[entity.id];
                const current = currentAccess[entity.id];
                return original !== current;
            }),
        [entities, originalAccess, currentAccess],
    );

    const saveChangesMutation = useMutation({
        mutationFn: async () => {
            const updates = entities.reduce<
                Array<{ entityId: number; accessType: AccessType }>
            >((acc, entity) => {
                const original = originalAccess[entity.id];
                const current = currentAccess[entity.id];
                if (original !== current && current !== undefined) {
                    acc.push({
                        entityId: entity.id,
                        accessType: current,
                    });
                }
                return acc;
            }, []);

            if (updates.length === 0) return;

            await Promise.all(
                updates.map(async (update) => {
                    const { error, response } = await fetchClient.PUT(
                        '/access/user/{user_id}/{entity_id}/',
                        {
                            params: {
                                path: {
                                    user_id: id,
                                    entity_id: update.entityId,
                                },
                            },
                            body: { access_type: update.accessType },
                        },
                    );
                    if (error) throw { response, error };
                }),
            );
        },
        meta: {
            successMessage: 'Permissions updated successfully',
        },
        onSuccess: () => {
            setOriginalAccess({ ...currentAccess });
            queryClient.invalidateQueries({
                queryKey: ['get', '/access/user/{user_id}/', id],
            });
        },
    });

    const handleSave = () => {
        if (!hasUnsavedChanges) return;
        saveChangesMutation.mutate();
    };

    const handleRevert = () => {
        setCurrentAccess({ ...originalAccess });
    };

    const handleDefault = () => {
        const defaults: Record<number, AccessType> = {};
        entities.forEach((e) => (defaults[e.id] = 'none'));
        setCurrentAccess(defaults);
    };

    const isAtDefault = entities.every(
        (e) => (currentAccess[e.id] ?? 'none') === 'none',
    );

    // Filter entities based on search
    const filteredEntities = useMemo(() => {
        const needle = searchVal.trim().toLowerCase();
        return entities.filter((entity) => {
            if (!needle) return true;
            const haystack =
                `${entity.name || ''} ${entity.description || ''}`.toLowerCase();
            return haystack.includes(needle);
        });
    }, [entities, searchVal]);

    if (permissionsQuery.isLoading) {
        return (
            <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    if (permissionsQuery.isError) {
        return (
            <div className='flex flex-col items-center justify-center min-h-[200px] gap-3 text-foreground'>
                <p className='text-sm text-muted-foreground'>
                    Failed to load permissions.
                </p>
                <Button type='button' onClick={() => permissionsQuery.refetch()}>
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <>
            {!readOnly && (
                <SettingsHeaderActionsPortal>
                    <div className='flex items-center gap-2'>
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            disabled={!hasUnsavedChanges}
                            onClick={handleRevert}
                            title='Revert'
                        >
                            <ArrowCounterClockwiseIcon
                                className='size-4'
                                weight='bold'
                            />
                        </Button>
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            disabled={isAtDefault}
                            onClick={handleDefault}
                            title='Default'
                        >
                            <ClockCounterClockwiseIcon
                                className='size-4'
                                weight='bold'
                            />
                        </Button>
                        <Button
                            type='button'
                            variant='default'
                            size='icon'
                            disabled={
                                saveChangesMutation.isPending || !hasUnsavedChanges
                            }
                            onClick={handleSave}
                            title='Save Settings'
                        >
                            {saveChangesMutation.isPending ? (
                                <Spinner className='size-4' />
                            ) : (
                                <FloppyDiskIcon className='size-4' weight='bold' />
                            )}
                        </Button>
                    </div>
                </SettingsHeaderActionsPortal>
            )}
            <div className='space-y-4'>
                <ActionBarSearch
                    placeholder='Search entities...'
                    name='user-permissions-entity-search'
                    value={searchVal}
                    className='w-full min-w-0'
                    onValueChange={setSearchVal}
                    onClear={() => setSearchVal('')}
                />

                {/* Permissions Table */}
                <div className='overflow-hidden rounded-md border'>
                    {filteredEntities.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className='w-[60px]'>ID</TableHead>
                                    <TableHead className='w-[200px]'>Entity</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className='w-[160px]'>Access</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEntities.map((entity) => (
                                    <PermissionRow
                                        key={entity.id}
                                        entity={entity}
                                        currentAccess={
                                            currentAccess[entity.id] || 'none'
                                        }
                                        onAccessChange={handleAccessChange}
                                        isSaving={
                                            saveChangesMutation.isPending || !!readOnly
                                        }
                                    />
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className='text-center py-8'>
                            <p className='text-sm text-muted-foreground'>
                                {searchVal
                                    ? 'No entities found matching your search'
                                    : 'No entities available'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
