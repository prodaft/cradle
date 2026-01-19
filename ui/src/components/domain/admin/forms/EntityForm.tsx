import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MultipleSelector, { type Option } from '@/components/ui/multi-select';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import useApi from '@/hooks/api/useApi';
import { queryKeys } from '@/hooks/query';
import { zodResolver } from '@hookform/resolvers/zod';
import { AccessUser, Entity } from '@services/cradle/models';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import OfflineIndicator from '../../../feedback/OfflineIndicator';
import { SelectOption } from '../../../forms';
import AdminPanelPermissionCard from '../cards/AdminPanelPermissionCard';

interface EntityFormProps {
    id?: number | string | null;
    onAdd?: (result: Entity) => void;
}

interface AliasOption extends SelectOption<number> {
    value: number;
    label: string;
}

interface SubtypeOption extends SelectOption<string> {
    value: string;
    label: string;
}

const entitySchema = z.object({
    name: z.string().min(1, { error: 'Name is required' }),
    subtype: z
        .object({
            value: z.string().min(1),
            label: z.string().min(1),
        })
        .nullable()
        .refine((val) => val !== null, {
            error: 'Subtype is required',
        }),
    description: z.string().default(''),
    isPublic: z.boolean().default(false),
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

export default function EntityForm({ id = null, onAdd }: EntityFormProps) {
    const { accessApi, entriesApi, queryApi } = useApi();

    const fetchAliasesMutation = useMutation({
        mutationFn: async (q: string) => {
            const results = await queryApi.queryAdvancedRetrieve({
                query: [q],
                wildcard: true,
            });
            return results.results.map((alias) => ({
                value: alias.id!,
                label: `${alias.subtype}:${alias.name}`,
            }));
        },
        meta: {
            suppressNotification: true,
        },
    });

    const updateEntityMutation = useMutation({
        mutationFn: async (payload: any) => {
            return await entriesApi.entitiesUpdate({
                entityId: Number(id),
                entityRequest: payload,
            });
        },
        meta: {
            successMessage: 'Entity updated successfully!',
            errorMessage: 'Failed to update entity',
        },
        onError: () => {
            toast.error('Failed to update entity');
        },
    });

    const [accesses, setAccessUsers] = useState<AccessUser[]>([]);
    const [entity, setEntity] = useState<Entity | null>(null);
    const [subtypeOptions, setSubtypeOptions] = useState<SubtypeOption[]>([]);

    const {
        register,
        handleSubmit: handleFormSubmit,
        reset,
        watch,
        control,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<EntityFormData>({
        resolver: zodResolver(entitySchema) as any,
        defaultValues: {
            name: '',
            subtype: null as any,
            description: '',
            isPublic: false,
            aliases: [],
        },
    });

    // Fetch aliases for async select
    const fetchAliases = async (q: string): Promise<AliasOption[]> => {
        try {
            return await fetchAliasesMutation.mutateAsync(q);
        } catch (error) {
            return [];
        }
    };

    // Query for entry classes
    const { data: entryClassesData } = useQuery({
        queryKey: queryKeys.entryTypes.lists(),
        queryFn: () => entriesApi.entryClassesList({ showCount: true }),
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    // Update subtype options when entry classes load
    useEffect(() => {
        if (entryClassesData) {
            const entityClasses = entryClassesData.filter(
                (entity: any) => entity.type === 'entity',
            );
            const options = entityClasses.map((c: any) => ({
                value: c.subtype,
                label: c.subtype,
            }));
            setSubtypeOptions(options);
        }
    }, [entryClassesData]);

    // Query for entity data when editing
    const {
        data: entityData,
        isPending,
        isPaused,
    } = useQuery<Entity>({
        queryKey: queryKeys.entities.detail(String(id)),
        queryFn: async () => {
            const result = await entriesApi.entitiesRetrieve({ entityId: Number(id) });
            return result as Entity;
        },
        enabled: !!id,
        meta: {
            showErrorToast: true,
            errorMessage: 'Failed to fetch entity',
            suppressNotification: true,
        } as any,
    });

    // Query for access data when editing
    const { data: accessData } = useQuery({
        queryKey: ['entities', 'access', String(id)],
        queryFn: () => accessApi.accessEntityList({ entityId: Number(id) }),
        enabled: !!id,
        meta: {
            showErrorToast: false,
            suppressNotification: true,
        },
    });

    // Update form when entity data loads
    useEffect(() => {
        if (entityData) {
            reset({
                name: entityData.name,
                subtype: {
                    value: entityData.subtype,
                    label: entityData.subtype,
                },
                description: entityData.description || '',
                isPublic: entityData.isPublic || false,
                aliases:
                    entityData.aliasesDetail
                        ?.filter((alias) => alias.id !== undefined)
                        .map((alias) => ({
                            value: alias.id!,
                            label: `${alias.subtype}:${alias.name}`,
                        })) ?? [],
            });
            setEntity(entityData);
        }
    }, [entityData, reset]);

    // Update access users when access data loads
    useEffect(() => {
        if (accessData) {
            setAccessUsers(accessData);
        }
    }, [accessData]);

    // Handle form submission
    const onSubmit = async (data: EntityFormData) => {
        const payload = {
            type: 'entity',
            name: data.name,
            description: data.description,
            subtype: data.subtype?.value || '',
            is_public: data.isPublic,
            aliases: data.aliases.map((alias) => alias.value),
        };
        updateEntityMutation.mutate(payload);
    };

    if (isPending && !isPaused) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='animate-pulse text-foreground'>Loading...</div>
            </div>
        );
    }

    if (isPaused) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='w-full max-w-md p-4'>
                    <OfflineIndicator />
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleFormSubmit(onSubmit as any)}>
            {/* Basic Section */}
            <section id='basic'>
                <div className='space-y-4'>
                    <Card className='rounded-lg border-border bg-muted/5 space-y-0'>
                        <CardContent className='px-4 py-1'>
                            <Controller
                                name='name'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='horizontal'
                                        className='py-2'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='name'
                                                className='text-sm text-muted-foreground block mb-0.5'
                                            >
                                                Name
                                                <span className='text-destructive ml-1'>
                                                    *
                                                </span>
                                            </FieldLabel>
                                            <FieldDescription className='text-sm'>
                                                Unique identifier for this entity
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError className='text-sm mt-1'>
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <div className='w-auto'>
                                            <Input
                                                {...field}
                                                id='name'
                                                disabled={true}
                                                aria-invalid={fieldState.invalid}
                                                aria-describedby={
                                                    fieldState.invalid
                                                        ? 'name-error'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                    </Field>
                                )}
                            />

                            <Separator />

                            <Controller
                                name='subtype'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='horizontal'
                                        className='py-2'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel className='text-sm text-muted-foreground block mb-0.5'>
                                                Subtype
                                                <span className='text-destructive ml-1'>
                                                    *
                                                </span>
                                            </FieldLabel>
                                            <FieldDescription className='text-sm'>
                                                Entity class type
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError className='text-sm mt-1'>
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <div className='w-72'>
                                            <Select
                                                value={field.value?.value || ''}
                                                onValueChange={(value) => {
                                                    const option = subtypeOptions.find(
                                                        (opt) => opt.value === value,
                                                    );
                                                    field.onChange(
                                                        option
                                                            ? {
                                                                  value: option.value,
                                                                  label: option.label,
                                                              }
                                                            : null,
                                                    );
                                                }}
                                            >
                                                <SelectTrigger
                                                    className='w-72'
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
                                                    {subtypeOptions.map((option) => (
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
                                    </Field>
                                )}
                            />

                            <Separator />

                            <Controller
                                name='isPublic'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='horizontal'
                                        className='py-2'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent className='flex-1'>
                                            <FieldLabel
                                                htmlFor='isPublic'
                                                className='text-sm text-muted-foreground block mb-0.5'
                                            >
                                                Publicly Available
                                            </FieldLabel>
                                            <FieldDescription className='text-sm'>
                                                Allow public access to this entity
                                            </FieldDescription>
                                            {fieldState.invalid && (
                                                <FieldError className='text-sm mt-1'>
                                                    {fieldState.error?.message}
                                                </FieldError>
                                            )}
                                        </FieldContent>
                                        <Switch
                                            id='isPublic'
                                            name={field.name}
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
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
                                name='description'
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        orientation='vertical'
                                        className='py-2 w-full'
                                        data-invalid={fieldState.invalid}
                                    >
                                        <FieldContent>
                                            <FieldLabel
                                                htmlFor='description'
                                                className='text-sm text-muted-foreground block mb-0.5'
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
                                            <FieldError className='text-sm mt-1'>
                                                {fieldState.error?.message}
                                            </FieldError>
                                        )}
                                    </Field>
                                )}
                            />

                            <Separator />

                            <div className='py-2'>
                                <Label className='text-sm text-muted-foreground block mb-0.5'>
                                    Aliases
                                </Label>
                                <p className='text-sm text-muted-foreground mb-2'>
                                    Alternate names or references for this entity
                                </p>
                                <Controller
                                    name='aliases'
                                    control={control}
                                    render={({ field }) => (
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
                                            emptyIndicator={
                                                <p className='text-center text-sm'>
                                                    No aliases found
                                                </p>
                                            }
                                        />
                                    )}
                                />
                                {errors.aliases && (
                                    <p className='text-sm text-destructive mt-1'>
                                        {errors.aliases.message}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Access Section (only with accesses) */}
            {entity && accesses.length > 0 && (
                <section id='access' className='border-t border-white/5 pt-5 pb-8'>
                    <div className='space-y-2'>
                        {accesses.map((access) => {
                            const user = access.user;
                            return (
                                <AdminPanelPermissionCard
                                    key={user.id}
                                    userId={user.id!}
                                    text={user.username}
                                    entityId={entity.id!}
                                    accessLevel={access.accessType}
                                    searchKey={user.username}
                                />
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Save Button */}
            <div className='pt-2 flex justify-end'>
                <Button type='submit' variant='default' disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
}
