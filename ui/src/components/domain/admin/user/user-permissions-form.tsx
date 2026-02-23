import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import useApi from '@/hooks/api/use-api';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { AccessRequestAccessTypeEnum } from '@services/cradle/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    const { accessApi } = useApi();
    const queryClient = useQueryClient();

    const permissionsQuery = useQuery({
        queryKey: ['accessUserList', id],
        queryFn: () => accessApi.accessUserList({ userId: id }),
        enabled: !!id,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    const entities: PermissionEntity[] = useMemo(() => {
        const permissions = permissionsQuery.data ?? [];
        return permissions.map((c) => ({
            id: c.id,
            name: c.name,
            description: (c as { description?: string }).description,
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

        permissions.forEach((c) => {
            const accessType = (c.accessType ?? 'none') as AccessType;
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
                Array<{ entityId: number; accessType: AccessRequestAccessTypeEnum }>
            >((acc, entity) => {
                const original = originalAccess[entity.id];
                const current = currentAccess[entity.id];
                if (original !== current) {
                    acc.push({
                        entityId: entity.id,
                        accessType: current as AccessRequestAccessTypeEnum,
                    });
                }
                return acc;
            }, []);

            if (updates.length === 0) return;

            // Save all changes
            await Promise.all(
                updates.map((update) =>
                    accessApi.accessUserUpdate({
                        userId: id,
                        entityId: update.entityId,
                        accessRequest: { accessType: update.accessType },
                    }),
                ),
            );
        },
        meta: {
            successMessage: 'Permissions updated successfully',
        },
        onSuccess: () => {
            // Update original access to match current
            setOriginalAccess({ ...currentAccess });
            queryClient.invalidateQueries({ queryKey: ['accessUserList', id] });
        },
    });

    const handleSave = () => {
        saveChangesMutation.mutate();
    };

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
        <div className='space-y-4'>
            {/* Search */}
            <div className='relative'>
                <MagnifyingGlassIcon
                    className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground'
                    weight='bold'
                />
                <Input
                    type='text'
                    placeholder='Search entities...'
                    className='pl-9'
                    onChange={(e) => setSearchVal(e.target.value)}
                    value={searchVal}
                />
            </div>

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
                                    currentAccess={currentAccess[entity.id] || 'none'}
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

            {/* Save Changes Button */}
            {!readOnly && (
                <div className='flex justify-end pt-4'>
                    <Button
                        type='button'
                        onClick={handleSave}
                        disabled={saveChangesMutation.isPending || !hasUnsavedChanges}
                    >
                        {saveChangesMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            )}
        </div>
    );
}
