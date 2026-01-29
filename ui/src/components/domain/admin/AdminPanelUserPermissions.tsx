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
import useApi from '@/hooks/api/useApi';
import { naturalSort } from '@/utils/dashboard';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { AccessRequestAccessTypeEnum } from '@services/cradle/models';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

interface AdminPanelUserPermissionsProps {
    id: string;
}

interface PermissionEntity {
    id: number;
    name: string;
    description?: string;
    accessType: 'none' | 'read' | 'read-write';
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
    currentAccess: 'none' | 'read' | 'read-write';
    onAccessChange: (
        entityId: number,
        accessType: 'none' | 'read' | 'read-write',
    ) => void;
    isSaving: boolean;
}) {
    const handleChange = (newAccess: string) => {
        onAccessChange(entity.id, newAccess as 'none' | 'read' | 'read-write');
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

export default function AdminPanelUserPermissions({
    id,
}: AdminPanelUserPermissionsProps) {
    const [entities, setEntities] = useState<PermissionEntity[]>([]);
    const [originalAccess, setOriginalAccess] = useState<
        Record<number, 'none' | 'read' | 'read-write'>
    >({});
    const [currentAccess, setCurrentAccess] = useState<
        Record<number, 'none' | 'read' | 'read-write'>
    >({});
    const [searchVal, setSearchVal] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const { accessApi } = useApi();
    const queryClient = useQueryClient();

    useEffect(() => {
        const fetchPermissions = async () => {
            setIsLoading(true);
            try {
                const permissions = await accessApi.accessUserList({
                    userId: String(id),
                });
                const fetchedEntities = permissions.map((c) => ({
                    id: c.id,
                    name: c.name,
                    description: (c as { description?: string }).description,
                    accessType: (c.accessType ??
                        'none') as PermissionEntity['accessType'],
                }));
                setEntities(fetchedEntities);

                // Initialize original and current access
                const original: Record<number, 'none' | 'read' | 'read-write'> = {};
                const current: Record<number, 'none' | 'read' | 'read-write'> = {};
                fetchedEntities.forEach((entity) => {
                    original[entity.id] = entity.accessType;
                    current[entity.id] = entity.accessType;
                });
                setOriginalAccess(original);
                setCurrentAccess(current);
            } catch (error) {
                setEntities([]);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchPermissions();
        }
    }, [id, accessApi]);

    const handleAccessChange = (
        entityId: number,
        accessType: 'none' | 'read' | 'read-write',
    ) => {
        setCurrentAccess((prev) => ({
            ...prev,
            [entityId]: accessType,
        }));
    };

    const hasChanges = () => {
        return entities.some((entity) => {
            const original = originalAccess[entity.id];
            const current = currentAccess[entity.id];
            return original !== current;
        });
    };

    const saveChangesMutation = useMutation({
        mutationFn: async () => {
            const updates: Array<{
                entityId: number;
                accessType: AccessRequestAccessTypeEnum;
            }> = [];

            entities.forEach((entity) => {
                const original = originalAccess[entity.id];
                const current = currentAccess[entity.id];
                if (original !== current) {
                    updates.push({
                        entityId: entity.id,
                        accessType: current as AccessRequestAccessTypeEnum,
                    });
                }
            });

            // Save all changes
            await Promise.all(
                updates.map((update) =>
                    accessApi.accessUserUpdate({
                        userId: String(id),
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
            // Invalidate queries to refresh data
            queryClient.invalidateQueries();
        },
    });

    const handleSave = () => {
        saveChangesMutation.mutate();
    };

    // Filter entities based on search
    const filteredEntities = entities
        .filter((entity) => {
            const searchKey =
                `${entity.name || ''} ${entity.description || ''}`.toLowerCase();
            return searchKey.includes(searchVal.toLowerCase());
        })
        .sort((a, b) => naturalSort(a.name || '', b.name || ''));

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                <Spinner className='size-10' />
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
                                    currentAccess={
                                        currentAccess[entity.id] || entity.accessType
                                    }
                                    onAccessChange={handleAccessChange}
                                    isSaving={saveChangesMutation.isPending}
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
            <div className='flex justify-end pt-4'>
                <Button
                    type='button'
                    onClick={handleSave}
                    disabled={saveChangesMutation.isPending || !hasChanges()}
                >
                    {saveChangesMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
}
