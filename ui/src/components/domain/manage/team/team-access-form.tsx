import { SearchInput } from '@/components/base/search-input/search-input';
import { SettingsHeaderActionsPortal } from '@/components/base/settings-header-actions/settings-header-actions';
import { DataTable } from '@/components/custom/data-table/data-table';
import MultipleSelector, { type Option } from '@/components/custom/multi-select';
import { ACCESS_OPTIONS } from '@/components/domain/manage/access-options';
import AddEntityForm from '@/components/domain/manage/entity/add-entity-form';
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
import { PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { type ColumnDef, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Team = components['schemas']['Team'];
type TeamAccess = components['schemas']['TeamAccess'];
type AccessLevel = (typeof ACCESS_OPTIONS)[number]['value'];

const GRANT_OPTIONS = ACCESS_OPTIONS.filter((option) => option.value !== 'none');

interface TeamAccessFormProps {
    team: Team & { id: string };
}

export default function TeamAccessForm({ team }: TeamAccessFormProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { isManager } = useAuthState();
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
    const [newAccess, setNewAccess] = useState<AccessLevel>('read');
    const [isGrantOpen, setIsGrantOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const handleEntityCreated = (entity: { id?: number }) => {
        setIsCreateOpen(false);
        queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.entities.lists() });
        if (entity.id) {
            router.navigate({ to: `/manage/entities/${entity.id}` as any });
        }
    };

    useEffect(() => {
        if (isGrantOpen) return;
        setSelected([]);
        setNewAccess('read');
    }, [isGrantOpen]);

    const {
        data: accessPage,
        isPending,
        isFetching,
    } = useQuery({
        queryKey: [...queryKeys.teams.access(team.id), pagination, appliedSearch],
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET(
                '/teams/{team_id}/access/',
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

    const searchEntities = async (search: string): Promise<Option[]> => {
        const { data } = await fetchClient.GET('/query/', {
            params: {
                query: { type: 'entity', page_size: 20, ...(search ? { search } : {}) },
            },
        });
        return (
            (data?.results ?? []) as { id?: number; name: string; subtype?: string }[]
        )
            .filter((entity) => entity.id !== undefined)
            .map((entity) => ({
                value: String(entity.id),
                label: `${entity.subtype}:${entity.name}`,
            }));
    };

    const setAccess = useMutation({
        mutationFn: async ({
            entityId,
            accessType,
        }: {
            entityId: number;
            accessType: AccessLevel;
        }) => {
            const { error, response } = await fetchClient.PUT(
                '/entries/entities/{entity_id}/access/teams/{team_id}/',
                {
                    params: { path: { team_id: team.id, entity_id: entityId } },
                    body: { access_type: accessType },
                },
            );
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'Team access updated',
            invalidateQueries: [
                { queryKey: queryKeys.teams.all },
                { queryKey: ['get', '/entries/entities/{entity_id}/access/users/'] },
                { queryKey: ['get', '/users/{user_id}/access/'] },
            ],
        },
    });

    const grant = () => {
        const entity = selected[0];
        if (!entity) return;
        setAccess.mutate(
            { entityId: Number(entity.value), accessType: newAccess },
            { onSuccess: () => setIsGrantOpen(false) },
        );
    };

    const columns = useMemo<ColumnDef<TeamAccess>[]>(
        () => [
            {
                id: 'subtype',
                header: 'Type',
                meta: { label: 'Type' },
                cell: ({ row }) => (
                    <Badge variant='outline'>{row.original.entity.subtype}</Badge>
                ),
                size: 100,
            },
            {
                id: 'name',
                header: 'Entity',
                meta: { label: 'Entity' },
                cell: ({ row }) => (
                    <div className='flex items-center gap-2'>
                        <span className='font-medium'>{row.original.entity.name}</span>
                        {row.original.is_owner && <Badge>Owner</Badge>}
                    </div>
                ),
            },
            {
                id: 'access',
                header: 'Access',
                meta: { label: 'Access' },
                enableHiding: false,
                cell: ({ row }) => {
                    const { entity, access_type, is_owner } = row.original;
                    // The owning team always keeps read-write access.
                    if (!canManage || is_owner) {
                        return (
                            <span>
                                {ACCESS_OPTIONS.find((o) => o.value === access_type)
                                    ?.label ?? access_type}
                            </span>
                        );
                    }
                    return (
                        <div
                            className='flex items-center gap-1'
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Select
                                items={GRANT_OPTIONS}
                                value={access_type}
                                onValueChange={(value) =>
                                    value &&
                                    value !== access_type &&
                                    setAccess.mutate({
                                        entityId: entity.id,
                                        accessType: value as AccessLevel,
                                    })
                                }
                                disabled={setAccess.isPending}
                            >
                                <SelectTrigger className='w-[140px]'>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {GRANT_OPTIONS.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant='ghost'
                                size='icon'
                                title='Remove access'
                                disabled={setAccess.isPending}
                                onClick={() =>
                                    setAccess.mutate({
                                        entityId: entity.id,
                                        accessType: 'none',
                                    })
                                }
                            >
                                <TrashIcon className='size-4' weight='bold' />
                            </Button>
                        </div>
                    );
                },
                size: 200,
            },
        ],
        [canManage, setAccess],
    );

    const table = useReactTable({
        data: accessPage?.results ?? [],
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: Math.max(1, accessPage?.total_pages ?? 1),
        rowCount: accessPage?.count,
        getRowId: (row) => String(row.entity.id),
    });

    return (
        <div className='space-y-4'>
            {canManage && (
                <SettingsHeaderActionsPortal>
                    <div className='flex items-center gap-2'>
                        <Button variant='outline' onClick={() => setIsCreateOpen(true)}>
                            <PlusIcon weight='bold' />
                            New entity
                        </Button>
                        <Button onClick={() => setIsGrantOpen(true)}>
                            <PlusIcon weight='bold' />
                            Grant access
                        </Button>
                    </div>
                </SettingsHeaderActionsPortal>
            )}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>New Entity</DialogTitle>
                        <DialogDescription>
                            Create an entity owned by {team.name}. Its members get
                            read-write access.
                        </DialogDescription>
                    </DialogHeader>
                    <AddEntityForm teamId={team.id} onAdd={handleEntityCreated} />
                </DialogContent>
            </Dialog>
            <Dialog open={isGrantOpen} onOpenChange={setIsGrantOpen}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>Grant access</DialogTitle>
                        <DialogDescription>
                            Give every member of {team.name} access to an entity.
                        </DialogDescription>
                    </DialogHeader>
                    <FieldGroup className='gap-4'>
                        <Field>
                            <FieldContent>
                                <FieldLabel>
                                    Entity
                                    <span className='text-destructive ml-1'>*</span>
                                </FieldLabel>
                                <MultipleSelector
                                    inlineDropdown
                                    value={selected}
                                    onChange={setSelected}
                                    maxSelected={1}
                                    onSearch={searchEntities}
                                    triggerSearchOnFocus
                                    placeholder='Search entities...'
                                    emptyIndicator={
                                        <p className='text-center text-sm text-muted-foreground'>
                                            No entities found
                                        </p>
                                    }
                                />
                            </FieldContent>
                        </Field>
                        <Field>
                            <FieldContent>
                                <FieldLabel>Access</FieldLabel>
                                <Select
                                    items={GRANT_OPTIONS}
                                    value={newAccess}
                                    onValueChange={(value) =>
                                        value && setNewAccess(value as AccessLevel)
                                    }
                                >
                                    <SelectTrigger className='w-full'>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {GRANT_OPTIONS.map((option) => (
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
                                    You can grant up to your own access to the entity.
                                    Entities owned by another team can only be shared by
                                    that team&apos;s leads.
                                </FieldDescription>
                            </FieldContent>
                        </Field>
                    </FieldGroup>
                    <DialogFooter>
                        <DialogClose
                            render={
                                <Button
                                    type='button'
                                    variant='outline'
                                    disabled={setAccess.isPending}
                                />
                            }
                        >
                            Cancel
                        </DialogClose>
                        <Button
                            disabled={selected.length === 0 || setAccess.isPending}
                            onClick={grant}
                        >
                            {setAccess.isPending ? (
                                <Spinner />
                            ) : (
                                <PlusIcon weight='bold' />
                            )}
                            Grant
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
                        ? 'No entities match your search'
                        : 'This team has no entity access yet'
                }
                showPagination={(accessPage?.count ?? 0) > 0 || isFetching}
                // Entity settings open to managers, and to leads for the entities their team owns.
                onRowClick={(row) =>
                    (isManager || (canManage && row.is_owner)) &&
                    router.navigate({ to: `/manage/entities/${row.entity.id}` as any })
                }
            >
                <SearchInput
                    schema={FREE_TEXT_SCHEMA}
                    value={searchState}
                    onApply={applySearch}
                    placeholder='Search entities...'
                />
            </DataTable>
        </div>
    );
}
