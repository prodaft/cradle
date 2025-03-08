import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import {
    getEntryClasses,
    getEntity,
    createEntity,
    editEntity,
    getNextEntityName,
} from '../../services/adminService/adminService';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';
import { displayError } from '../../utils/responseUtils/responseUtils';

const entitySchema = Yup.object().shape({
    name: Yup.string().required('Name is required'),
    subtype: Yup.string().required('Subtype is required'),
    description: Yup.string().notRequired(),
});

/**
 * EntityForm component
 *
 * @param {Object} props
 * @param {boolean} [props.isEdit=false] - If true, the form will be used for editing.
 */
export default function EntityForm({ isEdit = false }) {
    const navigate = useNavigate();
    const { id } = useParams(); // id will be available when editing
    const [subclasses, setSubclasses] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(entitySchema),
        defaultValues: {
            name: '',
            subtype: '',
            description: '',
            is_public: false,
        },
    });

    // Always populate subclass options
    useEffect(() => {
        getEntryClasses(true)
            .then((response) => {
                if (response.status === 200) {
                    const entities = response.data;
                    const filtered = entities.filter(
                        (entity) => entity.type === 'entity',
                    );
                    setSubclasses(filtered);
                    // In creation mode, set the default subtype if available.
                    if (!isEdit && filtered.length > 0) {
                        reset((prev) => ({ ...prev, subtype: filtered[0].subtype }));
                    }
                }
            })
            .catch((err) => displayError(setAlert, navigate)(err));
    }, [isEdit, navigate, reset]);

    // If editing, fetch the entity details and prepopulate the form.
    useEffect(() => {
        if (isEdit && id) {
            getEntity(id)
                .then((response) => {
                    if (response.status === 200) {
                        const entity = response.data;
                        if (entity) {
                            reset({
                                name: entity.name,
                                subtype: entity.subtype,
                                description: entity.description,
                                is_public: entity.is_public,
                            });
                        }
                    }
                })
                .catch((err) => displayError(setAlert, navigate)(err));
        }
    }, [isEdit, id, navigate, reset]);

    const onSubmit = async (data) => {
        const payload = {
            type: 'entity',
            name: data.name,
            description: data.description,
            subtype: data.subtype,
            is_public: data.is_public,
        };

        try {
            if (isEdit) {
                await editEntity(payload, id);
            } else {
                await createEntity(payload);
            }
            navigate('/admin', { state: Date.now() });
        } catch (err) {
            displayError(setAlert, navigate)(err);
        }
    };

    const watchSubtype = watch('subtype');
    useEffect(() => {
        if (!isEdit && watchSubtype) {
            getNextEntityName(watchSubtype)
                .then((name) => {
                    if (name) reset((prev) => ({ ...prev, name }));
                })
                .catch((err) => displayError(setAlert, navigate)(err));
        }
    }, [watchSubtype]);

    return (
        <div className='flex flex-row items-center justify-center h-screen'>
            <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 md:h-fit xl:w-1/3'>
                <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8'>
                    <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                        <h1 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-cradle2'>
                            {isEdit ? 'Edit Entity' : 'Add New Entity'}
                        </h1>
                    </div>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm space-y-6'
                    >
                        <FormField
                            type='text'
                            labelText='Name'
                            className='form-input input input-ghost-primary input-block focus:ring-0'
                            {...register('name')}
                            error={errors.name?.message}
                            disabled={isEdit} // Disable name in edit mode
                        />

                        <div className='w-full'>
                            <label
                                htmlFor='subtype'
                                className='block text-sm font-medium leading-6'
                            >
                                Subtype
                            </label>
                            <div className='mt-2'>
                                <select
                                    className='form-select select select-ghost-primary select-block focus:ring-0'
                                    {...register('subtype')}
                                    disabled={isEdit} // Disable subtype in edit mode
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
                                className='block text-sm font-medium leading-6'
                            >
                                Description
                            </label>
                            <div className='mt-2'>
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

                        <AlertBox alert={alert} />

                        <div className='flex gap-2'>
                            <button
                                type='button'
                                className='btn btn-ghost btn-block'
                                onClick={() => navigate('/admin')}
                            >
                                Cancel
                            </button>
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
