import { SearchInput } from '@/components/base/search-input/search-input';
import {
    SettingsHeaderActionsPortal,
    SettingsSaveButton,
} from '@/components/base/settings-header-actions/settings-header-actions';
import { DataTable } from '@/components/custom/data-table/data-table';
import { DataTableViewOptions } from '@/components/custom/data-table/data-table-view-options';
import { ACCESS_OPTIONS } from '@/components/domain/manage/access-options';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { queryKeys } from '@/hooks/query';
import {
    EMPTY_SEARCH_STATE,
    FREE_TEXT_SCHEMA,
    type SearchState,
} from '@/lib/search-query/search-schema';
import {} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { type ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';

type AccessLevel = (typeof ACCESS_OPTIONS)[number]['value'];

interface EntityTeamsFormProps {
    entityId: number;
}

interface EntityTeamRow {
    teamId: string;
    name: string;
    memberCount: number;
    isOwner: boolean;
    serverAccess: AccessLevel;
}

export default function EntityTeamsForm({ entityId }: EntityTeamsFormProps) {
    const [appliedSearch, setAppliedSearch] = useState('');
    const [edits, setEdits] = useState<Record<string, AccessLevel>>({});
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

    const {
        data: grants,
        isPending: grantsPending,
        isError: grantsError,
        refetch: refetchGrants,
    } = useQuery({
        queryKey: queryKeys.teams.entity(entityId),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/entries/entities/{entity_id}/access/teams/',
                { params: { path: { entity_id: entityId } } },
            );
            if (error) throw { response, error };
            return data;
        },
    });

    const {
        data: teamsPage,
        isPending: teamsPending,
        isFetching,
        isError: teamsError,
        refetch: refetchTeams,
    } = useQuery({
        queryKey: queryKeys.teams.list({
            page: pagination.pageIndex + 1,
            pageSize: pagination.pageSize,
            search: appliedSearch,
        }),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET('/teams/', {
                params: {
                    query: {
                        page: pagination.pageIndex + 1,
                        page_size: pagination.pageSize,
                        ...(appliedSearch ? { search: appliedSearch } : {}),
                    },
                },
            });
            if (error) throw { response, error };
            return data;
        },
        placeholderData: (previous) => previous,
    });

    useLayoutEffect(() => {
        setEdits({});
        setAppliedSearch('');
        setPagination((p) => ({ pageIndex: 0, pageSize: p.pageSize }));
    }, [entityId]);

    useLayoutEffect(() => {
        setPagination((p) => ({ pageIndex: 0, pageSize: p.pageSize }));
    }, [appliedSearch]);

    const serverAccess = useMemo(() => {
        const map: Record<string, { access: AccessLevel; isOwner: boolean }> = {};
        for (const grant of grants ?? []) {
            map[grant.team.id as string] = {
                access: grant.access_type as AccessLevel,
                isOwner: grant.is_owner ?? false,
            };
        }
        return map;
    }, [grants]);

    const teamRows: EntityTeamRow[] = useMemo(
        () =>
            (teamsPage?.results ?? []).map((team) => {
                const teamId = team.id as string;
                return {
                    teamId,
                    name: team.name,
                    memberCount: team.member_count ?? 0,
                    isOwner: serverAccess[teamId]?.isOwner ?? false,
                    serverAccess: serverAccess[teamId]?.access ?? 'none',
                };
            }),
        [teamsPage?.results, serverAccess],
    );

    const accessOf = useCallback(
        (teamId: string): AccessLevel =>
            edits[teamId] ?? serverAccess[teamId]?.access ?? 'none',
        [edits, serverAccess],
    );

    const changes = useMemo(
        () =>
            Object.entries(edits).filter(
                ([teamId, access]) =>
                    access !== (serverAccess[teamId]?.access ?? 'none'),
            ),
        [edits, serverAccess],
    );
    const isDirty = changes.length > 0;

    const updateAccess = useCallback((teamId: string, access: AccessLevel) => {
        setEdits((prev) => ({ ...prev, [teamId]: access }));
    }, []);

    const saveAccess = useMutation({
        mutationFn: async () => {
            await Promise.all(
                changes.map(async ([teamId, accessType]) => {
                    const { error, response } = await fetchClient.PUT(
                        '/entries/entities/{entity_id}/access/teams/{team_id}/',
                        {
                            params: { path: { team_id: teamId, entity_id: entityId } },
                            body: { access_type: accessType },
                        },
                    );
                    if (error) throw { response, error };
                }),
            );
        },
        meta: {
            successMessage: 'Team access updated',
            invalidateQueries: [
                { queryKey: queryKeys.teams.all },
                {
                    queryKey: [
                        'get',
                        '/entries/entities/{entity_id}/access/users/',
                        entityId,
                    ],
                },
                { queryKey: ['get', '/entries/entities/{entity_id}/'] },
                { queryKey: ['get', '/users/{user_id}/access/'] },
            ],
        },
        onSuccess: () => setEdits({}),
    });

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

    const columns = useMemo<ColumnDef<EntityTeamRow>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Team',
                meta: { label: 'Team' },
                cell: ({ row }) => (
                    <div className='flex items-center gap-2'>
                        <Link
                            to={`/manage/teams/${row.original.teamId}` as any}
                            className='font-medium hover:underline'
                        >
                            {row.original.name}
                        </Link>
                        {row.original.isOwner && <Badge>Owner</Badge>}
                    </div>
                ),
                size: 240,
            },
            {
                accessorKey: 'memberCount',
                header: 'Members',
                meta: { label: 'Members' },
                cell: ({ row }) => (
                    <span className='text-muted-foreground'>
                        {row.original.memberCount}
                    </span>
                ),
                size: 100,
            },
            {
                id: 'access',
                header: 'Access',
                meta: { label: 'Access' },
                enableHiding: false,
                cell: ({ row }) => {
                    const { teamId, isOwner } = row.original;
                    return (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            title={
                                isOwner
                                    ? 'The owning team always has read-write access'
                                    : undefined
                            }
                        >
                            <Select
                                items={ACCESS_OPTIONS}
                                value={accessOf(teamId)}
                                onValueChange={(v) =>
                                    v !== null && updateAccess(teamId, v as AccessLevel)
                                }
                                disabled={saveAccess.isPending || isOwner}
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
        [accessOf, updateAccess, saveAccess.isPending],
    );

    const table = useReactTable({
        data: teamRows,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: Math.max(1, teamsPage?.total_pages ?? 1),
        rowCount: teamsPage?.count,
        getRowId: (row) => row.teamId,
    });

    if (grantsPending || teamsPending) {
        return (
            <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    if (grantsError || teamsError) {
        return (
            <div className='flex flex-col items-center justify-center min-h-[200px] gap-3 text-foreground'>
                <p className='text-sm text-muted-foreground'>Failed to load teams.</p>
                <Button
                    type='button'
                    onClick={() => {
                        refetchGrants();
                        refetchTeams();
                    }}
                >
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <>
            <SettingsHeaderActionsPortal>
                <SettingsSaveButton
                    isDirty={isDirty}
                    saving={saveAccess.isPending}
                    onSave={() => saveAccess.mutate()}
                />
            </SettingsHeaderActionsPortal>
            <DataTable
                table={table}
                density='compact'
                emptyMessage={
                    appliedSearch
                        ? 'No teams found matching your search'
                        : 'No teams available'
                }
                showPagination={(teamsPage?.count ?? 0) > 0 || isFetching}
                toolbarEnd={<DataTableViewOptions table={table} />}
            >
                <SearchInput
                    schema={FREE_TEXT_SCHEMA}
                    value={searchState}
                    onApply={applySearch}
                    placeholder='Search teams...'
                />
            </DataTable>
        </>
    );
}
