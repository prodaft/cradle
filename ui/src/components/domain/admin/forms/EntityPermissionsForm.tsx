import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import useApi from '@/hooks/api/useApi';
import { AccessUser } from '@services/cradle/models';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [accessStates, setAccessStates] = useState<Record<string, AccessLevel>>({});

    // Query for access data
    const { data: accessData, isPending } = useQuery({
        queryKey: ['entities', 'access', String(entityId)],
        queryFn: () => accessApi.accessEntityList({ entityId }),
        enabled: !!entityId,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    // Initialize access states when data loads
    useMemo(() => {
        if (accessData) {
            const states: Record<string, AccessLevel> = {};
            accessData.forEach((access: AccessUser) => {
                if (access.user.id) {
                    states[access.user.id] = access.accessType as AccessLevel;
                }
            });
            setAccessStates(states);
        }
    }, [accessData]);

    const updateAccessMutation = useMutation({
        mutationFn: async ({
            userId,
            accessType,
        }: {
            userId: string;
            accessType: AccessLevel;
        }) => {
            await accessApi.accessUserUpdate({
                userId,
                entityId,
                accessRequest: { accessType },
            });
        },
        meta: {
            successMessage: 'Access updated successfully',
        },
        onSuccess: (_, { userId, accessType }) => {
            setAccessStates((prev) => ({ ...prev, [userId]: accessType }));
        },
    });

    const handleAccessChange = (userId: string, newAccess: string) => {
        const accessValue = newAccess as AccessLevel;
        if (accessStates[userId] !== accessValue) {
            updateAccessMutation.mutate({ userId, accessType: accessValue });
        }
    };

    const filteredAccesses = useMemo(() => {
        if (!accessData) return [];
        if (!searchQuery.trim()) return accessData;

        const query = searchQuery.toLowerCase();
        return accessData.filter(
            (access: AccessUser) =>
                access.user.username?.toLowerCase().includes(query) ||
                access.user.id?.toLowerCase().includes(query),
        );
    }, [accessData, searchQuery]);

    if (isPending) {
        return (
            <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                <Spinner />
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

            <Card className='border-border bg-muted/5'>
                <CardContent className='p-0'>
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
                            {filteredAccesses.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className='text-center text-muted-foreground py-8'
                                    >
                                        No users found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAccesses.map((access: AccessUser) => {
                                    const user = access.user;
                                    const userId = user.id!;
                                    const currentAccess =
                                        accessStates[userId] || access.accessType;

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
                                                    value={currentAccess}
                                                    onValueChange={(value) =>
                                                        handleAccessChange(userId, value)
                                                    }
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
                </CardContent>
            </Card>
        </form>
    );
}
