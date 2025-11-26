import useApi from '@/hooks/api/useApi';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { displayError } from '@/utils/api';
import { yupResolver } from '@hookform/resolvers/yup';
import { AccessUser, Entity, EntryClass } from '@services/cradle/models';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as Yup from 'yup';
import AlertBox from '../../../base/Alert/AlertBox';
import FormField from '../../../forms/FormField';
import Selector from '../../../forms/Selector';
import { Tab, Tabs } from '../../../layout/Tabs/Tabs';
import { TabClasses } from '../../../layout/Tabs/types';
import AdminPanelPermissionCard from '../cards/AdminPanelPermissionCard';

interface Alert {
    show: boolean;
    message: string;
    color: string;
}

interface EntityFormProps {
    id?: number | string | null;
    isEdit?: boolean;
    onAdd?: (result: Entity) => void;
}

interface AliasOption {
    value: number;
    label: string;
}

interface FormData {
    name: string;
    subtype: string;
    description: string;
    isPublic: boolean;
    aliases: AliasOption[];
}

const entitySchema: Yup.ObjectSchema<FormData> = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    subtype: Yup.string().required('Subtype is required'),
    description: Yup.string().notRequired(),
    isPublic: Yup.boolean().notRequired(),
    aliases: Yup.array().notRequired(),
}) as Yup.ObjectSchema<FormData>;

export default function EntityForm({ id = null, isEdit = false, onAdd }: EntityFormProps) {
    const { navigate, navigateLink } = useCradleNavigate();
    const { accessApi, entriesApi, queryApi } = useApi();
    const [accesses, setAccessUsers] = useState<AccessUser[]>([]);
    const [entity, setEntity] = useState<Entity | null>(null);
    const [subclasses, setSubclasses] = useState<EntryClass[]>([]);
    const [alert, setAlert] = useState<Alert>({ show: false, message: '', color: 'red' });

    const fetchAliases = async (q: string | string[]): Promise<AliasOption[]> => {
        try {
            const results = await queryApi.queryAdvancedRetrieve({
                query: Array.isArray(q) ? q : [q],
                wildcard: true,
            });

            const a = results.results.map((alias) => ({
                value: alias.id!,
                label: `${alias.subtype}:${alias.name}`,
            }));
            return a;
        } catch (error) {
            displayError(setAlert, navigate)(error);
            return [];
        }
    };

    const {
        register,
        handleSubmit,
        watch,
        reset,
        control,
        formState: { errors },
    } = useForm<FormData>({
        resolver: yupResolver(entitySchema),
        defaultValues: {
            name: '',
            subtype: '',
            description: '',
            isPublic: false,
            aliases: [],
        },
    });

    // Populate subclass options.
    useEffect(() => {
        (async () => {

            try {
                const entryClasses = await entriesApi.entryClassesList({ showCount: true });
                const subclasses = entryClasses.filter(
                    (entity) => entity.type === 'entity',
                );
                setSubclasses(subclasses);

                if (!isEdit && subclasses.length > 0) {
                    reset((prev) => ({ ...prev, subtype: subclasses[0].subtype }));
                }
            } catch (err) {
                displayError(setAlert, navigate)(err);
            }
        })();
    }, [isEdit, navigate, reset, entriesApi]);

    // Prepopulate form data if editing.
    useEffect(() => {
        (async () => {
            if (isEdit && id) {
                try {
                    const [entity, accesses] = await Promise.all([
                        entriesApi.entitiesRetrieve({ entityId: Number(id) }),
                        accessApi.accessEntityList({ entityId: Number(id) }),
                    ]);
                    reset({
                        name: entity.name,
                        subtype: entity.subtype,
                        description: entity.description || '',
                        isPublic: entity.isPublic || false,
                        aliases: entity.aliasesDetail?.map((alias) => ({
                            value: alias.id,
                            label: `${alias.subtype}:${alias.name}`,
                        })) ?? [],
                    });

                    setAccessUsers(accesses);
                    setEntity(entity);
                } catch (err) {
                    console.log(err);
                    displayError(setAlert, navigate)(err);
                }
            } else {
                reset({
                    name: '',
                    subtype: '',
                    description: '',
                    isPublic: false,
                    aliases: [],
                });
            }
            setAlert({ show: false, message: '', color: 'red' });
        })();
    }, [isEdit, id, navigate, reset, entriesApi, accessApi]);

    const onSubmit = async (data: FormData) => {
        const payload = {
            type: 'entity',
            name: data.name,
            description: data.description,
            subtype: data.subtype,
            is_public: data.isPublic,
            aliases: data.aliases.map((alias) => alias.value),
        };
        console.log('Payload:', payload);

        try {
            if (isEdit) {
                await entriesApi.entitiesUpdate({
                    entityId: Number(id),
                    entityRequest: payload,
                });
            } else {
                let result = await entriesApi.entitiesCreate({
                    entityRequest: payload,
                });
                if (onAdd) onAdd(result);
            }

            setAlert({
                show: true,
                message: 'Successfully saved entity!',
                color: 'green',
            });
        } catch (err) {
            displayError(setAlert, navigate)(err);
        }
    };

    // Auto-fill name when subtype changes in creation mode.
    const watchSubtype = watch('subtype');
    useEffect(() => {
        if (!isEdit && watchSubtype) {
            entriesApi
                .entriesNextNameRetrieve({ classSubtype: watchSubtype })
                .then((response) => {
                    reset((prev) => ({ ...prev, name: response.name || '' }));
                })
                .catch((err) => displayError(setAlert, navigate)(err));
        }
    }, [watchSubtype, isEdit, entriesApi, navigate, reset]);

    return (
        <div className='flex items-center justify-center min-h-screen'>
            <div className='w-full max-w-2xl px-4'>
                <h1 className='text-center text-xl font-bold text-primary mb-4'>
                    {isEdit ? 'Edit Entity' : 'Add New Entity'}
                </h1>

                <Tabs
                    tabClass={TabClasses.PILL}
                >
                    <Tab title='Settings' classes='space-y-4'>
                        <div className='p-8 backdrop-blur-sm rounded-md bg-cradle3 bg-opacity-20'>
                            <form onSubmit={handleSubmit(onSubmit)} className='space-y-2'>
                                <FormField
                                    type='text'
                                    label='Name'
                                    className='form-input input input-block focus:ring-0'
                                    {...register('name')}
                                    error={errors.name}
                                    disabled={isEdit}
                                />
                                <div className='w-full'>
                                    <label
                                        htmlFor='subtype'
                                        className='block text-sm font-medium'
                                    >
                                        Subtype
                                    </label>
                                    <div className='mt-1'>
                                        <select
                                            className='form-select select select-ghost-primary select-block focus:ring-0'
                                            {...register('subtype')}
                                            disabled={isEdit}
                                        >
                                            {subclasses.map((subclass, index) => (
                                                <option key={index} value={subclass.subtype}>
                                                    {subclass.subtype}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.subtype && (
                                            <p className='text-red-600 text-sm'>
                                                {errors.subtype.message}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <FormField
                                    type='switch'
                                    label='Publicly Available'
                                    className='switch-ghost-primary'
                                    {...register('isPublic')}
                                    row={true}
                                    error={errors.isPublic}
                                />
                                <div className='w-full'>
                                    <label
                                        htmlFor='description'
                                        className='block text-sm font-medium'
                                    >
                                        Description
                                    </label>
                                    <div className='mt-1'>
                                        <textarea
                                            placeholder='Description'
                                            className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                            {...register('description')}
                                        />
                                        {errors.description && (
                                            <p className='text-red-600 text-sm'>
                                                {errors.description.message}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {/* Aliases Field */}
                                <div className='w-full'>
                                    <label className='block text-sm font-medium'>Aliases</label>
                                    <div className='mt-1'>
                                        <Controller
                                            name='aliases'
                                            control={control}
                                            render={({ field: { onChange, value } }) => (
                                                <Selector
                                                    value={value}
                                                    onChange={onChange}
                                                    fetchOptions={fetchAliases}
                                                    isMulti={true}
                                                    placeholder='Select aliases...'
                                                />
                                            )}
                                        />
                                        {errors.aliases && (
                                            <p className='text-red-600 text-sm'>
                                                {errors.aliases.message}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <AlertBox alert={alert} />
                                <div className='flex gap-2'>
                                    <button type='submit' className='btn btn-primary btn-block'>
                                        {isEdit ? 'Edit' : 'Add'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </Tab>

                    {isEdit && entity && accesses.length > 0 &&
                        <Tab title='Access' classes='space-y-4'>
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
                                )
                            })}
                        </Tab>
                    }
                </Tabs>
            </div>
        </div>
    );
}
