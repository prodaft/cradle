import {
    SettingsHeaderActionsPortal,
    SettingsSaveButton,
} from '@/components/base/settings-header-actions/settings-header-actions';
import MultipleSelector, { type Option } from '@/components/custom/multi-select';
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
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys, useNdjsonQuery } from '@/hooks/query';
import { zodResolver } from '@hookform/resolvers/zod';
import { $api, fetchClient } from '@services/openapi/client';
import type { components } from '@services/openapi/schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import OfflineIndicator from '@/components/feedback/offline-indicator';
import { SelectOption } from '@/types/models';
import {} from '@phosphor-icons/react';
import * as z from 'zod';

type Entity = components['schemas']['Entity'];
type EntityRequest = components['schemas']['EntityRequest'];
type Entry = components['schemas']['Entry'];
type AdvancedQueryResponse = components['schemas']['AdvancedQueryPaginatedResponse'];

interface EntityFormProps {
    id?: number | string | null;
}

interface AliasOption extends SelectOption<number> {
    value: number;
    label: string;
}

const NO_OWNER = '__none__';

interface SubtypeOption extends SelectOption<string> {
    value: string;
    label: string;
}

const entitySchema = z.object({
    name: z.string().min(1, { error: 'Name is required' }),
    subtype: z.string().min(1, { error: 'Subtype is required' }),
    description: z.string().default(''),
    isPublic: z.boolean().default(false),
    owningTeamId: z.string().default(NO_OWNER),
    aliases: z
        .array(
            z.object({
                value: z.number(),
                label: z.string().min(1),
            }),
        )
        .default([]),
});

type EntityFormData = z.infer<typeof entitySchema>;

const ENTITY_FORM_DEFAULTS: EntityFormData = {
    name: '',
    subtype: '',
    description: '',
    isPublic: false,
    owningTeamId: NO_OWNER,
    aliases: [],
};

function getEntityFormFromApi(
    entity: Entity | null | undefined,
): EntityFormData | null {
    if (!entity) return null;
    const aliases =
        entity.aliases
            ?.filter((a): a is Entry & { id: number } => a.id !== undefined)
            .map((a) => ({
                value: a.id!,
                label: `${a.subtype}:${a.name}`,
            })) ?? [];
    return {
        name: entity.name,
        subtype: entity.subtype || '',
        description: entity.description || '',
        isPublic: entity.is_public ?? false,
        owningTeamId: (entity.team?.id as string | undefined) ?? NO_OWNER,
        aliases,
    };
}

export default function EntityForm({ id = null }: EntityFormProps) {
    const formId = useId();
    const queryClient = useQueryClient();
    const { isAdmin } = useAuthState();
    const router = useRouter();
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const searchAliases = useMutation({
        mutationFn: async (searchTerm: string) => {
            const { data, error, response } = await fetchClient.GET(
                '/query/advanced/',
                {
                    params: {
                        query: {
                            query: [searchTerm],
                            wildcard: true,
                        },
                    },
                },
            );
            if (error) throw { response, error };
            const results = (data as AdvancedQueryResponse)?.results ?? [];
            return results
                .filter(
                    (alias): alias is typeof alias & { id: number } =>
                        alias.id !== undefined,
                )
                .map((alias) => ({
                    value: alias.id,
                    label: `${alias.subtype}:${alias.name}`,
                }));
        },
        meta: {
            suppressNotification: true,
        },
    });

    const updateEntity = useMutation({
        mutationFn: async (payload: EntityRequest) => {
            const { data, error, response } = await fetchClient.PATCH(
                '/entries/entities/{entity_id}/',
                {
                    params: { path: { entity_id: Number(id) } },
                    body: payload,
                },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            successMessage: 'Entity updated successfully!',
            invalidateQueries: queryKeys.entryLists().map((queryKey) => ({ queryKey })),
        },
    });

    const setOwner = useMutation({
        mutationFn: async (teamId: string | null) => {
            const { error, response } = await fetchClient.PUT(
                '/entries/entities/{entity_id}/owner/',
                {
                    params: { path: { entity_id: Number(id) } },
                    body: { team_id: teamId },
                },
            );
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'Owning team updated',
            invalidateQueries: [
                { queryKey: queryKeys.teams.all },
                {
                    queryKey: [
                        'get',
                        '/entries/entities/{entity_id}/access/users/',
                        Number(id),
                    ],
                },
                { queryKey: ['get', '/entries/entities/{entity_id}/'] },
                { queryKey: ['get', '/users/{user_id}/access/'] },
            ],
        },
    });

    const deleteEntity = useMutation({
        mutationFn: async () => {
            const { error, response } = await fetchClient.DELETE(
                '/entries/entities/{entity_id}/',
                { params: { path: { entity_id: Number(id) } } },
            );
            if (error) throw { response, error };
        },
        meta: {
            successMessage: 'Entity deleted successfully',
            invalidateQueries: queryKeys.entryLists().map((queryKey) => ({ queryKey })),
        },
        onSuccess: () => router.navigate({ to: '/manage/entities' as any }),
    });

    const { data: teamsPage } = useQuery({
        queryKey: queryKeys.teams.list({ page: 1, pageSize: 200 }),
        queryFn: async () => {
            const { data, error, response } = await fetchClient.GET('/teams/', {
                params: { query: { page: 1, page_size: 200 } },
            });
            if (error) throw { response, error };
            return data;
        },
        enabled: isAdmin,
    });

    const loadedValuesRef = useRef<EntityFormData | null>(null);

    const { data: entryClasses } = useNdjsonQuery({
        path: '/entries/entry-classes/stream/',
        params: {
            query: { show_count: true },
        },
        queryKey: ['entry_classes', 'entity-form', 'show_count'],
        refetchOnWindowFocus: false,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    const subtypeOptions = useMemo<SubtypeOption[]>(() => {
        const results = entryClasses ?? [];
        return results
            .filter((entry) => entry.type === 'entity')
            .map((entry) => ({
                value: entry.subtype,
                label: entry.subtype,
            }));
    }, [entryClasses]);

    const {
        data: entity,
        isLoading,
        isPaused,
    } = $api.useQuery(
        'get',
        '/entries/entities/{entity_id}/',
        { params: { path: { entity_id: Number(id) } } },
        {
            enabled: !!id,
            meta: { showErrorToast: true },
        },
    );

    const ownerItems = useMemo(() => {
        const items: { value: string | null; label: string }[] = [
            { value: null, label: 'Select a team' },
            ...(teamsPage?.results ?? []).map((team) => ({
                value: team.id as string,
                label: team.name,
            })),
        ];
        const current = entity?.team;
        if (current && !items.some((item) => item.value === current.id)) {
            items.push({ value: current.id as string, label: current.name });
        }
        return items;
    }, [teamsPage, entity?.team]);

    const resolvedSubtypeOptions = useMemo(() => {
        if (!entity?.subtype) return subtypeOptions;

        const listed = subtypeOptions.some((option) => option.value === entity.subtype);
        if (listed) return subtypeOptions;

        return [...subtypeOptions, { value: entity.subtype, label: entity.subtype }];
    }, [entity?.subtype, subtypeOptions]);

    const {
        handleSubmit,
        reset,
        control,
        formState: { isSubmitting, isDirty },
    } = useForm<EntityFormData>({
        resolver: zodResolver(entitySchema) as any,
        defaultValues: ENTITY_FORM_DEFAULTS,
    });

    const fetchAliases = async (searchTerm: string): Promise<AliasOption[]> => {
        try {
            return await searchAliases.mutateAsync(searchTerm);
        } catch (_error) {
            return [];
        }
    };

    useLayoutEffect(() => {
        const values = getEntityFormFromApi(entity);
        if (!values) return;
        loadedValuesRef.current = values;
        reset(values);
    }, [entity, reset]);

    const onSubmit = async (values: EntityFormData) => {
        const payload = {
            type: 'entity',
            name: values.name,
            description: values.description,
            subtype: values.subtype || '',
            is_public: values.isPublic,
            alias_ids: values.aliases.map((alias) => alias.value),
        };
        try {
            await updateEntity.mutateAsync(payload);
            if (
                isAdmin &&
                values.owningTeamId !== loadedValuesRef.current?.owningTeamId
            ) {
                // setOwner refetches the entity; refetching after the update too would
                // reset the form to the old owner while this request is in flight.
                await setOwner.mutateAsync(
                    values.owningTeamId === NO_OWNER ? null : values.owningTeamId,
                );
            } else {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.entities.apiDetail(Number(id)),
                });
            }
        } catch (_error) {
            // errors/toasts handled by mutation/meta; keep form responsive
        }
    };

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen text-foreground'>
                <Spinner className='size-10' />
            </div>
        );
    }

    if (isPaused) {
        return (
            <div className='flex items-center justify-center min-h-screen w-full max-w-md p-4'>
                <OfflineIndicator />
            </div>
        );
    }

    const confirmPhrase = entity ? `${entity.subtype}:${entity.name}` : 'DELETE';

    return (
        <>
            <SettingsHeaderActionsPortal>
                <SettingsSaveButton
                    isDirty={isDirty}
                    saving={isSubmitting}
                    form={formId}
                />
            </SettingsHeaderActionsPortal>
            <form
                id={formId}
                className='flex flex-col gap-6'
                onSubmit={handleSubmit(onSubmit)}
            >
                <section id='entity-settings'>
                    <div className='flex flex-col gap-4'>
                        <FieldGroup className='gap-4'>
                            <Controller
                                name='name'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='name'
                                                className='text-sm block mb-0.5'
                                            >
                                                Name
                                                <span className='text-destructive ml-1'>
                                                    *
                                                </span>
                                            </FieldLabel>
                                            <FieldDescription>
                                                Unique identifier for this entity
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    id='name-error'
                                                    className='text-sm mt-1'
                                                >
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <Input
                                            {...field}
                                            id='name'
                                            disabled={true}
                                            className='w-64 shrink-0 self-start md:self-center'
                                            aria-invalid={fieldState.invalid}
                                            aria-describedby={
                                                fieldState.invalid
                                                    ? 'name-error'
                                                    : undefined
                                            }
                                        />
                                    </Field>
                                )}
                            />

                            <Separator />

                            <Controller
                                name='subtype'
                                control={control}
                                render={({ field, fieldState }) => {
                                    return (
                                        <Field
                                            orientation='responsive'
                                            data-invalid={fieldState.invalid}
                                        >
                                            <FieldContent className='flex-1'>
                                                <FieldLabel
                                                    htmlFor='entity-subtype'
                                                    className='text-sm block mb-0.5'
                                                >
                                                    Subtype
                                                    <span className='text-destructive ml-1'>
                                                        *
                                                    </span>
                                                </FieldLabel>
                                                <FieldDescription>
                                                    Entity class type
                                                </FieldDescription>
                                                {fieldState.invalid && (
                                                    <FieldError
                                                        id='subtype-error'
                                                        className='text-sm mt-1'
                                                    >
                                                        {fieldState.error?.message}
                                                    </FieldError>
                                                )}
                                            </FieldContent>
                                            <Select
                                                items={resolvedSubtypeOptions}
                                                value={field.value ?? ''}
                                                onValueChange={field.onChange}
                                            >
                                                <SelectTrigger
                                                    id='entity-subtype'
                                                    className='self-start md:self-center'
                                                    aria-invalid={fieldState.invalid}
                                                    aria-describedby={
                                                        fieldState.invalid
                                                            ? 'subtype-error'
                                                            : undefined
                                                    }
                                                >
                                                    <SelectValue placeholder='Select subtype' />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {resolvedSubtypeOptions.map(
                                                        (option) => (
                                                            <SelectItem
                                                                key={option.value}
                                                                value={option.value}
                                                            >
                                                                {option.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    );
                                }}
                            />

                            <Separator />

                            <Controller
                                name='isPublic'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='horizontal'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='isPublic'
                                                className='text-sm block mb-0.5'
                                            >
                                                Public
                                            </FieldLabel>
                                            <FieldDescription>
                                                Allow public access to this entity
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    id='isPublic-error'
                                                    className='text-sm mt-1'
                                                >
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <Switch
                                            id='isPublic'
                                            name={field.name}
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className='self-center'
                                            aria-invalid={fieldState.invalid}
                                            aria-describedby={
                                                fieldState.invalid
                                                    ? 'isPublic-error'
                                                    : undefined
                                            }
                                        />
                                    </Field>
                                )}
                            />

                            <Separator />

                            <Controller
                                name='owningTeamId'
                                control={control}
                                render={({ field }) => (
                                    <Field orientation='responsive'>
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='entity-owning-team'
                                                className='text-sm block mb-0.5'
                                            >
                                                Team
                                            </FieldLabel>
                                            <FieldDescription>
                                                Team whose leads manage access to this
                                                entity
                                            </FieldDescription>
                                        </FieldContent>
                                        {isAdmin ? (
                                            <Select
                                                items={ownerItems}
                                                value={
                                                    field.value === NO_OWNER
                                                        ? null
                                                        : field.value
                                                }
                                                onValueChange={(value) =>
                                                    field.onChange(value ?? NO_OWNER)
                                                }
                                            >
                                                <SelectTrigger
                                                    id='entity-owning-team'
                                                    className='w-64 shrink-0 self-start md:self-center'
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ownerItems.map((item) => (
                                                        <SelectItem
                                                            key={item.value ?? NO_OWNER}
                                                            value={item.value}
                                                        >
                                                            {item.value === null
                                                                ? 'No team'
                                                                : item.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <p className='w-64 shrink-0 self-start text-sm font-medium md:self-center'>
                                                {entity?.team?.name ?? 'No team'}
                                            </p>
                                        )}
                                    </Field>
                                )}
                            />

                            <Separator />

                            <Controller
                                name='description'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='vertical'
                                        className='w-full'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent>
                                            <FieldLabel
                                                htmlFor='description'
                                                className='text-sm block mb-0.5'
                                            >
                                                Description
                                            </FieldLabel>
                                            <FieldDescription className='text-sm mb-2'>
                                                Brief explanation of this entity
                                            </FieldDescription>
                                        </FieldContent>
                                        <Textarea
                                            {...field}
                                            id='description'
                                            placeholder='Description'
                                            rows={4}
                                            aria-invalid={fieldState.invalid}
                                            aria-describedby={
                                                fieldState.invalid
                                                    ? 'description-error'
                                                    : undefined
                                            }
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                id='description-error'
                                                className='text-sm mt-1'
                                            >
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
                                    </Field>
                                )}
                            />

                            <Separator />

                            <Controller
                                name='aliases'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='responsive'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='entity-aliases'
                                                className='text-sm block mb-0.5'
                                            >
                                                Aliases
                                            </FieldLabel>
                                            <FieldDescription>
                                                Alternate names or references for this
                                                entity
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    id='aliases-error'
                                                    className='text-sm mt-1'
                                                >
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <div
                                            id='entity-aliases'
                                            className='w-64 shrink-0 self-start md:self-center'
                                        >
                                            <MultipleSelector
                                                value={
                                                    (field.value?.map((a) => ({
                                                        value: String(a.value),
                                                        label: a.label,
                                                    })) || []) as Option[]
                                                }
                                                defaultOptions={[]}
                                                placeholder='Select aliases...'
                                                onSearch={async (query) => {
                                                    const results =
                                                        await fetchAliases(query);
                                                    return results.map((a) => ({
                                                        value: String(a.value),
                                                        label: a.label,
                                                    })) as unknown as Option[];
                                                }}
                                                onChange={(options) => {
                                                    field.onChange(
                                                        options.map((o) => ({
                                                            value: Number(o.value),
                                                            label: o.label,
                                                        })),
                                                    );
                                                }}
                                                emptyIndicator={<p>No aliases found</p>}
                                            />
                                        </div>
                                    </Field>
                                )}
                            />

                            {isAdmin && (
                                <>
                                    <Separator />

                                    <Field orientation='responsive'>
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm block'>
                                                Delete
                                            </FieldLabel>
                                            <FieldDescription>
                                                Related notes are kept, but their links
                                                to this entity are removed.
                                            </FieldDescription>
                                        </FieldContent>
                                        <Button
                                            type='button'
                                            variant='destructive'
                                            size='sm'
                                            className='self-start md:self-center'
                                            onClick={() => setIsDeleteOpen(true)}
                                        >
                                            Delete
                                        </Button>
                                    </Field>
                                </>
                            )}
                        </FieldGroup>
                    </div>
                </section>
            </form>
            {isAdmin && (
                <AlertDialog
                    open={isDeleteOpen}
                    onOpenChange={(open) => {
                        setIsDeleteOpen(open);
                        if (!open) setConfirmText('');
                    }}
                >
                    <AlertDialogContent className='sm:max-w-md'>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete {confirmPhrase}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This keeps related notes but removes the links to this
                                entity. It cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <FieldGroup className='gap-4'>
                            <Field>
                                <FieldLabel htmlFor='confirm-delete-entity'>
                                    Type below to confirm
                                </FieldLabel>
                                <Input
                                    id='confirm-delete-entity'
                                    type='text'
                                    placeholder={`Type "${confirmPhrase}" to confirm`}
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
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
                                disabled={
                                    confirmText !== confirmPhrase ||
                                    deleteEntity.isPending
                                }
                                onClick={() => deleteEntity.mutate()}
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}
