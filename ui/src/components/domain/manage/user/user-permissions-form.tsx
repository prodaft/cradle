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

interface UserPermissionsFormProps {
    id: string;
    readOnly?: boolean;
}

type AccessType = 'none' | 'read' | 'read-write';

type AccessEntity = components['schemas']['AccessEntity'];

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

export default function UserPermissionsForm({
    id,
    readOnly,
}: UserPermissionsFormProps) {
    const [originalAccess, setOriginalAccess] = useState<Record<number, AccessType>>(
        {},
    );
    const [currentAccess, setCurrentAccess] = useState<Record<number, AccessType>>({});
    const [searchVal, setSearchVal] = useState('');
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 20,
    });
    const queryClient = useQueryClient();

    const trimmedSearch = searchVal.trim();

    const accessMapsRef = useRef({
        original: {} as Record<number, AccessType>,
        current: {} as Record<number, AccessType>,
    });
    accessMapsRef.current.original = originalAccess;
    accessMapsRef.current.current = currentAccess;

    const hasLoadedListContextRef = useRef(false);

    const permissionsQuery = useQuery({
        queryKey: [
            'get',
            '/access/user/{user_id}/',
            id,
            pagination.pageIndex + 1,
            pagination.pageSize,
            trimmedSearch,
        ],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/access/user/{user_id}/',
                {
                    params: {
                        path: { user_id: id },
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
        enabled: !!id,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    const pageData = permissionsQuery.data;
    const totalPages = Math.max(1, pageData?.total_pages ?? 1);

    const entities: PermissionEntity[] = useMemo(() => {
        const results = pageData?.results ?? [];
        return results.map((c: AccessEntity) => ({
            id: c.id,
            name: c.name,
            description: undefined,
        }));
    }, [pageData?.results]);

    useLayoutEffect(() => {
        hasLoadedListContextRef.current = false;
        setOriginalAccess({});
        setCurrentAccess({});
        setSearchVal('');
        setPagination((p) => ({ pageIndex: 0, pageSize: p.pageSize }));
    }, [id]);

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

        for (const row of results as AccessEntity[]) {
            const entityId = row.id;
            const server = row.access_type;
            const orig = prevOriginal[entityId];
            const cur = prevCurrent[entityId];
            const dirty = orig !== undefined && cur !== undefined && orig !== cur;
            if (dirty) {
                nextOriginal[entityId] = orig;
                nextCurrent[entityId] = cur;
            } else {
                nextOriginal[entityId] = server;
                nextCurrent[entityId] = server;
            }
        }

        setOriginalAccess(nextOriginal);
        setCurrentAccess(nextCurrent);
    }, [pageData]);

    const handleAccessChange = useCallback(
        (entityId: number, accessType: AccessType) => {
            setCurrentAccess((prev) => ({
                ...prev,
                [entityId]: accessType,
            }));
        },
        [],
    );

    const hasUnsavedChanges = useMemo(() => {
        const keys = new Set([
            ...Object.keys(originalAccess),
            ...Object.keys(currentAccess),
        ]);
        for (const k of keys) {
            const entityId = Number(k);
            if (originalAccess[entityId] !== currentAccess[entityId]) return true;
        }
        return false;
    }, [originalAccess, currentAccess]);

    const saveChangesMutation = useMutation({
        mutationFn: async () => {
            const keys = new Set([
                ...Object.keys(originalAccess),
                ...Object.keys(currentAccess),
            ]);
            const updates: Array<{ entityId: number; accessType: AccessType }> = [];
            for (const k of keys) {
                const entityId = Number(k);
                const original = originalAccess[entityId];
                const current = currentAccess[entityId];
                if (original !== current && current !== undefined) {
                    updates.push({
                        entityId,
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
            const saved = { ...accessMapsRef.current.current };
            setOriginalAccess(saved);
            setCurrentAccess(saved);
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
        const defaults: Record<number, AccessType> = { ...currentAccess };
        entities.forEach((e) => {
            defaults[e.id] = 'none';
        });
        setCurrentAccess(defaults);
    };

    const isAtDefault =
        entities.length > 0 &&
        entities.every((e) => (currentAccess[e.id] ?? 'none') === 'none');

    const emptyMessage = searchVal.trim()
        ? 'No entities found matching your search'
        : 'No entities available';

    const handleSearchChange = useCallback((value: string) => {
        setSearchVal(value);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, []);

    const columns = useMemo<ColumnDef<PermissionEntity>[]>(
        () => [
            {
                accessorKey: 'id',
                header: 'ID',
                meta: { label: 'ID' },
                cell: ({ row }) => (
                    <span className='text-muted-foreground'>{row.original.id}</span>
                ),
                size: 60,
            },
            {
                accessorKey: 'name',
                header: 'Entity',
                meta: { label: 'Entity' },
                cell: ({ row }) => (
                    <span className='font-medium'>{row.original.name}</span>
                ),
                size: 200,
            },
            {
                accessorKey: 'description',
                header: 'Description',
                meta: { label: 'Description' },
                cell: ({ row }) => (
                    <span className='text-muted-foreground text-sm'>
                        {row.original.description ?? '-'}
                    </span>
                ),
            },
            {
                id: 'access',
                header: 'Access',
                meta: { label: 'Access' },
                enableHiding: false,
                cell: ({ row }) => {
                    const entity = row.original;
                    const value = currentAccess[entity.id] ?? 'none';
                    const disabled = saveChangesMutation.isPending || !!readOnly;
                    return (
                        <div onClick={(e) => e.stopPropagation()}>
                            <Select
                                value={value}
                                onValueChange={(v) =>
                                    handleAccessChange(entity.id, v as AccessType)
                                }
                                disabled={disabled}
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
        [currentAccess, handleAccessChange, readOnly, saveChangesMutation.isPending],
    );

    const table = useReactTable({
        data: entities,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: totalPages,
        getRowId: (row) => String(row.id),
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
                <div className='flex w-full min-w-0 shrink-0 items-start justify-between gap-2 py-1'>
                    <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2'>
                        <ActionBarSearch
                            placeholder='Search entities...'
                            name='user-permissions-entity-search'
                            value={searchVal}
                            debounceMs={300}
                            onDebouncedChange={handleSearchChange}
                            onSubmit={handleSearchChange}
                            onClear={() => handleSearchChange('')}
                            disabled={hasUnsavedChanges || !!readOnly}
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
                    paginationDisabled={hasUnsavedChanges || !!readOnly}
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
