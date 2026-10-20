import { SearchInput } from '@/components/base/search-input/search-input';
import { SettingsHeaderActionsPortal } from '@/components/base/settings-header-actions/settings-header-actions';
import { DataTable } from '@/components/custom/data-table/data-table';
import MultipleSelector, { type Option } from '@/components/custom/multi-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import {
    EMPTY_SEARCH_STATE,
    FREE_TEXT_SCHEMA,
    type SearchState,
} from '@/lib/search-query/search-schema';
import { SignOutIcon, UserMinusIcon, UserPlusIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import { type components, teamRoleEnumValues } from '@services/openapi/schema';
import { useMutation, useQuery } from '@tanstack/react-query';
import { type ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Team = components['schemas']['Team'];
type TeamMember = components['schemas']['TeamMember'];
type TeamRole = components['schemas']['TeamRoleEnum'];

const ROLE_LABELS = {
    lead: 'Lead',
    member: 'Member',
} satisfies Record<TeamRole, string>;

const ROLE_OPTIONS = teamRoleEnumValues.map((value) => ({
    value,
    label: ROLE_LABELS[value],
}));

interface TeamMembersFormProps {
    team: Team & { id: string };
}

export default function TeamMembersForm({ team }: TeamMembersFormProps) {
    const { isAdmin, userId } = useAuthState();
    const canManage = !!team.can_manage;
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
    const [appliedSearch, setAppliedSearch] = useState('');

    const searchState = useMemo<SearchState>(
        () =>
            appliedSearch
                ? { ...EMPTY_SEARCH_STATE, q: appliedSearch }
                : EMPTY_SEARCH_STATE,
        [appliedSearch],
    );
    const applySearch = useCallback((state: SearchState) => {
        setAppliedSearch(state.q ?? '');
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, []);
    const [selected, setSelected] = useState<Option[]>([]);
    const [newRole, setNewRole] = useState<TeamRole>('member');
    const [isAddOpen, setIsAddOpen] = useState(false);

    useEffect(() => {
        if (isAddOpen) return;
        setSelected([]);
        setNewRole('member');
    }, [isAddOpen]);

    const {
        data: membersPage,
        isPending,
        isFetching,
    } = useQuery({
        queryKey: [...queryKeys.teams.members(team.id), pagination, appliedSearch],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/teams/{team_id}/members/',
                {
                    params: {
                        path: { team_id: team.id },
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
    });

    // Membership changes alter counts, roles and every member's effective access.
    const invalidate = [
        { queryKey: queryKeys.teams.all },
        { queryKey: ['get', '/entries/entities/{entity_id}/access/users/'] },
        { queryKey: ['get', '/users/{user_id}/access/'] },
    ];

    const searchCandidates = async (search: string): Promise<Option[]> => {
        const { data } = await fetchClient.GET('/teams/{team_id}/candidates/', {
            params: {
                path: { team_id: team.id },
                query: { page_size: 20, ...(search ? { search } : {}) },
            },
        });
        return (data?.results ?? []).map((user) => ({
            value: user.id as string,
            label: `${user.username}${user.role === 'manager' ? ' (manager)' : ''}`,
        }));
    };

    const addMember = useMutation({
        mutationFn: async () => {
            const user = selected[0];
            if (!user) return;
            const { error, response } = await fetchClient.POST(
                '/teams/{team_id}/members/',
                {
                    params: { path: { team_id: team.id } },
                    body: { user_id: user.value, role: newRole },
                },
            );
            if (error) throw { response, error };
        },
        meta: { successMessage: 'Member added', invalidateQueries: invalidate },
        onSuccess: () => setIsAddOpen(false),
    });

    const changeRole = useMutation({
        mutationFn: async ({
            memberId,
            role,
        }: {
            memberId: string;
            role: TeamRole;
        }) => {
            const { error, response } = await fetchClient.PATCH(
                '/teams/{team_id}/members/{user_id}/',
                {
                    params: { path: { team_id: team.id, user_id: memberId } },
                    body: { role },
                },
            );
            if (error) throw { response, error };
        },
        meta: { successMessage: 'Role updated', invalidateQueries: invalidate },
    });

    const removeMember = useMutation({
        mutationFn: async (memberId: string) => {
            const { error, response } = await fetchClient.DELETE(
                '/teams/{team_id}/members/{user_id}/',
                { params: { path: { team_id: team.id, user_id: memberId } } },
            );
            if (error) throw { response, error };
        },
        meta: { successMessage: 'Member removed', invalidateQueries: invalidate },
    });

    const columns = useMemo<ColumnDef<TeamMember>[]>(
        () => [
            {
                id: 'username',
                header: 'User',
                meta: { label: 'User' },
                cell: ({ row }) => (
                    <span className='font-medium'>{row.original.user.username}</span>
                ),
            },
            {
                id: 'user_role',
                header: 'Platform role',
                meta: { label: 'Platform role' },
                cell: ({ row }) => (
                    <span className='text-muted-foreground capitalize'>
                        {row.original.user_role}
                    </span>
                ),
                size: 120,
            },
            {
                id: 'role',
                header: 'Team role',
                meta: { label: 'Team role' },
                enableHiding: false,
                cell: ({ row }) => {
                    const member = row.original;
                    if (!isAdmin) {
                        return (
                            <Badge
                                variant={
                                    member.role === 'lead' ? 'default' : 'secondary'
                                }
                            >
                                {ROLE_LABELS[member.role ?? 'member']}
                            </Badge>
                        );
                    }
                    return (
                        <Select
                            items={ROLE_OPTIONS}
                            value={member.role}
                            onValueChange={(role) =>
                                role &&
                                role !== member.role &&
                                changeRole.mutate({
                                    memberId: member.user.id as string,
                                    role: role as TeamRole,
                                })
                            }
                            disabled={changeRole.isPending}
                        >
                            <SelectTrigger className='w-[120px]'>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ROLE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    );
                },
                size: 140,
            },
            {
                id: 'actions',
                header: '',
                enableHiding: false,
                cell: ({ row }) => {
                    const member = row.original;
                    const memberId = member.user.id as string;
                    const isSelf = memberId === userId;
                    const canRemove =
                        isSelf || isAdmin || (canManage && member.role !== 'lead');
                    if (!canRemove) return null;
                    return (
                        <Button
                            variant='ghost'
                            size='sm'
                            disabled={removeMember.isPending}
                            onClick={() => removeMember.mutate(memberId)}
                        >
                            {isSelf ? (
                                <>
                                    <SignOutIcon weight='bold' />
                                    Leave
                                </>
                            ) : (
                                <>
                                    <UserMinusIcon weight='bold' />
                                    Remove
                                </>
                            )}
                        </Button>
                    );
                },
                size: 110,
            },
        ],
        [isAdmin, canManage, userId, changeRole, removeMember],
    );

    const table = useReactTable({
        data: membersPage?.results ?? [],
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: Math.max(1, membersPage?.total_pages ?? 1),
        rowCount: membersPage?.count,
        getRowId: (row) => row.user.id as string,
    });

    return (
        <div className='space-y-4'>
            {canManage && (
                <SettingsHeaderActionsPortal>
                    <Button onClick={() => setIsAddOpen(true)}>
                        <UserPlusIcon weight='bold' />
                        Add member
                    </Button>
                </SettingsHeaderActionsPortal>
            )}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>Add member</DialogTitle>
                        <DialogDescription>
                            Add a user to {team.name}. They will be notified.
                        </DialogDescription>
                    </DialogHeader>
                    <FieldGroup className='gap-4'>
                        <Field>
                            <FieldContent>
                                <FieldLabel>
                                    User
                                    <span className='text-destructive ml-1'>*</span>
                                </FieldLabel>
                                <MultipleSelector
                                    inlineDropdown
                                    value={selected}
                                    onChange={setSelected}
                                    maxSelected={1}
                                    onSearch={searchCandidates}
                                    triggerSearchOnFocus
                                    placeholder='Search users...'
                                    emptyIndicator={
                                        <p className='text-center text-sm text-muted-foreground'>
                                            No users found
                                        </p>
                                    }
                                />
                            </FieldContent>
                        </Field>
                        {isAdmin && (
                            <Field>
                                <FieldContent>
                                    <FieldLabel>Role</FieldLabel>
                                    <Select
                                        items={ROLE_OPTIONS}
                                        value={newRole}
                                        onValueChange={(role) =>
                                            role && setNewRole(role as TeamRole)
                                        }
                                    >
                                        <SelectTrigger className='w-full'>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLE_OPTIONS.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldDescription>
                                        Leads add members, grant the team access to
                                        entities and create entities for the team.
                                    </FieldDescription>
                                </FieldContent>
                            </Field>
                        )}
                    </FieldGroup>
                    <DialogFooter>
                        <DialogClose
                            render={
                                <Button
                                    type='button'
                                    variant='outline'
                                    disabled={addMember.isPending}
                                />
                            }
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            disabled={selected.length === 0 || addMember.isPending}
                            onClick={() => addMember.mutate()}
                        >
                            {addMember.isPending ? (
                                <Spinner />
                            ) : (
                                <UserPlusIcon weight='bold' />
                            )}
                            Add
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <DataTable
                table={table}
                density='compact'
                isLoading={isPending}
                emptyMessage={
                    appliedSearch
                        ? 'No members match your search'
                        : 'This team has no members yet'
                }
                showPagination={(membersPage?.count ?? 0) > 0 || isFetching}
            >
                <SearchInput
                    schema={FREE_TEXT_SCHEMA}
                    value={searchState}
                    onApply={applySearch}
                    placeholder='Search members...'
                />
            </DataTable>
        </div>
    );
}
