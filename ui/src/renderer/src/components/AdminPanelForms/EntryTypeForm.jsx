import React, { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import * as Yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { HexColorPicker } from 'react-colorful';
import {
    getEntryClass,
    createArtifactClass,
    editArtifactClass,
} from '../../services/adminService/adminService';
import AlertBox from '../AlertBox/AlertBox';
import FormField from '../FormField/FormField';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { GoldenRatioColorGenerator } from '../../utils/colorUtils/colorUtils';

const entryTypeSchema = Yup.object().shape({
    type: Yup.string().required('Class Type is required'),
    subtype: Yup.string().required('Subtype is required'),
    catalystType: Yup.string(),
    description: Yup.string().notRequired(),
    prefix: Yup.string().notRequired(),
    typeFormat: Yup.string().nullable(),
    regex: Yup.string().when('typeFormat', {
        is: (val) => val === 'regex',
        then: () =>
            Yup.string().required('This field is required when regex is selected'),
        otherwise: () => Yup.string().notRequired(),
    }),
    options: Yup.string().when('typeFormat', {
        is: (val) => val === 'options',
        then: () =>
            Yup.string().required('This field is required when options is selected'),
        otherwise: () => Yup.string().notRequired(),
    }),
    generativeRegex: Yup.string().notRequired(),
    color: Yup.string().required('Color is required'),
});

/**
 * EntryTypeForm component
 *
 * @param {Object} props
 * @param {boolean} [props.isEdit=false] - If true, the form will be used for editing.
 */
export default function EntryTypeForm({ isEdit = false }) {
    const navigate = useNavigate();
    let { id } = useParams();
    const colorGenerator = useMemo(() => new GoldenRatioColorGenerator(0.5, 0.65), []);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // When editing an EntryType, the id may be encoded (using '--' instead of '/')
    if (isEdit && id) {
        id = id.replace('--', '/');
    }

    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });

    const {
        register,
        handleSubmit,
        control,
        watch,
        reset,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(entryTypeSchema),
        defaultValues: {
            type: 'artifact',
            subtype: '',
            catalystType: '',
            description: '',
            prefix: '',
            typeFormat: '',
            regex: '',
            options: '',
            generativeRegex: '',
            color: colorGenerator.nextHexColor(),
        },
    });

    const watchType = watch('type');
    const watchTypeFormat = watch('typeFormat');
    const watchColor = watch('color');

    // Generate a new random color
    const generateRandomColor = () => {
        const newColor = colorGenerator.nextHexColor();
        setValue('color', newColor);
    };

    // In edit mode, fetch the entry type details and prepopulate the form.
    useEffect(() => {
        if (isEdit && id) {
            getEntryClass(id)
                .then((response) => {
                    if (response.status === 200) {
                        const entrytype = response.data;
                        // Find the entry type with matching subtype (which is used as the identifier)
                        if (entrytype) {
                            reset({
                                type: entrytype.type,
                                subtype: entrytype.subtype,
                                catalystType: entrytype.catalyst_type,
                                description: entrytype.description,
                                prefix: entrytype.prefix,
                                color: entrytype.color,
                                generativeRegex: entrytype.generative_regex || '',
                                typeFormat:
                                    entrytype.regex && entrytype.regex.length > 0
                                        ? 'regex'
                                        : entrytype.options &&
                                            entrytype.options.length > 0
                                          ? 'options'
                                          : '',
                                regex: entrytype.regex,
                                options: entrytype.options,
                            });
                        }
                    }
                })
                .catch((err) => displayError(setAlert, navigate)(err));
        }
    }, [isEdit, id, reset, navigate]);

    const onSubmit = async (data) => {
        try {
            if (isEdit) {
                await editArtifactClass(
                    { generative_regex: data.generativeRegex, ...data },
                    id,
                );
            } else {
                await createArtifactClass({
                    generative_regex: data.generativeRegex,
                    ...data,
                });
            }
            navigate('/admin', { state: Date.now() });
        } catch (err) {
            displayError(setAlert, navigate)(err);
        }
    };

    return (
        <div className='flex flex-row items-center justify-center h-screen'>
            <div className='bg-cradle3 p-8 bg-opacity-20 backdrop-filter backdrop-blur-lg rounded-xl w-full h-fit md:w-1/2 md:h-fit xl:w-1/3'>
                <div className='flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8'>
                    <div className='sm:mx-auto sm:w-full sm:max-w-sm'>
                        <h1 className='mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-cradle2'>
                            {isEdit ? 'Edit Entry Type' : 'Add New Entry Type'}
                        </h1>
                    </div>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className='mt-10 sm:mx-auto sm:w-full sm:max-w-sm space-y-6'
                    >
                        <div className='w-full'>
                            <label
                                htmlFor='type'
                                className='block text-sm font-medium leading-6'
                            >
                                Class Type
                            </label>
                            <div className='mt-2'>
                                <select
                                    className='form-select select select-ghost-primary select-block focus:ring-0'
                                    {...register('type')}
                                >
                                    <option value='artifact'>Artifact</option>
                                    <option value='entity'>Entity</option>
                                </select>
                                {errors.type && (
                                    <p className='text-red-600 text-sm'>
                                        {errors.type.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <FormField
                            type='text'
                            name='subtype'
                            labelText={isEdit ? 'Name' : 'Subtype'}
                            className='form-input input input-ghost-primary input-block focus:ring-0'
                            {...register('subtype')}
                            error={errors.subtype?.message}
                        />

                        <FormField
                            type='text'
                            name='catalystType'
                            labelText='Catalyst Type'
                            placeholder='type/subtype|model_class|level'
                            className='form-input input input-ghost-primary input-block focus:ring-0'
                            {...register('catalystType')}
                            error={errors.catalystType?.message}
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

                        {watchType === 'entity' && (
                            <FormField
                                type='text'
                                name='prefix'
                                labelText='Prefix'
                                className='form-input input input-ghost-primary input-block focus:ring-0'
                                {...register('prefix')}
                                error={errors.prefix?.message}
                            />
                        )}

                        {watchType === 'artifact' && (
                            <div className='w-full'>
                                <label
                                    htmlFor='typeFormat'
                                    className='block text-sm font-medium leading-6'
                                >
                                    Format
                                </label>
                                <div className='mt-2'>
                                    <select
                                        className='form-select select select-ghost-primary select-block focus:ring-0'
                                        {...register('typeFormat')}
                                    >
                                        <option value=''>Any Format</option>
                                        <option value='options'>Enumerator</option>
                                        <option value='regex'>Regex</option>
                                    </select>
                                    {errors.typeFormat && (
                                        <p className='text-red-600 text-sm'>
                                            {errors.typeFormat.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {watchType === 'artifact' && watchTypeFormat == 'options' && (
                            <div className='w-full'>
                                <label
                                    htmlFor='typeFormatDetails'
                                    className='block text-sm font-medium leading-6'
                                >
                                    Options
                                </label>
                                <div className='mt-2'>
                                    <textarea
                                        placeholder='Please enter the possible values for the type, separated by newlines.'
                                        className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                        {...register('options')}
                                    />
                                    {errors.typeFormatDetails && (
                                        <p className='text-red-600 text-sm'>
                                            Please enter the possible values for the
                                            type, separated by newlines.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {watchType === 'artifact' && watchTypeFormat == 'regex' && (
                            <div className='w-full'>
                                <label
                                    htmlFor='typeFormatDetails'
                                    className='block text-sm font-medium leading-6'
                                >
                                    Regex
                                </label>
                                <div className='mt-2'>
                                    <textarea
                                        placeholder='Please enter the regex for the type in this area.'
                                        className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                        {...register('regex')}
                                    />
                                    {errors.typeFormatDetails && (
                                        <p className='text-red-600 text-sm'>
                                            Please enter the regex for the type in this
                                            area.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {watchType === 'artifact' && watchTypeFormat !== 'options' && (
                            <div className='w-full'>
                                <label
                                    htmlFor='generativeRegex'
                                    className='block text-sm font-medium leading-6'
                                >
                                    Generative Regex
                                </label>
                                <div className='mt-2'>
                                    <textarea
                                        placeholder='Regex used to generate random values for this type.'
                                        className='textarea-ghost-primary textarea-block focus:ring-0 textarea'
                                        {...register('generativeRegex')}
                                    />
                                    {errors.generativeRegex && (
                                        <p className='text-red-600 text-sm'>
                                            {errors.generativeRegex.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className='w-full'>
                            <label
                                htmlFor='color'
                                className='block text-sm font-medium leading-6'
                            >
                                Color
                            </label>
                            <div className='mt-2 flex items-center space-x-2'>
                                <Controller
                                    name='color'
                                    control={control}
                                    render={({ field }) => (
                                        <input
                                            type='text'
                                            className='form-input input input-ghost-primary focus:ring-0'
                                            {...field}
                                        />
                                    )}
                                />
                                <div
                                    className='h-8 w-12 rounded cursor-pointer border border-gray-300'
                                    style={{ backgroundColor: watchColor }}
                                    onClick={() => setShowColorPicker(!showColorPicker)}
                                />
                                <button
                                    type='button'
                                    className='btn btn-sm btn-outline'
                                    onClick={generateRandomColor}
                                >
                                    <svg
                                        xmlns='http://www.w3.org/2000/svg'
                                        className='h-4 w-4'
                                        fill='none'
                                        viewBox='0 0 24 24'
                                        stroke='currentColor'
                                    >
                                        <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                                        />
                                    </svg>
                                </button>
                            </div>
                            {showColorPicker && (
                                <div
                                    className='absolute z-10'
                                    style={{
                                        left: '74%',
                                        bottom: '14%',
                                        marginLeft: '8px',
                                    }}
                                >
                                    <div
                                        className='fixed inset-0'
                                        onClick={() => setShowColorPicker(false)}
                                    />
                                    <Controller
                                        name='color'
                                        control={control}
                                        render={({ field }) => (
                                            <HexColorPicker
                                                color={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>
                            )}
                            {errors.color && (
                                <p className='text-red-600 text-sm'>
                                    {errors.color.message}
                                </p>
                            )}
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
