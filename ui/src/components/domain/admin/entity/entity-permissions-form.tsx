import { SettingsHeaderActionsPortal } from '@/components/domain/settings-header-actions';
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
import { useNdjsonQuery } from '@/hooks/query';
import {
    ArrowCounterClockwiseIcon,
    ClockCounterClockwiseIcon,
    FloppyDiskIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type AccessLevel = 'none' | 'read' | 'read-write';

interface EntityPermissionsFormProps {
    entityId: number;
}

const ACCESS_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'read', label: 'Read' },
    { value: 'read-write', label: 'Read-Write' },
];

export default function EntityPermissionsForm({
    entityId,
}: EntityPermissionsFormProps) {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [originalAccess, setOriginalAccess] = useState<Record<string, AccessLevel>>(
        {},
    );
    const [currentAccess, setCurrentAccess] = useState<Record<string, AccessLevel>>({});

    const { data: allAccessData = [], isLoading } = useNdjsonQuery({
        path: '/access/entity/{entity_id}/stream/',
        params: { path: { entity_id: entityId } },
        queryKey: ['get', '/access/entity/{entity_id}/', entityId],
        enabled: !!entityId,
    });

    const accessData = useMemo(() => {
        if (!searchQuery.trim()) return allAccessData;
        const query = searchQuery.toLowerCase();
        return allAccessData.filter(
            (access) =>
                (access.user.username?.toLowerCase() ?? '').includes(query) ||
                (access.user.id?.toLowerCase() ?? '').includes(query),
        );
    }, [allAccessData, searchQuery]);

    useEffect(() => {
        if (allAccessData.length > 0) {
            const original: Record<string, AccessLevel> = {};
            const current: Record<string, AccessLevel> = {};
            allAccessData.forEach((access) => {
                if (access.user.id) {
                    const accessType = access.access_type as AccessLevel;
                    original[access.user.id] = accessType;
                    current[access.user.id] = accessType;
                }
            });
            setOriginalAccess(original);
            setCurrentAccess(current);
        }
    }, [allAccessData]);

    const handleAccessChange = (userId: string, newAccess: string) => {
        const accessValue = newAccess as AccessLevel;
        setCurrentAccess((prev) => ({
            ...prev,
            [userId]: accessValue,
        }));
    };

    const hasChanges = () => {
        if (allAccessData.length === 0) return false;
        return allAccessData.some((access) => {
            const userId = access.user.id;
            if (!userId) return false;
            const original = originalAccess[userId];
            const current = currentAccess[userId];
            return original !== current;
        });
    };

    const saveChangesMutation = useMutation({
        mutationFn: async () => {
            if (allAccessData.length === 0) return;

            const updates: Array<{ userId: string; accessType: AccessLevel }> = [];

            allAccessData.forEach((access) => {
                const userId = access.user.id;
                if (!userId) return;
                const original = originalAccess[userId];
                const current = currentAccess[userId];
                if (original !== current) {
                    updates.push({
                        userId,
                        accessType: current,
                    });
                }
            });

            await Promise.all(
                updates.map(async (update) => {
                    const { error, response } = await fetchClient.PUT(
                        '/access/user/{user_id}/{entity_id}/',
                        {
                            params: {
                                path: {
                                    user_id: update.userId,
                                    entity_id: entityId,
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
                queryKey: ['get', '/access/entity/{entity_id}/', entityId],
            });
        },
    });

    const handleSave = () => {
        saveChangesMutation.mutate();
    };

    const handleRevert = () => {
        setCurrentAccess({ ...originalAccess });
    };

    const handleDefault = () => {
        const defaults: Record<string, AccessLevel> = {};
        allAccessData.forEach((access) => {
            if (access.user.id) defaults[access.user.id] = 'none';
        });
        setCurrentAccess(defaults);
    };

    const isAtDefault =
        allAccessData.length > 0 &&
        allAccessData.every(
            (access) => (currentAccess[access.user.id ?? ''] ?? 'none') === 'none',
        );

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    return (
        <>
            <SettingsHeaderActionsPortal>
                <div className='flex items-center gap-2'>
                    <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        disabled={!hasChanges()}
                        onClick={handleRevert}
                        title='Revert'
                    >
                        <ArrowCounterClockwiseIcon className='size-4' weight='bold' />
                    </Button>
                    <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        disabled={isAtDefault}
                        onClick={handleDefault}
                        title='Default'
                    >
                        <ClockCounterClockwiseIcon className='size-4' weight='bold' />
                    </Button>
                    <Button
                        type='button'
                        variant='default'
                        size='icon'
                        disabled={saveChangesMutation.isPending || !hasChanges()}
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
            <form className='w-full h-full flex flex-col space-y-4'>
                <div className='relative'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
                    <Input
                        placeholder='Search users...'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-9'
                    />
                </div>

                <div className='overflow-hidden rounded-md border'>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className='w-[60px]'>ID</TableHead>
                                <TableHead className='w-[200px]'>User</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className='w-[160px]'>Access</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {accessData.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className='text-center text-muted-foreground py-8'
                                    >
                                        No users found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                accessData
                                    .filter((access) => access.user.id)
                                    .map((access) => {
                                        const user = access.user;
                                        const userId = user.id as string;
                                        const accessValue =
                                            currentAccess[userId] ||
                                            (access.access_type as AccessLevel);

                                        return (
                                            <TableRow key={userId}>
                                                <TableCell className='text-muted-foreground'>
                                                    {userId.slice(0, 8)}
                                                </TableCell>
                                                <TableCell className='font-medium'>
                                                    {user.username}
                                                </TableCell>
                                                <TableCell className='text-muted-foreground text-sm'>
                                                    -
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={accessValue}
                                                        onValueChange={(value) =>
                                                            handleAccessChange(
                                                                userId,
                                                                value,
                                                            )
                                                        }
                                                        disabled={
                                                            saveChangesMutation.isPending
                                                        }
                                                    >
                                                        <SelectTrigger className='w-[140px]'>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {ACCESS_OPTIONS.map(
                                                                (option) => (
                                                                    <SelectItem
                                                                        key={
                                                                            option.value
                                                                        }
                                                                        value={
                                                                            option.value
                                                                        }
                                                                    >
                                                                        {option.label}
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </form>
        </>
    );
}
