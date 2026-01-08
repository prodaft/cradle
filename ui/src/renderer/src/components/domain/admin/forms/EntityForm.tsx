import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import useApi from '@/hooks/api/useApi';
import { yupResolver } from '@hookform/resolvers/yup';
import { AccessUser, Entity } from '@services/cradle/models';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as Yup from 'yup';
import {
    SelectOption,
    SettingsCard,
    SettingsField,
    SettingsTextArea,
} from '../../../forms';
import { Separator } from '@/components/ui/separator';
import ShadcnSelect from '../../../forms/ShadcnSelect';
import AdminPanelPermissionCard from '../cards/AdminPanelPermissionCard';

interface EntityFormProps {
    id?: number | string | null;
    isEdit?: boolean;
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

interface FormData {
    name: string;
    subtype: SubtypeOption | null;
    description: string;
    isPublic: boolean;
    aliases: AliasOption[];
}

const entitySchema: Yup.ObjectSchema<FormData> = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    subtype: Yup.object()
        .shape({
            value: Yup.string().required(),
            label: Yup.string().required(),
        })
        .nullable()
        .required('Subtype is required'),
    description: Yup.string().default(''),
    isPublic: Yup.boolean().default(false),
    aliases: Yup.array()
        .of(
            Yup.object().shape({
                value: Yup.number().required(),
                label: Yup.string().required(),
            }),
        )
        .default([]),
}) as Yup.ObjectSchema<FormData>;

export default function EntityForm({
    id = null,
    isEdit = false,
    onAdd,
}: EntityFormProps) {
    const { accessApi, entriesApi, queryApi } = useApi();

    const [accesses, setAccessUsers] = useState<AccessUser[]>([]);
    const [entity, setEntity] = useState<Entity | null>(null);
    const [subtypeOptions, setSubtypeOptions] = useState<SubtypeOption[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const {
        register,
        handleSubmit: handleFormSubmit,
        reset,
        watch,
        control,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: yupResolver(entitySchema),
        defaultValues: {
            name: '',
            subtype: null,
            description: '',
            isPublic: false,
            aliases: [],
        },
    });

    // Fetch aliases for async select
    const fetchAliases = async (q: string): Promise<AliasOption[]> => {
        try {
            const results = await queryApi.queryAdvancedRetrieve({
                query: [q],
                wildcard: true,
            });

            return results.results.map((alias) => ({
                value: alias.id!,
                label: `${alias.subtype}:${alias.name}`,
            }));
        } catch (error) {
            console.error('Failed to fetch aliases:', error);
            return [];
        }
    };

    // Fetch subtype options on mount
    useEffect(() => {
        (async () => {
            try {
                const entryClasses = await entriesApi.entryClassesList({
                    showCount: true,
                });
                const entityClasses = entryClasses.filter(
                    (entity) => entity.type === 'entity',
                );
                const options = entityClasses.map((c) => ({
                    value: c.subtype,
                    label: c.subtype,
                }));
                setSubtypeOptions(options);

                // Set default subtype for new entities
                if (!isEdit && options.length > 0) {
                    reset((prev) => ({ ...prev, subtype: options[0] }));
                }

                handleSubtypeChange(options[0]);
            } catch (err) {
                console.error('Failed to fetch subtypes:', err);
            }
        })();
    }, [isEdit, entriesApi, reset]);

    // Fetch entity data when editing
    useEffect(() => {
        (async () => {
            if (isEdit && id) {
                setIsLoading(true);
                try {
                    const [entityData, accessData] = await Promise.all([
                        entriesApi.entitiesRetrieve({ entityId: Number(id) }),
                        accessApi.accessEntityList({ entityId: Number(id) }),
                    ]);

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

                    setAccessUsers(accessData);
                    setEntity(entityData);
                } catch (err) {
                    console.error('Failed to fetch entity:', err);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        })();
    }, [isEdit, id, entriesApi, accessApi, reset]);

    // Handle form submission
    const onSubmit = async (data: FormData) => {
        try {
            const payload = {
                type: 'entity',
                name: data.name,
                description: data.description,
                subtype: data.subtype?.value || '',
                is_public: data.isPublic,
                aliases: data.aliases.map((alias) => alias.value),
            };

            if (isEdit) {
                await entriesApi.entitiesUpdate({
                    entityId: Number(id),
                    entityRequest: payload,
                });
                toast.success('Entity updated successfully!');
            } else {
                const result = await entriesApi.entitiesCreate({
                    entityRequest: payload,
                });
                toast.success('Entity created successfully!');
                if (onAdd) onAdd(result);
            }
        } catch (error) {
            toast.error(`Failed to ${isEdit ? 'update' : 'create'} entity`);
        }
    };

    // Auto-fill name when subtype changes (for new entities)
    const handleSubtypeChange = async (subtype: SubtypeOption | null) => {
        if (!isEdit && subtype) {
            try {
                const response = await entriesApi.entriesNextNameRetrieve({
                    classSubtype: subtype.value,
                });
                const currentValues = getValues();
                reset({ ...currentValues, subtype, name: response.name || '' });
            } catch (err) {
                console.error('Failed to fetch next name:', err);
            }
        }
    };

    if (isLoading) {
        return (
            <div className='flex items-center justify-center min-h-screen'>
                <div className='animate-pulse text-foreground'>Loading...</div>
            </div>
        );
    }

    return (
        <div className='w-full h-full'>
            {/* Header Section */}
            <div className='flex flex-wrap items-end justify-between gap-2 px-4 pt-4'>
                <div>
                    <h2 className='text-2xl font-bold tracking-tight'>
                        {isEdit ? 'Edit Entity' : 'New Entity'}
                    </h2>
                    <p className='text-muted-foreground'>
                        {isEdit ? 'Modify entity details' : 'Create new entity'}
                    </p>
                </div>
            </div>

            {/* Content Area */}
            <div className='p-5'>
                <div className='w-full'>
                    <form onSubmit={handleFormSubmit(onSubmit)}>
                        {/* Basic Section */}
                        <section id='basic' className='pb-8'>
                            <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                                Basic Information
                            </h2>
                            <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                Core entity properties
                            </p>

                            <div className='space-y-4'>
                                <SettingsCard>
                                    <SettingsField
                                        label='Name'
                                        description='Unique identifier for this entity'
                                        {...register('name')}
                                        error={errors.name}
                                        disabled={isEdit}
                                        required
                                    />

                                    <Separator />

                                    <SettingsField
                                        label='Subtype'
                                        description='Entity class type'
                                        required
                                        error={errors.subtype?.message?.toString()}
                                        inputWidth='w-72'
                                    >
                                        <Controller
                                            name='subtype'
                                            control={control}
                                            render={({ field }) => (
                                                <ShadcnSelect
                                                    staticOptions={subtypeOptions}
                                                    value={field.value}
                                                    placeholder='Select subtype'
                                                    disabled={isEdit}
                                                    onChange={(newValue) => {
                                                        field.onChange(newValue);
                                                        handleSubtypeChange(
                                                            newValue as SubtypeOption | null,
                                                        );
                                                    }}
                                                />
                                            )}
                                        />
                                    </SettingsField>

                                    <Separator />

                                    <div className='py-2'>
                                        <div className='flex items-center justify-between gap-4'>
                                            <div className='flex-1'>
                                                <Label htmlFor='isPublic' className='text-sm text-muted-foreground block mb-0.5'>
                                                    Publicly Available
                                                </Label>
                                                <p className='text-sm text-muted-foreground'>Allow public access to this entity</p>
                                                {errors.isPublic && (
                                                    <p className='text-sm text-destructive mt-1'>{errors.isPublic.message}</p>
                                                )}
                                            </div>
                                            <Controller
                                                name='isPublic'
                                                control={control}
                                                render={({ field }) => (
                                                    <Switch
                                                        id='isPublic'
                                                        name={field.name}
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    <SettingsTextArea
                                        label='Description'
                                        description='Brief explanation of this entity'
                                        placeholder='Description'
                                        rows={4}
                                        {...register('description')}
                                        error={errors.description}
                                        layout='vertical'
                                    />

                                    <Separator />

                                    <div className='py-2'>
                                        <label className='text-sm text-muted-foreground block mb-0.5'>
                                            Aliases
                                        </label>
                                        <p className='text-sm text-muted-foreground mb-2'>
                                            Alternate names or references for this
                                            entity
                                        </p>
                                        <Controller
                                            name='aliases'
                                            control={control}
                                            render={({ field }) => (
                                                <ShadcnSelect
                                                    fetchOptions={fetchAliases}
                                                    values={field.value || []}
                                                    placeholder='Select aliases...'
                                                    isMulti
                                                    onMultiChange={(newValues) => {
                                                        field.onChange(newValues);
                                                    }}
                                                />
                                            )}
                                        />
                                        {errors.aliases && (
                                            <p className='text-sm text-destructive mt-1'>
                                                {errors.aliases.message}
                                            </p>
                                        )}
                                    </div>
                                </SettingsCard>
                            </div>
                        </section>

                        {/* Access Section (only in edit mode with accesses) */}
                        {isEdit && entity && accesses.length > 0 && (
                            <section
                                id='access'
                                className='border-t border-white/5 pt-5 pb-8'
                            >
                                <h2 className='text-lg font-semibold text-foreground tracking-tight'>
                                    Access Control
                                </h2>
                                <p className='text-sm text-muted-foreground mt-0.5 mb-5'>
                                    User permissions for this entity
                                </p>

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
                        <div className='border-t border-white/5 pt-5 flex justify-end'>
                            <Button
                                type='submit'
                                variant='default'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Entity'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
