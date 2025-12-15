import { useNotif } from '@/contexts/ui/NotificationContext';
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
    SettingsSeparator,
    SettingsTextArea,
    SettingsToggle,
} from '../../../forms';
import Selector from '../../../forms/Selector';
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
    const { notify } = useNotif();

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
                notify({
                    type: 'success',
                    text: 'Entity updated successfully!',
                });
            } else {
                const result = await entriesApi.entitiesCreate({
                    entityRequest: payload,
                });
                notify({
                    type: 'success',
                    text: 'Entity created successfully!',
                });
                if (onAdd) onAdd(result);
            }
        } catch (error) {
            notify({
                type: 'error',
                text: `Failed to ${isEdit ? 'update' : 'create'} entity`,
            });
        }
    };

    // Auto-fill name when subtype changes (for new entities)
    const handleSubtypeChange = async (
        subtype: SubtypeOption | null,
    ) => {
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
                <div className='animate-pulse cradle-text-secondary'>Loading...</div>
            </div>
        );
    }

    return (
        <div className='w-full h-full overflow-auto'>
            {/* Page Header */}
            <div className='flex justify-between items-center w-full cradle-border-b px-4 pb-4 pt-4'>
                <div>
                    <h1 className='text-3xl font-medium cradle-text-primary cradle-mono tracking-tight'>
                        {isEdit ? 'Edit Entity' : 'New Entity'}
                    </h1>
                    <p className='text-xs cradle-text-tertiary uppercase tracking-wider mt-1'>
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
                            <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                                Basic Information
                            </h2>
                            <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
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

                                    <SettingsSeparator />

                                    <SettingsField
                                        label='Subtype'
                                        description='Entity class type'
                                        required
                                        error={errors.subtype}
                                        inputWidth='w-72'
                                    >
                                        <Controller
                                            name='subtype'
                                            control={control}
                                            render={({ field }) => (
                                                <Selector
                                                    {...field}
                                                    staticOptions={subtypeOptions}
                                                    placeholder='Select subtype'
                                                    isDisabled={isEdit}
                                                    onChange={(newValue) => {
                                                        field.onChange(newValue);
                                                        handleSubtypeChange(newValue as SubtypeOption | null);
                                                    }}
                                                />
                                            )}
                                        />
                                    </SettingsField>

                                    <SettingsSeparator />

                                    <SettingsToggle
                                        label='Publicly Available'
                                        description='Allow public access to this entity'
                                        {...register('isPublic')}
                                        watch={watch}
                                        error={errors.isPublic}
                                    />

                                    <SettingsSeparator />

                                    <SettingsTextArea
                                        label='Description'
                                        description='Brief explanation of this entity'
                                        placeholder='Description'
                                        rows={4}
                                        {...register('description')}
                                        error={errors.description}
                                        layout='vertical'
                                    />

                                    <SettingsSeparator />

                                    <div className='py-2'>
                                        <label className='text-sm cradle-text-tertiary block mb-0.5'>
                                            Aliases
                                        </label>
                                        <p className='text-sm cradle-text-muted mb-2'>
                                            Alternate names or references for this entity
                                        </p>
                                        <Controller
                                            name='aliases'
                                            control={control}
                                            render={({ field }) => (
                                                <Selector
                                                    {...field}
                                                    fetchOptions={fetchAliases}
                                                    placeholder='Select aliases...'
                                                    isMulti
                                                />
                                            )}
                                        />
                                        {errors.aliases && (
                                            <p className='text-sm text-red-500 mt-1'>
                                                {errors.aliases.message}
                                            </p>
                                        )}
                                    </div>
                                </SettingsCard>
                            </div>
                        </section>

                        {/* Access Section (only in edit mode with accesses) */}
                        {isEdit && entity && accesses.length > 0 && (
                            <section id='access' className='border-t border-white/5 pt-5 pb-8'>
                                <h2 className='text-lg font-semibold cradle-text-primary tracking-tight'>
                                    Access Control
                                </h2>
                                <p className='text-sm cradle-text-muted mt-0.5 mb-5'>
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
                            <button
                                type='submit'
                                className='cradle-btn cradle-btn-primary px-6 rounded-full'
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Entity'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
