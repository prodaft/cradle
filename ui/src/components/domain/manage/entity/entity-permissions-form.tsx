import { ActionBarSearch } from '@/components/base/action-bar/action-bar';
import { DataTable } from '@/components/custom/data-table/data-table';
import { DataTableViewOptions } from '@/components/custom/data-table/data-table-view-options';
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
    ArrowCounterClockwiseIcon,
    ClockCounterClockwiseIcon,
    FloppyDiskIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

type AccessLevel = 'none' | 'read' | 'read-write';

interface EntityPermissionsFormProps {
    entityId: number;
}

interface EntityUserRow {
    userId: string;
    shortId: string;
    username: string;
    description: string;
}

const ACCESS_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'read', label: 'Read' },
    { value: 'read-write', label: 'Read-Write' },
];

type AccessUser = components['schemas']['AccessUser'];

export default function EntityPermissionsForm({
    entityId,
}: EntityPermissionsFormProps) {
    const queryClient = useQueryClient();
    const [searchVal, setSearchVal] = useState('');
    const [originalAccess, setOriginalAccess] = useState<Record<string, AccessLevel>>(
        {},
    );
    const [currentAccess, setCurrentAccess] = useState<Record<string, AccessLevel>>({});
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 20,
    });

    const accessMapsRef = useRef({
        original: {} as Record<string, AccessLevel>,
        current: {} as Record<string, AccessLevel>,
    });
    accessMapsRef.current.original = originalAccess;
    accessMapsRef.current.current = currentAccess;

    const hasLoadedListContextRef = useRef(false);

    const trimmedSearch = searchVal.trim();

    const permissionsQuery = useQuery({
        queryKey: [
            'get',
            '/access/entity/{entity_id}/',
            entityId,
            pagination.pageIndex + 1,
            pagination.pageSize,
            trimmedSearch,
        ],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/access/entity/{entity_id}/',
                {
                    params: {
                        path: { entity_id: entityId },
                        query: {
                            page: pagination.pageIndex + 1,
                            page_size: pagination.pageSize,
                            ...(trimmedSearch ? { search: trimmedSearch } : {}),
                        },
                    },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        enabled: !!entityId,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    const pageData = permissionsQuery.data;
    const totalPages = Math.max(1, pageData?.total_pages ?? 1);

    const userRows: EntityUserRow[] = useMemo(() => {
        const results = pageData?.results ?? [];
        return results
            .filter(
                (
                    access,
                ): access is AccessUser & { user: NonNullable<AccessUser['user']> } =>
                    Boolean(access.user?.id),
            )
            .map((access) => {
                const userId = access.user.id as string;
                return {
                    userId,
                    shortId: userId.slice(0, 8),
                    username: access.user.username ?? '',
                    description: '-',
                };
            });
    }, [pageData?.results]);

    useLayoutEffect(() => {
        hasLoadedListContextRef.current = false;
        setOriginalAccess({});
        setCurrentAccess({});
        setSearchVal('');
        setPagination((p) => ({ pageIndex: 0, pageSize: p.pageSize }));
    }, [entityId]);

    useLayoutEffect(() => {
        hasLoadedListContextRef.current = false;
        setOriginalAccess({});
        setCurrentAccess({});
        setPagination((p) => ({ pageIndex: 0, pageSize: p.pageSize }));
    }, [trimmedSearch]);

    useEffect(() => {
        if (permissionsQuery.isSuccess && permissionsQuery.data !== undefined) {
            hasLoadedListContextRef.current = true;
        }
    }, [permissionsQuery.isSuccess, permissionsQuery.data]);

    useEffect(() => {
        if (!pageData) return;
        const maxIndex = Math.max(0, (pageData.total_pages ?? 1) - 1);
        setPagination((p) =>
            p.pageIndex > maxIndex ? { ...p, pageIndex: maxIndex } : p,
        );
    }, [pageData?.total_pages, pageData]);

    useEffect(() => {
        if (!pageData) return;
        if (pageData.count === 0) {
            setOriginalAccess({});
            setCurrentAccess({});
            return;
        }

        const results = pageData.results;
        if (!results) return;

        const prevOriginal = accessMapsRef.current.original;
        const prevCurrent = accessMapsRef.current.current;
        const nextOriginal = { ...prevOriginal };
        const nextCurrent = { ...prevCurrent };

        for (const access of results as AccessUser[]) {
            const userId = access.user?.id;
            if (!userId) continue;
            const server = access.access_type;
            const orig = prevOriginal[userId];
            const cur = prevCurrent[userId];
            const dirty = orig !== undefined && cur !== undefined && orig !== cur;
            if (dirty) {
                nextOriginal[userId] = orig;
                nextCurrent[userId] = cur;
            } else {
                nextOriginal[userId] = server;
                nextCurrent[userId] = server;
            }
        }

        setOriginalAccess(nextOriginal);
        setCurrentAccess(nextCurrent);
    }, [pageData]);

    const handleAccessChange = useCallback((userId: string, newAccess: AccessLevel) => {
        setCurrentAccess((prev) => ({
            ...prev,
            [userId]: newAccess,
        }));
    }, []);

    const hasUnsavedChanges = useMemo(() => {
        const keys = new Set([
            ...Object.keys(originalAccess),
            ...Object.keys(currentAccess),
        ]);
        for (const userId of keys) {
            if (originalAccess[userId] !== currentAccess[userId]) return true;
        }
        return false;
    }, [originalAccess, currentAccess]);

    const saveChangesMutation = useMutation({
        mutationFn: async () => {
            const keys = new Set([
                ...Object.keys(originalAccess),
                ...Object.keys(currentAccess),
            ]);
            const updates: Array<{ userId: string; accessType: AccessLevel }> = [];
            for (const userId of keys) {
                const original = originalAccess[userId];
                const current = currentAccess[userId];
                if (original !== current && current !== undefined) {
                    updates.push({
                        userId,
                        accessType: current,
                    });
                }
            }

            if (updates.length === 0) return;

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
            const saved = { ...accessMapsRef.current.current };
            setOriginalAccess(saved);
            setCurrentAccess(saved);
            queryClient.invalidateQueries({
                queryKey: ['get', '/access/entity/{entity_id}/', entityId],
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
        const defaults: Record<string, AccessLevel> = { ...currentAccess };
        userRows.forEach((row) => {
            defaults[row.userId] = 'none';
        });
        setCurrentAccess(defaults);
    };

    const isAtDefault =
        userRows.length > 0 &&
        userRows.every((row) => (currentAccess[row.userId] ?? 'none') === 'none');

    const emptyMessage = searchVal.trim()
        ? 'No users found matching your search'
        : 'No users available';

    const handleSearchChange = useCallback((value: string) => {
        setSearchVal(value);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, []);

    const columns = useMemo<ColumnDef<EntityUserRow>[]>(
        () => [
            {
                accessorKey: 'shortId',
                header: 'ID',
                meta: { label: 'ID' },
                cell: ({ row }) => (
                    <span className='text-muted-foreground'>
                        {row.original.shortId}
                    </span>
                ),
                size: 60,
            },
            {
                accessorKey: 'username',
                header: 'User',
                meta: { label: 'User' },
                cell: ({ row }) => (
                    <span className='font-medium'>{row.original.username}</span>
                ),
                size: 200,
            },
            {
                accessorKey: 'description',
                header: 'Description',
                meta: { label: 'Description' },
                cell: ({ row }) => (
                    <span className='text-muted-foreground text-sm'>
                        {row.original.description}
                    </span>
                ),
            },
            {
                id: 'access',
                header: 'Access',
                meta: { label: 'Access' },
                enableHiding: false,
                cell: ({ row }) => {
                    const { userId } = row.original;
                    const value = currentAccess[userId] ?? 'none';
                    return (
                        <div onClick={(e) => e.stopPropagation()}>
                            <Select
                                value={value}
                                onValueChange={(v) =>
                                    handleAccessChange(userId, v as AccessLevel)
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
                        </div>
                    );
                },
                size: 160,
            },
        ],
        [currentAccess, handleAccessChange, saveChangesMutation.isPending],
    );

    const table = useReactTable({
        data: userRows,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: totalPages,
        getRowId: (row) => row.userId,
    });

    if (permissionsQuery.isPending && !hasLoadedListContextRef.current) {
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
                        disabled={saveChangesMutation.isPending || !hasUnsavedChanges}
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
            <div className='flex w-full h-full flex-col space-y-4'>
                <div className='flex w-full min-w-0 shrink-0 items-start justify-between gap-2 py-1'>
                    <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
                        <ActionBarSearch
                            placeholder='Search users...'
                            name='entity-permissions-user-search'
                            value={searchVal}
                            debounceMs={300}
                            onDebouncedChange={handleSearchChange}
                            onSubmit={handleSearchChange}
                            onClear={() => handleSearchChange('')}
                            disabled={hasUnsavedChanges}
                            className='w-72 max-w-full min-w-0'
                        />
                    </div>
                    <div className='flex shrink-0 items-center gap-2'>
                        <DataTableViewOptions table={table} />
                    </div>
                </div>
                <DataTable
                    table={table}
                    density='compact'
                    emptyMessage={emptyMessage}
                    showPagination={
                        (pageData?.count ?? 0) > 0 || permissionsQuery.isFetching
                    }
                    paginationDisabled={hasUnsavedChanges}
                    isLoading={
                        hasLoadedListContextRef.current &&
                        permissionsQuery.isFetching &&
                        !pageData
                    }
                />
            </div>
        </>
    );
}
