import { Card, CardContent } from '@/components/ui/card';
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
import { AccessRequestAccessTypeEnum } from '@services/cradle/models';
import { useMutation } from '@tanstack/react-query';
import { MagnifyingGlassIcon } from '@phosphor-icons/react';
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
    userId,
}: {
    entity: PermissionEntity;
    userId: string;
}) {
    const [currentAccess, setCurrentAccess] = useState(entity.accessType);
    const { accessApi } = useApi();

    const updateAccessMutation = useMutation({
        mutationFn: async (accessType: AccessRequestAccessTypeEnum) => {
            await accessApi.accessUserUpdate({
                userId: userId,
                entityId: entity.id,
                accessRequest: { accessType },
            });
        },
        meta: {
            successMessage: 'Access updated successfully',
        },
        onSuccess: (_, accessType) => {
            setCurrentAccess(accessType as PermissionEntity['accessType']);
        },
    });

    const handleChange = (newAccess: string) => {
        if (currentAccess !== newAccess) {
            updateAccessMutation.mutate(newAccess as AccessRequestAccessTypeEnum);
        }
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
                    disabled={updateAccessMutation.isPending}
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
    const [searchVal, setSearchVal] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const { accessApi } = useApi();

    useEffect(() => {
        const fetchPermissions = async () => {
            setIsLoading(true);
            try {
                const permissions = await accessApi.accessUserList({
                    userId: String(id),
                });
                setEntities(
                    permissions.map((c) => ({
                        id: c.id,
                        name: c.name,
                        description: (c as { description?: string }).description,
                        accessType: (c.accessType ?? 'none') as PermissionEntity['accessType'],
                    })),
                );
            } catch (error) {
                setEntities([]);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            fetchPermissions();
        }
    }, [id]);

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
            <div className='flex items-center justify-center min-h-[200px]'>
                <Spinner className='size-8' />
            </div>
        );
    }

    return (
        <div className='space-y-4'>
            {/* Search */}
            <div className='relative'>
                <MagnifyingGlassIcon className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' weight="bold" />
                <Input
                    type='text'
                    placeholder='Search entities...'
                    className='pl-9'
                    onChange={(e) => setSearchVal(e.target.value)}
                    value={searchVal}
                />
            </div>

            {/* Permissions Table */}
            <Card className='rounded-lg border-border bg-muted/5'>
                <CardContent className='p-0'>
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
                                        userId={id}
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
                </CardContent>
            </Card>
        </div>
    );
}
