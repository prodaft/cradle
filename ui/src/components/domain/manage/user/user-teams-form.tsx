import { SearchInput } from '@/components/base/search-input/search-input';
import {
    SettingsHeaderActionsPortal,
    SettingsSaveButton,
} from '@/components/base/settings-header-actions/settings-header-actions';
import { DataTable } from '@/components/custom/data-table/data-table';
import { DataTableViewOptions } from '@/components/custom/data-table/data-table-view-options';
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
import { type components } from '@services/openapi/schema';
import {
    type QueryKey,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { type ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';

type Membership = 'none' | components['schemas']['TeamRoleEnum'];

// Membership changes alter counts and the user's effective access.
const INVALIDATE_ON_CHANGE: { queryKey: QueryKey }[] = [
    { queryKey: queryKeys.teams.all },
    { queryKey: ['get', '/entries/entities/{entity_id}/access/users/'] },
    { queryKey: ['get', '/users/{user_id}/access/'] },
];

const MEMBERSHIP_OPTIONS: { value: Membership; label: string }[] = [
    { value: 'none', label: 'Not a member' },
    { value: 'member', label: 'Member' },
    { value: 'lead', label: 'Lead' },
];

interface UserTeamsFormProps {
    userId: string;
    readOnly?: boolean;
}

interface UserTeamRow {
    teamId: string;
    name: string;
    memberCount: number;
}

export default function UserTeamsForm({
    userId,
    readOnly = false,
}: UserTeamsFormProps) {
    const queryClient = useQueryClient();
    const [appliedSearch, setAppliedSearch] = useState('');
    const [edits, setEdits] = useState<Record<string, Membership>>({});
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

    const {
        data: memberships,
        isPending: membershipsPending,
        isError: membershipsError,
        refetch: refetchMemberships,
    } = useQuery({
        queryKey: queryKeys.teams.user(userId),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/users/{user_id}/teams/',
                { params: { path: { user_id: userId } } },
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
    }, [userId]);

    useLayoutEffect(() => {
        setPagination((p) => ({ pageIndex: 0, pageSize: p.pageSize }));
    }, [appliedSearch]);

    const serverMembership = useMemo(() => {
        const map: Record<string, Membership> = {};
        for (const membership of memberships ?? []) {
            map[membership.team.id as string] = membership.role ?? 'member';
        }
        return map;
    }, [memberships]);

    const teamRows: UserTeamRow[] = useMemo(
        () =>
            (teamsPage?.results ?? []).map((team) => ({
                teamId: team.id as string,
                name: team.name,
                memberCount: team.member_count ?? 0,
            })),
        [teamsPage?.results],
    );

    const membershipOf = useCallback(
        (teamId: string): Membership =>
            edits[teamId] ?? serverMembership[teamId] ?? 'none',
        [edits, serverMembership],
    );

    const changes = useMemo(
        () =>
            Object.entries(edits).filter(
                ([teamId, membership]) =>
                    membership !== (serverMembership[teamId] ?? 'none'),
            ),
        [edits, serverMembership],
    );
    const isDirty = changes.length > 0;

    const updateMembership = useCallback((teamId: string, membership: Membership) => {
        setEdits((prev) => ({ ...prev, [teamId]: membership }));
    }, []);

    const saveMemberships = useMutation({
        mutationFn: async () => {
            await Promise.all(
                changes.map(async ([teamId, membership]) => {
                    const path = { team_id: teamId, user_id: userId };
                    const current = serverMembership[teamId] ?? 'none';
                    const { error, response } =
                        membership === 'none'
                            ? await fetchClient.DELETE(
                                  '/teams/{team_id}/members/{user_id}/',
                                  { params: { path } },
                              )
                            : current === 'none'
                              ? await fetchClient.POST('/teams/{team_id}/members/', {
                                    params: { path: { team_id: teamId } },
                                    body: { user_id: userId, role: membership },
                                })
                              : await fetchClient.PATCH(
                                    '/teams/{team_id}/members/{user_id}/',
                                    { params: { path }, body: { role: membership } },
                                );
                    if (error) throw { response, error };
                }),
            );
        },
        meta: {
            successMessage: 'Teams updated',
            invalidateQueries: INVALIDATE_ON_CHANGE,
        },
        onSuccess: () => setEdits({}),
        // A partial failure leaves some changes applied: resync, and keep the
        // edits that did not go through (applied ones now match the server).
        onError: () =>
            INVALIDATE_ON_CHANGE.forEach((target) =>
                queryClient.invalidateQueries(target),
            ),
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

    const columns = useMemo<ColumnDef<UserTeamRow>[]>(
        () => [
            {
                accessorKey: 'teamId',
                header: 'ID',
                meta: { label: 'ID' },
                cell: ({ row }) => (
                    <span className='text-muted-foreground'>
                        {row.original.teamId.slice(0, 8)}
                    </span>
                ),
                size: 60,
            },
            {
                accessorKey: 'name',
                header: 'Team',
                meta: { label: 'Team' },
                cell: ({ row }) => (
                    <Link
                        to={`/manage/teams/${row.original.teamId}` as any}
                        className='font-medium hover:underline'
                    >
                        {row.original.name}
                    </Link>
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
                id: 'membership',
                header: 'Team role',
                meta: { label: 'Team role' },
                enableHiding: false,
                cell: ({ row }) => {
                    const { teamId } = row.original;
                    return (
                        <div onClick={(e) => e.stopPropagation()}>
                            <Select
                                items={MEMBERSHIP_OPTIONS}
                                value={membershipOf(teamId)}
                                onValueChange={(v) =>
                                    v !== null &&
                                    updateMembership(teamId, v as Membership)
                                }
                                disabled={readOnly || saveMemberships.isPending}
                            >
                                <SelectTrigger className='w-[140px]'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MEMBERSHIP_OPTIONS.map((option) => (
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
        [membershipOf, updateMembership, readOnly, saveMemberships.isPending],
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

    if (membershipsPending || teamsPending) {
        return (
            <div className='flex items-center justify-center min-h-[200px] text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    if (membershipsError || teamsError) {
        return (
            <div className='flex flex-col items-center justify-center min-h-[200px] gap-3 text-foreground'>
                <p className='text-sm text-muted-foreground'>Failed to load teams.</p>
                <Button
                    type='button'
                    onClick={() => {
                        refetchMemberships();
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
            {!readOnly && (
                <SettingsHeaderActionsPortal>
                    <SettingsSaveButton
                        isDirty={isDirty}
                        saving={saveMemberships.isPending}
                        onSave={() => saveMemberships.mutate()}
                    />
                </SettingsHeaderActionsPortal>
            )}
            {readOnly && (
                <p className='text-sm text-muted-foreground mb-4'>
                    Administrators already have access to everything and cannot join
                    teams.
                </p>
            )}
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
