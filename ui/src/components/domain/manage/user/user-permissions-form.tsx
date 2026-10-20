import { SearchInput } from '@/components/base/search-input/search-input';
import {
    SettingsHeaderActionsPortal,
    SettingsSaveButton,
} from '@/components/base/settings-header-actions/settings-header-actions';
import { DataTable } from '@/components/custom/data-table/data-table';
import { DataTableViewOptions } from '@/components/custom/data-table/data-table-view-options';
import { ACCESS_OPTIONS } from '@/components/domain/manage/access-options';
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
    EMPTY_SEARCH_STATE,
    FREE_TEXT_SCHEMA,
    type SearchState,
} from '@/lib/search-query/search-schema';
import {} from '@phosphor-icons/react';
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

type AccessEntity = components['schemas']['AccessEntity'];
type AccessType = (typeof ACCESS_OPTIONS)[number]['value'];

interface PermissionEntity {
    id: number;
    name: string;
    teamAccess: AccessType;
}

export default function UserPermissionsForm({
    id,
    readOnly,
}: UserPermissionsFormProps) {
    const [originalAccess, setOriginalAccess] = useState<Record<number, AccessType>>(
        {},
    );
    const [currentAccess, setCurrentAccess] = useState<Record<number, AccessType>>({});
    const [appliedSearch, setAppliedSearch] = useState('');
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 20,
    });
    const queryClient = useQueryClient();

    const accessMapsRef = useRef({
        original: {} as Record<number, AccessType>,
        current: {} as Record<number, AccessType>,
    });
    accessMapsRef.current.original = originalAccess;
    accessMapsRef.current.current = currentAccess;

    const hydratedRef = useRef(false);

    const {
        data: permissions,
        isPending,
        isFetching,
        isError,
        isSuccess,
        refetch,
    } = useQuery({
        queryKey: [
            'get',
            '/users/{user_id}/access/',
            id,
            pagination.pageIndex + 1,
            pagination.pageSize,
            appliedSearch,
        ],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/users/{user_id}/access/',
                {
                    params: {
                        path: { user_id: id },
                        query: {
                            page: pagination.pageIndex + 1,
                            page_size: pagination.pageSize,
                            ...(appliedSearch ? { search: appliedSearch } : {}),
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

    const totalPages = Math.max(1, permissions?.total_pages ?? 1);

    const entities: PermissionEntity[] = useMemo(() => {
        const results = permissions?.results ?? [];
        return results.map((c: AccessEntity) => ({
            id: c.id,
            name: c.name,
            teamAccess: c.team_access_type ?? 'none',
        }));
    }, [permissions?.results]);

    useLayoutEffect(() => {
        hydratedRef.current = false;
        setOriginalAccess({});
        setCurrentAccess({});
        setAppliedSearch('');
        setPagination((p) => ({ pageIndex: 0, pageSize: p.pageSize }));
    }, [id]);

    useLayoutEffect(() => {
        setPagination((p) => ({ pageIndex: 0, pageSize: p.pageSize }));
    }, [appliedSearch]);

    useEffect(() => {
        if (isSuccess && permissions !== undefined) {
            hydratedRef.current = true;
        }
    }, [isSuccess, permissions]);

    useEffect(() => {
        if (!permissions) return;
        const maxIndex = Math.max(0, (permissions.total_pages ?? 1) - 1);
        setPagination((p) =>
            p.pageIndex > maxIndex ? { ...p, pageIndex: maxIndex } : p,
        );
    }, [permissions?.total_pages, permissions]);

    useEffect(() => {
        if (!permissions) return;

        const results = permissions.results;
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
            const isRowDirty = orig !== undefined && cur !== undefined && orig !== cur;
            if (isRowDirty) {
                nextOriginal[entityId] = orig;
                nextCurrent[entityId] = cur;
            } else {
                nextOriginal[entityId] = server;
                nextCurrent[entityId] = server;
            }
        }

        setOriginalAccess(nextOriginal);
        setCurrentAccess(nextCurrent);
    }, [permissions]);

    const updateAccess = useCallback((entityId: number, accessType: AccessType) => {
        setCurrentAccess((prev) => ({
            ...prev,
            [entityId]: accessType,
        }));
    }, []);

    const isDirty = useMemo(() => {
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

    const savePermissions = useMutation({
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
                        '/entries/entities/{entity_id}/access/users/{user_id}/',
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
                queryKey: ['get', '/users/{user_id}/access/', id],
            });
        },
    });

    const save = () => {
        if (!isDirty) return;
        savePermissions.mutate();
    };

    const emptyMessage = appliedSearch
        ? 'No entities found matching your search'
        : 'No entities available';

    const searchState = useMemo<SearchState>(
        () =>
            appliedSearch
                ? { ...EMPTY_SEARCH_STATE, q: appliedSearch }
                : EMPTY_SEARCH_STATE,
        [appliedSearch],
    );
    const applySearch = useCallback((state: SearchState) => {
        setAppliedSearch(state.q ?? '');
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
                accessorKey: 'teamAccess',
                header: 'Through teams',
                meta: { label: 'Through teams' },
                cell: ({ row }) => (
                    <span className='text-muted-foreground text-sm'>
                        {row.original.teamAccess === 'none'
                            ? '-'
                            : ACCESS_OPTIONS.find(
                                  (o) => o.value === row.original.teamAccess,
                              )?.label}
                    </span>
                ),
            },
            {
                id: 'access',
                header: 'Direct access',
                meta: { label: 'Direct access' },
                enableHiding: false,
                cell: ({ row }) => {
                    const entity = row.original;
                    const value = currentAccess[entity.id] ?? 'none';
                    const isDisabled = savePermissions.isPending || !!readOnly;
                    return (
                        <div onClick={(e) => e.stopPropagation()}>
                            <Select
                                items={ACCESS_OPTIONS}
                                value={value}
                                onValueChange={(v) =>
                                    v !== null &&
                                    updateAccess(entity.id, v as AccessType)
                                }
                                disabled={isDisabled}
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
        [currentAccess, updateAccess, readOnly, savePermissions.isPending],
    );

    const table = useReactTable({
        data: entities,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: totalPages,
        rowCount: permissions?.count,
        getRowId: (row) => String(row.id),
    });

    if (isPending && !hydratedRef.current) {
        return (
            <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    if (isError) {
        return (
            <div className='flex flex-col items-center justify-center min-h-[200px] gap-3 text-foreground'>
                <p className='text-sm text-muted-foreground'>
                    Failed to load permissions.
                </p>
                <Button type='button' onClick={() => refetch()}>
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <>
            {!readOnly && (
                <SettingsHeaderActionsPortal>
                    <SettingsSaveButton
                        isDirty={isDirty}
                        saving={savePermissions.isPending}
                        onSave={save}
                    />
                </SettingsHeaderActionsPortal>
            )}
            <DataTable
                table={table}
                density='compact'
                emptyMessage={emptyMessage}
                showPagination={(permissions?.count ?? 0) > 0 || isFetching}
                paginationDisabled={!!readOnly}
                isLoading={hydratedRef.current && isFetching && !permissions}
                toolbarEnd={<DataTableViewOptions table={table} />}
            >
                <SearchInput
                    schema={FREE_TEXT_SCHEMA}
                    value={searchState}
                    onApply={applySearch}
                    placeholder='Search entities...'
                    disabled={!!readOnly}
                />
            </DataTable>
        </>
    );
}
