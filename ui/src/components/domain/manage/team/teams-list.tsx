import PageHeader from '@/components/base/page-header';
import { SearchInput } from '@/components/base/search-input/search-input';
import {
    ActionBar,
    ActionBarClose,
    ActionBarGroup,
    ActionBarItem,
    ActionBarSelection,
    ActionBarSeparator,
} from '@/components/custom/action-bar';
import { DataTable } from '@/components/custom/data-table/data-table';
import { DataTableColumnHeader } from '@/components/custom/data-table/data-table-column-header';
import { DataTableRowActions } from '@/components/custom/data-table/data-table-row-actions';
import { useDockPanelTab } from '@/components/layout/dock-panel-tab-context';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import { FREE_TEXT_SCHEMA, type SearchState } from '@/lib/search-query/search-schema';
import {
    ClockCounterClockwiseIcon,
    PencilIcon,
    TrashIcon,
    UsersThreeIcon,
} from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useRouterState, useSearch } from '@tanstack/react-router';
import {
    type ColumnDef,
    type RowSelectionState,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AddTeamForm from './add-team-form';

type Team = components['schemas']['Team'];
type TeamRow = Team & { id: string };

export default function TeamsList() {
    useDockPanelTab({ title: 'Manage: Teams', icon: 'manage-teams' });
    const router = useRouter();
    const location = useRouterState({ select: (state) => state.location });
    const search = useSearch({ strict: false }) as any;
    const page = Number(search?.teams_page ?? 1) || 1;
    const pageSize = Number(search?.teams_pagesize ?? 20) || 20;
    const applied = ((search?.teams_search ?? '') as string).trim();

    const { isAdmin } = useAuthState();
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const [typed, setTyped] = useState('');

    const checkedIds = useMemo(
        () => Object.keys(rowSelection).filter((key) => rowSelection[key]),
        [rowSelection],
    );

    const clearSelection = useCallback(() => {
        setRowSelection({});
    }, []);

    const { data: teamsPage, isPending } = useQuery({
        queryKey: queryKeys.teams.list({ page, pageSize, search: applied }),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET('/teams/', {
                params: {
                    query: {
                        page,
                        page_size: pageSize,
                        ...(applied ? { search: applied } : {}),
                    },
                },
            });
            if (error) throw { response, error };
            return data;
        },
    });

    const rows = (teamsPage?.results ?? []) as TeamRow[];

    const deleteTeams = useMutation({
        mutationFn: async (teamIds: string[]) => {
            await Promise.all(
                teamIds.map(async (teamId) => {
                    const { error, response } = await fetchClient.DELETE(
                        '/teams/{team_id}/',
                        { params: { path: { team_id: teamId } } },
                    );
                    if (error) throw { response, error };
                }),
            );
        },
        onSuccess: (_, teamIds) => {
            toast.success(
                `Successfully deleted ${teamIds.length} team${teamIds.length > 1 ? 's' : ''}`,
            );
        },
        // Refresh even on failure: some teams may have been deleted before one failed.
        // Deleting a team drops its grants and clears ownership of its entities.
        onSettled: () => {
            for (const queryKey of [
                queryKeys.teams.all,
                ['get', '/entries/entities/{entity_id}/access/users/'],
                ['get', '/users/{user_id}/access/'],
                ['get', '/entries/entities/{entity_id}/'],
            ]) {
                queryClient.invalidateQueries({ queryKey });
            }
        },
    });

    const confirmDelete = useCallback((ids: string[]) => {
        if (ids.length === 0) return;
        setPendingDeleteIds(ids);
        setIsDeleteOpen(true);
    }, []);

    const openSettings = useCallback(
        (id: string | number, tab?: string) => {
            router.navigate({
                to: `/manage/teams/${id}` as any,
                ...(tab ? { search: { tab } as any } : {}),
            });
        },
        [router],
    );

    const navigateSearch = useCallback(
        (patch: Record<string, unknown>) => {
            router.navigate({
                to: location.pathname as any,
                search: { ...search, ...patch } as any,
                replace: true,
            });
        },
        [router, location.pathname, search],
    );

    const searchState = useMemo<SearchState>(
        () => ({ q: applied || undefined, values: {}, dates: {} }),
        [applied],
    );

    const columns = useMemo<ColumnDef<TeamRow>[]>(
        () => [
            ...(isAdmin
                ? [
                      {
                          id: 'select',
                          size: 28,
                          minSize: 28,
                          maxSize: 28,
                          header: ({ table }) => (
                              <Checkbox
                                  checked={table.getIsAllPageRowsSelected()}
                                  indeterminate={
                                      table.getIsSomePageRowsSelected() &&
                                      !table.getIsAllPageRowsSelected()
                                  }
                                  onCheckedChange={(value) =>
                                      table.toggleAllPageRowsSelected(!!value)
                                  }
                                  aria-label='Select all'
                              />
                          ),
                          cell: ({ row }) => (
                              <Checkbox
                                  checked={row.getIsSelected()}
                                  onCheckedChange={(value) =>
                                      row.toggleSelected(!!value)
                                  }
                                  aria-label='Select row'
                                  onClick={(e) => e.stopPropagation()}
                              />
                          ),
                          enableSorting: false,
                          enableHiding: false,
                      } satisfies ColumnDef<TeamRow>,
                  ]
                : []),
            {
                accessorKey: 'name',
                id: 'name',
                meta: { label: 'Name' },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label='Name' />
                ),
                cell: ({ row }) => (
                    <div className='font-medium'>{row.original.name}</div>
                ),
            },
            {
                accessorKey: 'description',
                id: 'description',
                meta: { label: 'Description' },
                header: 'Description',
                cell: ({ row }) => (
                    <div className='text-muted-foreground max-w-md truncate'>
                        {row.original.description || '-'}
                    </div>
                ),
            },
            {
                accessorKey: 'member_count',
                id: 'member_count',
                meta: { label: 'Members' },
                header: 'Members',
                cell: ({ row }) => row.original.member_count ?? 0,
                size: 80,
            },
            {
                id: 'actions',
                header: '',
                size: 40,
                minSize: 40,
                maxSize: 40,
                cell: ({ row }) => {
                    const item = row.original;
                    return (
                        <DataTableRowActions>
                            <DropdownMenuItem onClick={() => openSettings(item.id)}>
                                <PencilIcon size={16} weight='bold' />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => openSettings(item.id, 'members')}
                            >
                                <UsersThreeIcon size={16} weight='bold' />
                                Members
                            </DropdownMenuItem>
                            {isAdmin && (
                                <>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            openSettings(item.id, 'activity')
                                        }
                                    >
                                        <ClockCounterClockwiseIcon
                                            size={16}
                                            weight='bold'
                                        />
                                        Activity
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        variant='destructive'
                                        onClick={() => confirmDelete([item.id])}
                                    >
                                        <TrashIcon size={16} weight='bold' />
                                        Delete
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DataTableRowActions>
                    );
                },
                enableSorting: false,
                enableHiding: false,
            },
        ],
        [isAdmin, openSettings, confirmDelete],
    );

    const table = useReactTable({
        data: rows,
        columns,
        state: { rowSelection, pagination: { pageIndex: page - 1, pageSize } },
        getRowId: (row) => row.id,
        onRowSelectionChange: setRowSelection,
        onPaginationChange: (updater) => {
            const current = { pageIndex: page - 1, pageSize };
            const next = typeof updater === 'function' ? updater(current) : updater;
            if (next.pageSize !== pageSize) {
                navigateSearch({ teams_page: 1, teams_pagesize: next.pageSize });
            } else if (next.pageIndex + 1 !== page) {
                navigateSearch({ teams_page: next.pageIndex + 1 });
            }
        },
        getCoreRowModel: getCoreRowModel(),
        enableRowSelection: isAdmin,
        enableSorting: false,
        manualPagination: true,
        pageCount: Math.max(1, teamsPage?.total_pages ?? 1),
        rowCount: teamsPage?.count,
    });

    const handleCreated = (team: Team) => {
        setIsAddOpen(false);
        queryClient.invalidateQueries({ queryKey: queryKeys.teams.lists() });
        if (team.id) openSettings(team.id);
    };

    const deleteCount = pendingDeleteIds.length;
    const teamName =
        deleteCount === 1
            ? rows.find((r) => r.id === pendingDeleteIds[0])?.name
            : undefined;
    const phrase = teamName ?? (deleteCount > 1 ? `DELETE ${deleteCount}` : 'DELETE');
    const message =
        deleteCount === 1
            ? 'Are you sure you want to delete this team? Members lose the access they had through it and entities it owned become unowned. This action is irreversible.'
            : `Are you sure you want to delete ${deleteCount} teams? Members lose the access they had through them and entities they owned become unowned. This action is irreversible.`;

    return (
        <div className='w-full h-full'>
            <div className='w-full h-full flex flex-col space-y-4'>
                <PageHeader
                    title='Teams'
                    description='Groups of users that share access to entities'
                    actions={
                        isAdmin ? (
                            <Tooltip>
                                <TooltipTrigger
                                    render={
                                        <Button onClick={() => setIsAddOpen(true)} />
                                    }
                                >
                                    <Plus />
                                    Add Team
                                </TooltipTrigger>
                                <TooltipContent>Create a new team</TooltipContent>
                            </Tooltip>
                        ) : undefined
                    }
                />
                <div className='px-4 flex-1 flex flex-col'>
                    <div className='flex-1 space-y-4'>
                        <DataTable
                            table={table}
                            showViewOptions
                            isLoading={isPending}
                            emptyMessage={
                                applied ? 'No teams match your search' : 'No teams yet'
                            }
                            onRowClick={(team) => openSettings(team.id)}
                            getRowHref={(team) => `/manage/teams/${team.id}`}
                        >
                            <SearchInput
                                schema={FREE_TEXT_SCHEMA}
                                value={searchState}
                                onApply={(state) =>
                                    navigateSearch({
                                        teams_page: 1,
                                        teams_search: state.q || undefined,
                                    })
                                }
                                placeholder='Search teams...'
                            />
                        </DataTable>
                    </div>
                </div>
            </div>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>New Team</DialogTitle>
                        <DialogDescription>
                            Create a team, then add its leads and members
                        </DialogDescription>
                    </DialogHeader>
                    <AddTeamForm onAdd={handleCreated} />
                </DialogContent>
            </Dialog>
            <ActionBar
                open={checkedIds.length > 0}
                onOpenChange={(open) => {
                    if (!open) clearSelection();
                }}
            >
                <ActionBarSelection>
                    {checkedIds.length} team
                    {checkedIds.length !== 1 ? 's' : ''} selected
                </ActionBarSelection>
                <ActionBarSeparator />
                <ActionBarGroup>
                    <ActionBarItem
                        onClick={() => confirmDelete(checkedIds)}
                        disabled={isPending || checkedIds.length === 0}
                        className='text-destructive'
                    >
                        <TrashIcon size={18} weight='bold' />
                        Delete
                    </ActionBarItem>
                </ActionBarGroup>
                <ActionBarSeparator />
                <ActionBarClose className='px-2 text-sm' onClick={clearSelection}>
                    Clear
                </ActionBarClose>
            </ActionBar>
            <AlertDialog
                open={isDeleteOpen}
                onOpenChange={(open) => {
                    setIsDeleteOpen(open);
                    if (!open) {
                        setPendingDeleteIds([]);
                        setTyped('');
                    }
                }}
            >
                <AlertDialogContent className='sm:max-w-md'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>{message}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <FieldGroup className='gap-4'>
                        <Field>
                            <FieldLabel htmlFor='confirm-delete-teams'>
                                Type below to confirm
                            </FieldLabel>
                            <Input
                                id='confirm-delete-teams'
                                type='text'
                                placeholder={`Type "${phrase}" to confirm`}
                                value={typed}
                                onChange={(e) => setTyped(e.target.value)}
                            />
                        </Field>
                    </FieldGroup>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant='outline' size='sm'>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant='destructive'
                            size='sm'
                            onClick={() => {
                                if (pendingDeleteIds.length > 0) {
                                    deleteTeams.mutate(pendingDeleteIds, {
                                        onSettled: () => clearSelection(),
                                    });
                                }
                                setPendingDeleteIds([]);
                                setIsDeleteOpen(false);
                            }}
                            disabled={typed !== phrase}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
