import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as Yup from 'yup';
import useCradleNavigate from '../../hooks/useCradleNavigate/useCradleNavigate';
import {
    createEntity,
    editEntity,
    getEntity,
    getEntryClasses,
    getNextEntityName,
} from '../../services/adminService/adminService';
import { advancedQuery } from '../../services/queryService/queryService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';
import Selector from '../Selector/Selector';

const entitySchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    subtype: Yup.string().required('Subtype is required'),
    description: Yup.string().notRequired(),
    aliases: Yup.array().notRequired(),
});

export default function EntityForm({ id = null, isEdit = false, onAdd }) {
    const { navigate, navigateLink } = useCradleNavigate();
    const [subclasses, setSubclasses] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    const fetchAliases = async (q) => {
        const results = await advancedQuery(q, true);

        if (results.status === 200) {
            let a = results.data.results.map((alias) => ({
                value: alias.id,
                label: `${alias.subtype}:${alias.name}`,
            }));
            return a;
        } else {
            displayError(setAlert, navigate)(results);
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
    } = useForm({
        resolver: yupResolver(entitySchema),
        defaultValues: {
            name: '',
            subtype: '',
            description: '',
            is_public: false,
            aliases: [],
        },
    });

    // Populate subclass options.
    useEffect(() => {
        getEntryClasses(true)
            .then((response) => {
                if (response.status === 200) {
                    const filtered = response.data.filter(
                        (entity) => entity.type === 'entity',
                    );
                    setSubclasses(filtered);
                    if (!isEdit && filtered.length > 0) {
                        reset((prev) => ({ ...prev, subtype: filtered[0].subtype }));
                    }
                }
            })
            .catch((err) => displayError(setAlert, navigate)(err));
    }, [isEdit, navigate, reset]);

    // Prepopulate form data if editing.
    useEffect(() => {
        if (isEdit && id) {
            getEntity(id)
                .then((response) => {
                    if (response.status === 200 && response.data) {
                        reset({
                            name: response.data.name,
                            subtype: response.data.subtype,
                            description: response.data.description,
                            is_public: response.data.is_public,
                            aliases: response.data.aliases_detail.map((alias) => ({
                                value: alias.id,
                                label: `${alias.subtype}:${alias.name}`,
                            })),
                        });
                    }
                })
                .catch((err) => displayError(setAlert, navigate)(err));
        } else {
            reset({
                name: '',
                subtype: '',
                description: '',
                is_public: false,
                aliases: [],
            });
        }
        setAlert({ show: false, message: '', color: 'red' });
    }, [isEdit, id, navigate, reset]);

    const onSubmit = async (data) => {
        const payload = {
            type: 'entity',
            name: data.name,
            description: data.description,
            subtype: data.subtype,
            is_public: data.is_public,
            aliases: data.aliases.map((alias) => alias.value),
        };

        try {
            let result = null;
            if (isEdit) {
                result = await editEntity(payload, id);
            } else {
                result = await createEntity(payload);
            }

            if (result.status !== 200) {
                displayError(setAlert, navigate)(result.data);
            } else {
                if (!isEdit) onAdd(result.data);
                setAlert({
                    show: true,
                    message: 'Successfully saved entity!',
                    color: 'green',
                });
            }
        } catch (err) {
            displayError(setAlert, navigate)(err);
        }
    };

    // Auto-fill name when subtype changes in creation mode.
    const watchSubtype = watch('subtype');
    useEffect(() => {
        if (!isEdit && watchSubtype) {
            getNextEntityName(watchSubtype)
                .then((name) => {
                    reset((prev) => ({ ...prev, name }));
                })
                .catch((err) => displayError(setAlert, navigate)(err));
        }
    }, [watchSubtype, isEdit, navigate, reset]);

    return (
        <div className='flex items-center justify-center min-h-screen'>
            <div className='w-full max-w-2xl px-4'>
                <h1 className='text-center text-xl font-bold text-primary mb-4'>
                    {isEdit ? 'Edit Entity' : 'Add New Entity'}
                </h1>
                <div className='p-8 backdrop-blur-sm rounded-md bg-cradle3 bg-opacity-20'>
                    <form onSubmit={handleSubmit(onSubmit)} className='space-y-2'>
                        <FormField
                            type='text'
                            labelText='Name'
                            className='form-input input input-block focus:ring-0'
                            {...register('name')}
                            error={errors.name?.message}
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
                            type='checkbox'
                            labelText='Publicly Available'
                            className='switch switch-ghost-primary'
                            {...register('is_public')}
                            row={true}
                            error={errors.is_public?.message}
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
                                    render={({ field: { onChange, value, ref } }) => (
                                        <Selector
                                            value={value}
                                            onChange={onChange}
                                            fetchOptions={fetchAliases}
                                            isMulti={true}
                                            placeholder='Select aliases...'
                                            inputRef={ref}
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
            </div>
        </div>
    );
}
