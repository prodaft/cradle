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
import { AccessUser } from '@services/cradle/models';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    const { accessApi } = useApi();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [originalAccess, setOriginalAccess] = useState<Record<string, AccessLevel>>(
        {},
    );
    const [currentAccess, setCurrentAccess] = useState<Record<string, AccessLevel>>({});

    // Query for access data — fetches full list (no server-side search)
    // because the form needs the complete dataset to track unsaved edits
    const { data: allAccessData = [], isPending } = useQuery({
        queryKey: ['entities', 'access', String(entityId)],
        queryFn: () => accessApi.accessEntityList({ entityId }),
        enabled: !!entityId,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    // Client-side search — preserves unsaved permission changes
    const accessData = useMemo(() => {
        if (!searchQuery.trim()) return allAccessData;
        const query = searchQuery.toLowerCase();
        return allAccessData.filter(
            (access: AccessUser) =>
                access.user.username?.toLowerCase().includes(query) ||
                access.user.id?.toLowerCase().includes(query),
        );
    }, [allAccessData, searchQuery]);

    // Initialize access states when data loads
    useEffect(() => {
        if (allAccessData.length > 0) {
            const original: Record<string, AccessLevel> = {};
            const current: Record<string, AccessLevel> = {};
            allAccessData.forEach((access: AccessUser) => {
                if (access.user.id) {
                    const accessType = access.accessType as AccessLevel;
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
        return allAccessData.some((access: AccessUser) => {
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

            allAccessData.forEach((access: AccessUser) => {
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

            // Save all changes
            await Promise.all(
                updates.map((update) =>
                    accessApi.accessUserUpdate({
                        userId: update.userId,
                        entityId,
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


    if (isPending) {
        return (
            <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    return (
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
                            accessData.map((access: AccessUser) => {
                                const user = access.user;
                                const userId = user.id!;
                                const accessValue =
                                    currentAccess[userId] ||
                                    (access.accessType as AccessLevel);

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
                                                    handleAccessChange(userId, value)
                                                }
                                                disabled={saveChangesMutation.isPending}
                                            >
                                                <SelectTrigger className='w-[140px]'>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ACCESS_OPTIONS.map((option) => (
                                                        <SelectItem
                                                            key={option.value}
                                                            value={option.value}
                                                        >
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
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

            {/* Save Changes Button */}
            <div className='flex justify-end'>
                <Button
                    type='button'
                    onClick={handleSave}
                    disabled={saveChangesMutation.isPending || !hasChanges()}
                >
                    {saveChangesMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
}
